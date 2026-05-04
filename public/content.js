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
    if (method === 'ai' && !storageResult.geminiApiKey) {
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
    
    // Validate pool if using template
    const getCommentsPool = () => {
        if (!db || !db[capHoc] || !db[capHoc][khoiLop]) return null;
        if (role === 'GVBM') {
            return db[capHoc][khoiLop].GVBM[subject] || null;
        }
        return db[capHoc][khoiLop].HOC_BA;
    };
    
    const commentsPool = method === 'template' ? getCommentsPool() : null;
    
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

            const possibleNames = textCells.filter(t => t.length >= 5 && t.length < 35 && !t.match(/\d/));
            if (possibleNames.length > 0) {
                tenHS = possibleNames[0].split(' ').pop(); // Just take the first name roughly
            }

            if (role === 'GVBM' || method === 'ai') {
                const numberValues = Array.from(row.querySelectorAll('input[type="text"], span, td, div.x-grid-cell-inner'))
                                      .map(el => {
                                          let val = el.value || el.innerText;
                                          if (typeof val === 'string') val = val.replace(',', '.').trim();
                                          return parseFloat(val);
                                      })
                                      .filter(num => !isNaN(num) && num <= 10 && num >= 0);
                
                if (numberValues.length > 0) {
                    averageScore = numberValues[numberValues.length - 1]; // Pick the last number logically
                }
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
                // Fallback if our filter excluded everything
                commentInput = textInputs[role === 'HOC_BA' ? textInputs.length - 1 : 0];
            }
                
            if (!commentInput) continue;

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
                                apiKey: storageResult.geminiApiKey,
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
                    chosenComment = "";
                }
                commentInput.placeholder = oldPhm;
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
        }
    }

    if (fillCount === 0) {
        throw new Error("Không thể điền dữ liệu, vui lòng kiểm tra lại thiết lập.");
    }
    return fillCount;
}
