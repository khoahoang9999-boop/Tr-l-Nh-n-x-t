chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fillComments") {
        fillCommentsAsync(request.config).then(result => {
             sendResponse({success: true, count: result});
        }).catch(err => {
             console.error(err);
             sendResponse({success: false, error: err.message});
        });
        return true; 
    }
});

async function fillCommentsAsync(config) {
    const { platform, role, subject, capHoc = 'THCS', khoiLop = '6', method } = config;

    const storageResult = await chrome.storage.local.get(['commentsData', 'geminiApiKey', 'geminiModelId', 'aiPromptTemplate']);
    const db = storageResult.commentsData;

    if (method === 'template' && !db) {
        throw new Error("Chưa khởi tạo dữ liệu Mẫu! Vui lòng mở Cấu hình Lời phê trước.");
    }
    const DEFAULT_KEYS = "AIzaSyBZ7HYd1I4jfOZQXjFuL4w1eYC_a-7DhZE, AIzaSyC8yFEfZdR9BwF_e5NbCUYFgW2RZB8wBuI, AIzaSyAz7tBBhmWQ8nzRDPLU9lK6IkOV0AZIKDg";
    let resolvedApiKey = storageResult.geminiApiKey;
    if (!resolvedApiKey || resolvedApiKey.trim() === '') resolvedApiKey = DEFAULT_KEYS;

    if (method === 'ai' && (!resolvedApiKey || resolvedApiKey.trim() === '')) {
        throw new Error("Chưa cấu hình API Key cho AI!");
    }

    const formatComment = (text, roleConfig) => {
        let formatted = text.trim();
        if (roleConfig === 'GVBM') {
            if (!formatted.toLowerCase().startsWith("em ")) {
                formatted = "Em " + formatted.charAt(0).toLowerCase() + formatted.slice(1);
            }
        } else if (roleConfig === 'HOC_BA') {
            formatted = formatted.replace(/\\n/g, '\n');
            const lines = formatted.split('\n').filter(l => l.trim() !== '');
            if (lines.length > 0 && !lines[0].startsWith("-")) {
                formatted = lines.map(l => `- ${l.trim()}`).join('\n');
            }
        }
        return formatted;
    };

    const getRandom = (arr) => (arr && arr.length > 0) ? arr[Math.floor(Math.random() * arr.length)] : "";

    let rows = [];
    switch(platform) {
        case 'csdl':
            rows = Array.from(document.querySelectorAll('tr.rgRow, tr.rgAltRow'));
            if (rows.length === 0) {
                // Heuristic: rows in a table body that appear to have data
                rows = Array.from(document.querySelectorAll('tbody tr')).filter(tr => tr.querySelectorAll('td').length >= 3);
            }
            break;
        case 'vnedu':
            rows = Array.from(document.querySelectorAll('.x-grid-row:not(.x-grid-row-summary), .x-grid3-row, tr.x-grid-row'));
            if (rows.length === 0) {
                rows = Array.from(document.querySelectorAll('tbody tr')).filter(tr => tr.querySelectorAll('td').length >= 3);
            }
            break;
        default:
            rows = Array.from(document.querySelectorAll('tbody tr')).filter(tr => tr.querySelectorAll('td').length >= 3);
    }

    if (rows.length === 0) {
        rows = Array.from(document.querySelectorAll('tr'));
    }

    if (rows.length === 0) {
        return 0; // Return 0 instead of throwing so we don't pollute responses in a multi-frame setup
    }

    let fillCount = 0;
    let lastRowError = null;
    
    // Validate pool if using template
    const getCommentsPool = () => {
        if (!db || !db[capHoc] || !db[capHoc][khoiLop]) return null;
        if (role === 'GVBM') {
            return db[capHoc][khoiLop].GVBM[subject] || null;
        }
        return db[capHoc][khoiLop].HOC_BA;
    };
    
    const commentsPool = method === 'template' ? getCommentsPool() : null;
    
    if (method === 'template') {
        if (!commentsPool) {
            throw new Error(`Môn học/Hạng mục này chưa có dữ liệu lời phê. Vui lòng cấu hình trước.`);
        }
        let totalCount = 0;
        if (role === 'GVBM') {
            Object.values(commentsPool).forEach(arr => {
                if (Array.isArray(arr)) totalCount += arr.length;
            });
        } else {
            if (Array.isArray(commentsPool)) totalCount += commentsPool.length;
        }
        if (totalCount === 0) {
            throw new Error(`Chưa có câu lời phê nào cho lựa chọn này. Vui lòng thêm mẫu.`);
        }
    }

    // Process rows sequentially to avoid API rate limiting issues if AI is used
    for (const row of Array.from(rows)) {
        try {
            // Must have enough cells to be a valid data row (avoid headers/navbars)
            const cells = row.querySelectorAll('td, div.x-grid-cell, div.x-grid3-cell');
            if (cells.length > 0 && cells.length < 3) continue;

            let averageScore = null;
            let tenHS = "Em";

            // Attempt to find student name (usually in the second or third column)
            const textCells = Array.from(row.querySelectorAll('td, span, div.x-grid-cell-inner')).map(el => el.innerText.trim());
            
            // Skip rows that look like purely headers (e.g. containing 'STT', 'Họ tên')
            const isHeader = textCells.some(t => t.toLowerCase() === 'họ tên' || t.toLowerCase() === 'stt');
            if (isHeader) continue;

            // Skip filter bars
            const isFilterBar = textCells.some(t => {
                const lower = t.toLowerCase();
                return lower.includes('khối:') || lower === 'khối' || 
                       lower.includes('lớp:') || lower === 'lớp' || 
                       lower.includes('môn học:') || lower === 'môn học' ||
                       lower.includes('học kỳ:') || lower === 'học kỳ';
            });
            if (isFilterBar) continue;

            const possibleNames = textCells.filter(t => t.length >= 5 && t.length < 35 && !t.match(/\d/));
            if (possibleNames.length > 0) {
                tenHS = possibleNames[0].split(' ').pop(); // Just take the first name roughly
            }

            const textInputs = Array.from(row.querySelectorAll('textarea, input[type="text"], input:not([type]), input.nhan-xet'))
                .filter(el => !el.disabled && !el.readOnly && el.type !== 'hidden' && el.offsetParent !== null && !el.hidden && el.style.display !== 'none');
            
            if (textInputs.length === 0) continue;
            
            let commentInput = null;
            
            // Heuristic to filter out "Mã nhận xét" (code) inputs which are usually small or have specific naming
            const isCodeInput = (el) => {
                if (el.tagName.toLowerCase() === 'textarea') return false;
                const attrStr = (el.id + " " + (el.name || "") + " " + (el.className || "")).toLowerCase();
                if (attrStr.includes('manx') || attrStr.includes('ma_nx') || attrStr.includes('macmt')) return true;
                if (el.maxLength && el.maxLength > 0 && el.maxLength < 20) return true;
                if (el.style && el.style.width) {
                    const w = parseInt(el.style.width);
                    if (w > 0 && w < 60) return true;
                }
                return false;
            };

            const contentInputs = textInputs.filter(el => !isCodeInput(el));
            
            if (contentInputs.length > 0) {
                if (role === 'HOC_BA') {
                    // Always pick the LAST valid comment input for Hoc Ba
                    commentInput = contentInputs[contentInputs.length - 1];
                } else {
                    // Always pick the FIRST valid comment input for GVBM
                    commentInput = contentInputs[0];
                }
            } else {
                // Fallback: If no content inputs found by our filter (for example, the input is tiny and has no name), stick to the original plan
                commentInput = textInputs[role === 'HOC_BA' ? textInputs.length - 1 : 0];
            }
                
            if (!commentInput) continue;

            if (role === 'GVBM' || method === 'ai') {
                // Find the closest ancestor TD to look backwards from
                const commentTd = commentInput.closest('td, div.x-grid-cell, div.x-grid3-cell');
                let foundScore = null;

                if (commentTd && commentTd.parentElement) {
                    const allCells = Array.from(commentTd.parentElement.querySelectorAll('td, div.x-grid-cell, div.x-grid3-cell'));
                    const commentIndex = allCells.indexOf(commentTd);
                    
                    if (commentIndex !== -1) {
                        for (let i = commentIndex - 1; i >= 0; i--) {
                            const cell = allCells[i];
                            const text = cell.innerText.trim();
                            // If there are inputs that might have the score inside
                            const possibleInputs = Array.from(cell.querySelectorAll('input[type="text"], span, div.x-grid-cell-inner'));
                            let valsToTry = [text];
                            possibleInputs.forEach(el => {
                                valsToTry.push((el.value || el.innerText || "").trim());
                            });

                            for (let val of valsToTry) {
                                if (val) {
                                    const cleaned = val.replace(',', '.').trim();
                                    // Match exact floats
                                    if (/^\d{1,2}(\.\d+)?$/.test(cleaned)) {
                                        const parsed = parseFloat(cleaned);
                                        if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
                                            foundScore = parsed;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (foundScore !== null) break;
                        }
                    }
                }
                
                // Fallback to the old logic if we didn't find anything backwards
                if (foundScore !== null) {
                    averageScore = foundScore;
                } else {
                    const targetCells = Array.from(row.querySelectorAll('td, div.x-grid-cell, div.x-grid3-cell')).slice(1);
                    const numberValues = Array.from(targetCells).flatMap(cell => {
                        const els = Array.from(cell.querySelectorAll('input[type="text"], span, div.x-grid-cell-inner'));
                        return [cell.innerText, ...els.map(e => e.value || e.innerText)];
                    })
                    .map(val => {
                        if (typeof val === 'string') {
                            val = val.replace(',', '.').trim();
                            // Specific check to avoid matching dates or strings as numbers roughly
                            if (/^\d{1,2}(\.\d+)?$/.test(val)) {
                                return parseFloat(val);
                            }
                        }
                        return NaN;
                    })
                    .filter(num => !isNaN(num) && num <= 10 && num >= 0);
                    
                    if (numberValues.length > 0) {
                        averageScore = numberValues[numberValues.length - 1];
                    }
                }
            }

            // Only proceed if we found a score, as requested: "nếu các cột đó có điểm thì sẽ điền"
            if (averageScore === null) continue;

            let chosenComment = "";
            let level = "Đạt";
            
            if (averageScore !== null) {
                if (averageScore >= 8.0) level = "Giỏi";
                else if (averageScore >= 6.5) level = "Khá";
                else if (averageScore >= 5.0) level = "Đạt";
                else level = "Chưa Đạt";
            }

            if (method === 'template') {
                if (commentsPool) {
                    if (role === 'GVBM') {
                         chosenComment = getRandom(commentsPool[level]);
                    } else {
                         chosenComment = getRandom(commentsPool);
                    }
                }
            } else if (method === 'ai') {
                // We show loading state on the input
                const oldPhm = commentInput.placeholder;
                commentInput.placeholder = "AI đang soạn...";
                try {
                    const aiResult = await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({
                            action: "generateAIComment",
                            payload: {
                                apiKey: resolvedApiKey,
                                modelId: storageResult.geminiModelId,
                                promptTemplate: storageResult.aiPromptTemplate,
                                diem: averageScore !== null ? averageScore : (level + " (Đánh giá chung)"),
                                mon: subject || "Chung",
                                ten: tenHS,
                                role: role
                            }
                        }, response => {
                            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                            else if (response && response.error) reject(new Error(response.error));
                            else resolve(response.text);
                        });
                    });
                    chosenComment = aiResult;
                } catch (apiErr) {
                    console.warn("AI generation failed for a row", apiErr);
                    lastRowError = apiErr;
                    chosenComment = "";
                }
                commentInput.placeholder = oldPhm || "";
                
                // Add sleep to avoid API rate limit (15 req/min on free tier => 4s per req)
                // If it fails with 429, the error is caught above, but we still want to wait.
                await new Promise(resolve => setTimeout(resolve, 4000));
            }

            if (chosenComment) {
                const textToFill = formatComment(chosenComment, role);
                commentInput.focus();
                
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                
                if (commentInput.tagName.toLowerCase() === 'textarea' && nativeTextAreaValueSetter) {
                    nativeTextAreaValueSetter.call(commentInput, textToFill);
                } else if (nativeInputValueSetter && commentInput.tagName.toLowerCase() === 'input') {
                    nativeInputValueSetter.call(commentInput, textToFill);
                } else {
                    commentInput.value = textToFill;
                }

                commentInput.dispatchEvent(new Event('input', { bubbles: true }));
                commentInput.dispatchEvent(new Event('change', { bubbles: true }));
                commentInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                commentInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                commentInput.blur();
                fillCount++;
            }
        } catch (err) {
            console.warn("Row iteration error:", err);
            lastRowError = err;
        }
    }

    if (fillCount === 0) {
        if (lastRowError) {
            throw new Error(`Lỗi: ${lastRowError.message || lastRowError}`);
        }
        throw new Error("Không tìm thấy hàng nào có điểm để điền. Vui lòng đảm bảo bảng đã có điểm hoặc chọn đúng ô.");
    }
    return fillCount;
}
