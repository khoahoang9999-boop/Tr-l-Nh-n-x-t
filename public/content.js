chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fillComments") {
        fillCommentsAsync(request.config).then(result => {
             sendResponse({success: true, count: result.count, detectedMon: result.detectedMon});
        }).catch(err => {
             console.error(err);
             sendResponse({success: false, error: err.message});
        });
        return true; 
    }
});

async function fillCommentsAsync(config) {
    let method = config.method || 'template';

    const storageResult = await chrome.storage.local.get(['commentsData']);
    const db = storageResult.commentsData;

    // AUTO DETECT LOGIC
    let role = 'GVBM';
    let capHoc = 'THCS';
    let khoiLop = '6';
    let subject = '';

    const pageText = document.body.innerText.toLowerCase();
    
    if (pageText.includes('học bạ') || pageText.includes('tổng kết') || pageText.includes('năng lực')) {
        role = 'HOC_BA';
    }

    if (pageText.includes('thpt') || pageText.includes('phổ thông')) { capHoc = 'THPT'; }
    else if (pageText.includes('tiểu học')) { capHoc = 'TH'; }

    const topInputs = Array.from(document.querySelectorAll('input[type="text"]'));
    const valSet = Array.from(new Set(topInputs.map(el => el.value.trim())));

    for (const val of valSet) {
        if (!val) continue;
        const lowVal = val.toLowerCase();
        
        if (lowVal.startsWith('khối ')) {
            const k = val.replace(/\D/g, '');
            if (k) {
                khoiLop = k;
                if (parseInt(k) >= 10) capHoc = 'THPT';
                else if (parseInt(k) <= 5) capHoc = 'TH';
                else capHoc = 'THCS';
            }
        }
        
        if (role === 'GVBM' && db && db[capHoc] && db[capHoc][khoiLop] && db[capHoc][khoiLop].GVBM) {
            const availSubs = Object.keys(db[capHoc][khoiLop].GVBM);
            if (availSubs.includes(val)) {
                subject = val;
            }
        }
    }
    
    if (role === 'GVBM' && !subject && db && db[capHoc] && db[capHoc][khoiLop] && db[capHoc][khoiLop].GVBM) {
         const availSubs = Object.keys(db[capHoc][khoiLop].GVBM);
         for(let sub of availSubs) {
             const paddedSub = ' ' + sub.toLowerCase() + ' ';
             if (pageText.includes(paddedSub)) {
                 subject = sub;
                 break;
             }
         }
         if (!subject && availSubs.length > 0) subject = availSubs[0]; // fallback
    }

    const platform = pageText.includes('csdl') ? 'csdl' : 'vnedu';

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
    
    // Validate pool
    const getCommentsPool = () => {
        if (!db || !db[capHoc] || !db[capHoc][khoiLop]) return null;
        if (role === 'GVBM') {
            return db[capHoc][khoiLop].GVBM[subject] || null;
        }
        return db[capHoc][khoiLop].HOC_BA;
    };
    
    const commentsPool = getCommentsPool();
    
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

    // Process rows sequentially
    for (const row of Array.from(rows)) {
        try {
            // Must have enough cells to be a valid data row (avoid headers/navbars)
            const cells = row.querySelectorAll('td, div.x-grid-cell, div.x-grid3-cell');
            if (cells.length > 0 && cells.length < 3) continue;

            let averageScore = null;
            let tenHS = "Em";

            // Attempt to find student name (usually in the second or third column)
            const textCells = Array.from(row.querySelectorAll('td, span, div.x-grid-cell-inner')).map(el => el.innerText.trim());
            
            // Skip rows that look like purely headers
            const isHeader = textCells.some(t => t.toLowerCase() === 'họ tên' || t.toLowerCase() === 'stt');
            if (isHeader) continue;
            
            // Skip filter bars robustly
            const isFilterBar = textCells.some(t => {
                const lower = t.toLowerCase().trim();
                return lower.includes('khối') || lower.includes('lớp') || lower.includes('môn học') || lower.includes('cấu hình nhập');
            });
            if (isFilterBar) continue;

            const possibleNames = textCells.filter(t => t.length >= 5 && t.length < 35 && !t.match(/\d/));
            if (possibleNames.length > 0) {
                tenHS = possibleNames[0].split(' ').pop(); // Just take the first name roughly
            }

            const textInputs = Array.from(row.querySelectorAll('textarea, input[type="text"], input:not([type]), input.nhan-xet'))
                .filter(el => !el.disabled && !el.readOnly && el.type !== 'hidden' && el.style.display !== 'none');
            
            if (textInputs.length === 0) continue;
            
            let commentInput = null;
            
            // Heuristic to filter out "Mã nhận xét" (code) inputs which are usually small or have specific naming
            const isCodeInput = (el) => {
                if (el.tagName.toLowerCase() === 'textarea') return false;
                const attrStr = (el.id + " " + (el.name || "") + " " + (el.className || "")).toLowerCase();
                if (attrStr.includes('manx') || attrStr.includes('ma_nx') || attrStr.includes('macmt') || attrStr.includes('idnhanxet')) return true;
                
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.width < 80) return true;
                return false;
            };

            const textAreas = textInputs.filter(el => el.tagName.toLowerCase() === 'textarea');
            const contentInputs = textAreas.length > 0 ? textAreas : textInputs.filter(el => !isCodeInput(el));
            
            if (contentInputs.length > 0) {
                if (role === 'HOC_BA') {
                    // Always pick the LAST valid comment input, because "Nội dung" is typically to the right of "Mã nhận xét"
                    commentInput = contentInputs[contentInputs.length - 1];
                } else {
                    commentInput = contentInputs[0];
                }
            } else {
                commentInput = textInputs[role === 'HOC_BA' ? textInputs.length - 1 : 0];
            }
                
            if (!commentInput) continue;

            // Find the closest ancestor TD to look backwards from
            const commentTd = commentInput.closest('td, div.x-grid-cell, div.x-grid3-cell');
            let averageScore = null;
            let foundScore = null;

            if (commentTd && commentTd.parentElement) {
                const allCells = Array.from(commentTd.parentElement.querySelectorAll('td, div.x-grid-cell, div.x-grid3-cell'));
                const commentIndex = allCells.indexOf(commentTd);
                
                if (commentIndex !== -1) {
                    // Limit backward search to prevent picking up STT (usually in the first few cells)
                    for (let i = commentIndex - 1; i >= Math.max(3, commentIndex - 8); i--) {
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
            
            if (foundScore !== null) {
                averageScore = foundScore;
            } else if (commentIndex === -1) {
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

            // Only proceed if we found a score, as requested: "nếu các cột đó có điểm thì sẽ điền"
            if (averageScore === null) continue;

            let chosenComment = "";
            let level = "Đạt";
            let defaultCode = "";
            
            if (averageScore !== null) {
                if (role === 'GVBM' && commentsPool) {
                    let matchedLevel = null;
                    for (const [lvl, config] of Object.entries(commentsPool)) {
                        if (config && typeof config === 'object' && !Array.isArray(config)) {
                            if (averageScore >= config.min && averageScore <= config.max) {
                                matchedLevel = lvl;
                                defaultCode = config.code || "";
                                break;
                            }
                        }
                    }
                    if (matchedLevel) {
                        level = matchedLevel;
                    } else {
                        // Fallback generic logic if no match or old structure
                        if (averageScore >= 8.0) level = "Tốt";
                        else if (averageScore >= 6.5) level = "Khá";
                        else if (averageScore >= 5.0) level = "Đạt";
                        else level = "Chưa Đạt";
                        if (!commentsPool["Tốt"] && commentsPool["Giỏi"] && level === "Tốt") level = "Giỏi";
                    }
                } else {
                    if (averageScore >= 8.0) level = "Tốt";
                    else if (averageScore >= 6.5) level = "Khá";
                    else if (averageScore >= 5.0) level = "Đạt";
                    else level = "Chưa Đạt";
                }
            }

            if (commentsPool) {
                if (role === 'GVBM') {
                    const targetPool = commentsPool[level];
                    if (Array.isArray(targetPool)) {
                        chosenComment = getRandom(targetPool);
                    } else if (targetPool && Array.isArray(targetPool.comments)) {
                        chosenComment = getRandom(targetPool.comments);
                    }
                } else {
                     chosenComment = getRandom(commentsPool);
                }
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
                
                if (defaultCode && role === 'GVBM') {
                    // Try to find code input right before the comment input
                    let codeInput = null;
                    const allInputsInRow = Array.from(row.querySelectorAll('textarea, input[type="text"]'));
                    const ciIndex = allInputsInRow.indexOf(commentInput);
                    if (ciIndex > 0) {
                        const possibleCode = allInputsInRow[ciIndex - 1];
                        if (isCodeInput(possibleCode) || possibleCode.getBoundingClientRect().width < 100) {
                            codeInput = possibleCode;
                        }
                    }
                    if (codeInput) {
                        codeInput.focus();
                        if (nativeInputValueSetter && codeInput.tagName.toLowerCase() === 'input') {
                            nativeInputValueSetter.call(codeInput, defaultCode);
                        } else {
                            codeInput.value = defaultCode;
                        }
                        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
                        codeInput.dispatchEvent(new Event('change', { bubbles: true }));
                        codeInput.blur();
                    }
                }
                
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
    return { count: fillCount, detectedMon: subject };
}
