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
            const lines = formatted.split('\n');
            if (lines.length > 0 && !lines[0].startsWith("-")) {
                formatted = lines.map(l => l.trim() ? `- ${l.trim()}` : '').join('\n');
            }
        }
        return formatted;
    };

    const getRandom = (arr) => (arr && arr.length > 0) ? arr[Math.floor(Math.random() * arr.length)] : "";

    let rows = [];
    switch(platform) {
        case 'csdl':
            rows = document.querySelectorAll('table tbody tr');
            break;
        case 'vnedu':
            rows = document.querySelectorAll('.x-grid-row, .table tbody tr');
            break;
        default:
            rows = document.querySelectorAll('tr');
    }

    if (rows.length === 0) {
        throw new Error("Không tìm thấy bảng nhập liệu lớp học!");
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
            let averageScore = null;
            let tenHS = "Em";

            // Attempt to find student name (usually in the second or third column)
            const textCells = Array.from(row.querySelectorAll('td, span')).map(el => el.innerText.trim());
            const possibleNames = textCells.filter(t => t.length > 5 && t.length < 30 && !t.match(/\d/));
            if (possibleNames.length > 0) {
                tenHS = possibleNames[0].split(' ').pop(); // Just take the first name roughly
            }

            if (role === 'GVBM' || method === 'ai') {
                const numberValues = Array.from(row.querySelectorAll('input[type="text"], span, td'))
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

            const textInputs = Array.from(row.querySelectorAll('textarea, input[type="text"]:not([readonly]), input.nhan-xet'));
            // Prefer textarea, or input with nhan-xet class/placeholder, or just the last input in the row
            const commentInput = textInputs.find(el => el.tagName.toLowerCase() === 'textarea') 
                || textInputs.find(el => el.className.toLowerCase().includes('nhan-xet') || el.placeholder.toLowerCase().includes('nhận xét'))
                || textInputs[textInputs.length - 1];
                
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
                commentInput.value = formatComment(chosenComment, role);
                commentInput.dispatchEvent(new Event('input', { bubbles: true }));
                commentInput.dispatchEvent(new Event('change', { bubbles: true }));
                commentInput.dispatchEvent(new Event('blur', { bubbles: true }));
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
