import { GRADE_LEVELS, getSubjects, EVAL_LEVELS } from './shared.js';
import * as XLSX from 'xlsx';

const getEmptySubject = (mon) => {
    const m = mon ? mon : "học";
    return {
        "Giỏi": [
            `Em hiểu bài nhanh, vận dụng kiến thức nhạy bén trong môn ${m}.`,
            `Có tư duy tốt, luôn hoàn thành xuất sắc các bài tập môn ${m}.`,
            `Học tập tự giác, đạt kết quả cao trong các bài kiểm tra ${m}.`,
            `Tích cực phát biểu xây dựng bài, có năng khiếu học tốt môn ${m}.`,
            `Nắm vững kiến thức trọng tâm, kỹ năng làm bài môn ${m} rất tốt.`
        ],
        "Khá": [
            `Có tiến bộ trong môn ${m}, hiểu bài khá tốt.`,
            `Chăm chỉ học tập, hoàn thành đầy đủ bài tập môn ${m} được giao.`,
            `Nắm được kiến thức cơ bản môn ${m}, cần rèn luyện thêm kỹ năng vận dụng.`,
            `Có cố gắng trong học tập môn ${m}, kết quả đạt loại Khá.`,
            `Chú ý nghe giảng, ý thức học tập môn ${m} tốt, tiếp tục phát huy.`
        ],
        "Đạt": [
            `Nắm bắt kiến thức môn ${m} ở mức độ cơ bản.`,
            `Cần chú ý nghe giảng và hoàn thành bài tập môn ${m} đầy đủ hơn.`,
            `Học lực đạt yêu cầu, tuy nhiên cần chủ động hơn trong học tập môn ${m}.`,
            `Có cố gắng nhưng kết quả môn ${m} chưa thực sự nổi bật.`,
            `Cần dành nhiều thời gian ôn bài ở nhà để củng cố kiến thức môn ${m}.`
        ],
        "Chưa Đạt": [
            `Thường xuyên thiếu tập trung trong giờ học môn ${m}, cần cố gắng nhiều hơn.`,
            `Chưa nắm được kiến thức cơ bản môn ${m}, cần tăng cường phụ đạo.`,
            `Kết quả học tập môn ${m} chưa đạt yêu cầu, cần chấn chỉnh lại thái độ học tập.`,
            `Lười làm bài tập về nhà môn ${m}, phụ huynh cần nhắc nhở thêm.`,
            `Ý thức học tập môn ${m} chưa tốt, tiếp thu bài còn chậm.`
        ]
    };
};

let currentData = { TH: {}, THCS: {}, THPT: {} };
let currentRole = 'GVBM';
let currentCapHoc = 'THCS';
let currentKhoiLop = '6';
let currentMonHoc = 'Ngữ văn';

document.addEventListener('DOMContentLoaded', () => {
    const filterCapHoc = document.getElementById('filterCapHoc');
    const filterKhoiLop = document.getElementById('filterKhoiLop');
    const filterMonHoc = document.getElementById('filterMonHoc');
    const filterMonHocContainer = document.getElementById('filterMonHocContainer');
    
    const navTemplates = document.getElementById('navTemplates');
    const navSettings = document.getElementById('navSettings');
    const viewTemplates = document.getElementById('viewTemplates');
    const viewSettings = document.getElementById('viewSettings');

    // Navigation
    const switchToTab = (tabId) => {
        if (tabId === 'ai') {
            navSettings.classList.replace('hover:bg-slate-800', 'bg-blue-600');
            navSettings.classList.replace('text-slate-300', 'text-white');
            navTemplates.classList.replace('bg-blue-600', 'hover:bg-slate-800');
            navTemplates.classList.replace('text-white', 'text-slate-300');
            viewTemplates.classList.add('hidden');
            viewSettings.classList.remove('hidden');
        } else {
            navTemplates.classList.replace('hover:bg-slate-800', 'bg-blue-600');
            navTemplates.classList.replace('text-slate-300', 'text-white');
            navSettings.classList.replace('bg-blue-600', 'hover:bg-slate-800');
            navSettings.classList.replace('text-white', 'text-slate-300');
            viewTemplates.classList.remove('hidden');
            viewSettings.classList.add('hidden');
        }
    };

    navTemplates.addEventListener('click', (e) => {
        e.preventDefault();
        switchToTab('templates');
    });

    navSettings.addEventListener('click', (e) => {
        e.preventDefault();
        switchToTab('ai');
    });

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'ai') {
        switchToTab('ai');
    }

    // Save Settings
    const geminiApiKeyInp = document.getElementById('geminiApiKey');
    const geminiModelIdInp = document.getElementById('geminiModelId');
    const aiPromptTemplateInp = document.getElementById('aiPromptTemplate');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    if(chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['geminiApiKey', 'geminiModelId', 'aiPromptTemplate', 'commentsData'], (result) => {
            if(result.geminiApiKey) geminiApiKeyInp.value = result.geminiApiKey;
            if(result.geminiModelId) geminiModelIdInp.value = result.geminiModelId;
            if(result.aiPromptTemplate) aiPromptTemplateInp.value = result.aiPromptTemplate;
            
            if (result.commentsData && Object.keys(result.commentsData).length > 0) {
                currentData = result.commentsData;
            } else {
                chrome.storage.local.set({commentsData: currentData});
            }
            updateDropdowns();
            renderData();
        });
    } else {
        updateDropdowns();
        renderData();
    }

    saveSettingsBtn.addEventListener('click', () => {
        chrome.storage.local.set({
            geminiApiKey: geminiApiKeyInp.value,
            geminiModelId: geminiModelIdInp.value,
            aiPromptTemplate: aiPromptTemplateInp.value
        }, () => alert("Đã lưu cấu hình AI"));
    });

    // Cascading logic
    function updateDropdowns(source = null) {
        if (!source || source === 'cap') {
            const khois = GRADE_LEVELS[currentCapHoc] || [];
            filterKhoiLop.innerHTML = khois.map(k => `<option value="${k}">Khối ${k}</option>`).join('');
            currentKhoiLop = khois[0] || '';
        }
        
        if (!source || source === 'cap' || source === 'khoi') {
            if (currentRole === 'GVBM') {
                const subjects = getSubjects(currentCapHoc, currentKhoiLop);
                filterMonHoc.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
                currentMonHoc = subjects[0] || '';
            }
        }
        
        filterCapHoc.value = currentCapHoc;
        if(filterKhoiLop.querySelector(`option[value="${currentKhoiLop}"]`)) {
             filterKhoiLop.value = currentKhoiLop;
        }
        if(filterMonHoc.querySelector(`option[value="${currentMonHoc}"]`)) {
             filterMonHoc.value = currentMonHoc;
        }
    }

    filterCapHoc.addEventListener('change', (e) => {
        currentCapHoc = e.target.value;
        updateDropdowns('cap');
        renderData();
    });

    filterKhoiLop.addEventListener('change', (e) => {
        currentKhoiLop = e.target.value;
        updateDropdowns('khoi');
        renderData();
    });

    filterMonHoc.addEventListener('change', (e) => {
        currentMonHoc = e.target.value;
        renderData();
    });

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => {
                t.classList.remove('border-blue-600', 'text-blue-600');
                t.classList.add('border-transparent', 'text-slate-400');
            });
            e.target.classList.remove('border-transparent', 'text-slate-400');
            e.target.classList.add('border-blue-600', 'text-blue-600');
            
            currentRole = e.target.dataset.role;
            document.getElementById('gvbmAlert').style.display = currentRole === 'HOC_BA' ? 'flex' : 'none';
            filterMonHocContainer.style.display = currentRole === 'GVBM' ? 'block' : 'none';
            
            updateDropdowns('role');
            renderData();
        });
    });

    const modal = document.getElementById('editModal');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelModal');
    const addBtn = document.getElementById('addBtn');
    const saveBtn = document.getElementById('saveEntry');
    const levelContainer = document.getElementById('levelSelectContainer');

    closeBtn.onclick = () => modal.classList.add('hidden');
    cancelBtn.onclick = () => modal.classList.add('hidden');

    addBtn.onclick = () => {
        window.editingIndex = -1;
        document.getElementById('modalTitle').innerText = `Thêm Lời Phê Mới`;
        document.getElementById('entryContent').value = '';
        if (currentRole === 'GVBM') {
            levelContainer.style.display = 'block';
        } else {
            levelContainer.style.display = 'none';
        }
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    saveBtn.onclick = () => {
        const content = document.getElementById('entryContent').value.trim();
        if (!content) return alert("Vui lòng nhập nội dung nhận xét!");

        ensureDataStructure();

        if (currentRole === 'GVBM') {
            const level = document.getElementById('entryLevel').value;
            const pool = currentData[currentCapHoc][currentKhoiLop].GVBM[currentMonHoc];
            
            if (window.editingIndex >= 0 && window.editingLevel) {
                if (window.editingLevel !== level) {
                    pool[window.editingLevel].splice(window.editingIndex, 1);
                    pool[level].push(content);
                } else {
                    pool[level][window.editingIndex] = content;
                }
            } else {
                pool[level].push(content);
            }
        } else {
            const pool = currentData[currentCapHoc][currentKhoiLop].HOC_BA;
            if (window.editingIndex >= 0) {
                pool[window.editingIndex] = content;
            } else {
                pool.push(content);
            }
        }

        saveToStorage();
        modal.classList.add('hidden');
        renderData();
    };

    document.getElementById('importCsvBtn').addEventListener('click', () => {
        const fileInput = document.getElementById('csvFileInput');
        if (fileInput.files.length === 0) return alert('Vui lòng chọn file Excel.');
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, {type: 'binary'});
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                
                let successCount = 0;
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if(!row || row.length < 5) continue;
                    const capHoc = row[0]?.trim();
                    const khoi = String(row[1])?.trim();
                    const role = row[2]?.trim();
                    const monHoc = row[3]?.trim();
                    const level = row[4]?.trim();
                    const content = row[5]?.trim();
                    
                    if(!capHoc || !khoi || !role || !content) continue;

                    if(!currentData[capHoc]) currentData[capHoc] = {};
                    if(!currentData[capHoc][khoi]) currentData[capHoc][khoi] = {GVBM: {}, HOC_BA: []};
                    
                    if (role === 'GVBM' && monHoc && level) {
                        if(!currentData[capHoc][khoi].GVBM[monHoc]) currentData[capHoc][khoi].GVBM[monHoc] = getEmptySubject(monHoc);
                        if(!currentData[capHoc][khoi].GVBM[monHoc][level]) currentData[capHoc][khoi].GVBM[monHoc][level] = [];
                        currentData[capHoc][khoi].GVBM[monHoc][level].push(content);
                        successCount++;
                    } else if (role === 'HOC_BA') {
                        currentData[capHoc][khoi].HOC_BA.push(content);
                        successCount++;
                    }
                }
                saveToStorage();
                renderData();
                alert(`Đã thêm thành công ${successCount} dữ liệu từ Excel.`);
            } catch (err) {
                console.error(err);
                alert("File Excel sai định dạng. Vui lòng tải file đúng mẫu.");
            }
        };
        reader.readAsBinaryString(file);
    });

    document.getElementById('downloadTemplateBtn').addEventListener('click', () => {
        const wb = XLSX.utils.book_new();
        
        const ws_data = [
            ["Cấp Học", "Khối Lớp", "Vai Trò", "Môn Học", "Mức Độ", "Nội Dung"],
            ["THCS", "6", "GVBM", "Ngữ văn", "Giỏi", "Em học xuất sắc bộ môn Ngữ văn."],
            ["THCS", "6", "GVBM", "Ngữ văn", "Khá", "Em học tốt bộ môn Ngữ văn, cần phát huy."],
            ["THCS", "6", "HOC_BA", "", "", "Học sinh ngoan, lễ phép.\\nHoàn thành tốt nhiệm vụ học tập.\\nTích cực tham gia các phong trào."],
            ["THPT", "10", "GVBM", "Toán", "Đạt", "Em có cố gắng, cần làm bài tập nhiều hơn."],
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        // Auto size columns roughly
        ws['!cols'] = [
            { wch: 10 },
            { wch: 10 },
            { wch: 12 },
            { wch: 15 },
            { wch: 10 },
            { wch: 60 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "MauNhanXet");
        XLSX.writeFile(wb, "MauNhanXet_TroLyAI.xlsx");
    });
});

function ensureDataStructure() {
    let modified = false;
    if (!currentData[currentCapHoc]) {
        currentData[currentCapHoc] = {};
        modified = true;
    }
    if (!currentData[currentCapHoc][currentKhoiLop]) {
        currentData[currentCapHoc][currentKhoiLop] = { GVBM: {}, HOC_BA: [
            "Học sinh có ý thức kỷ luật tốt, tích cực tham gia các hoạt động phong trào của lớp và nhà trường, hòa đồng với bạn bè.",
            "Em ngoan ngoãn, lễ phép với thầy cô. Có ý thức tự giác trong học tập, hoàn thành tốt các nhiệm vụ được giao.",
            "Năng nổ, nhiệt tình trong các hoạt động tập thể. Cần cố gắng tập trung hơn nữa trong các giờ học trên lớp.",
            "Có tinh thần trách nhiệm cao, thường xuyên giúp đỡ bạn bè trong học tập. Học lực tiến bộ rõ rệt.",
            "Chăm ngoan, biết vâng lời giáo viên. Tuy nhiên, em cần tự tin và mạnh dạn hơn trong việc phát biểu xây dựng bài."
        ] };
        modified = true;
    }
    const kData = currentData[currentCapHoc][currentKhoiLop];
    if (currentRole === 'GVBM') {
        if (!kData.GVBM[currentMonHoc]) {
            kData.GVBM[currentMonHoc] = getEmptySubject(currentMonHoc);
            modified = true;
        }
    }
    if (modified) {
        saveToStorage();
    }
}

function saveToStorage() {
    if(typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({commentsData: currentData});
    }
}

function renderData() {
    const grid = document.getElementById('commentsGrid');
    grid.innerHTML = '';

    ensureDataStructure();
    
    if (currentRole === 'GVBM') {
        const levels = [
            { id: "Giỏi", bgStyle: "bg-green-50 text-green-700", condition: "≥ 8.0/10" },
            { id: "Khá", bgStyle: "bg-blue-50 text-blue-700", condition: "≥ 6.5/10" },
            { id: "Đạt", bgStyle: "bg-amber-50 text-amber-700", condition: "≥ 5.0/10" },
            { id: "Chưa Đạt", bgStyle: "bg-red-50 text-red-700", condition: "< 5.0/10" }
        ];

        levels.forEach(l => {
            const items = currentData[currentCapHoc][currentKhoiLop].GVBM[currentMonHoc][l.id] || [];
            let html = `
            <div class="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-[400px]">
                <div class="flex justify-between items-start mb-4 shrink-0 border-b border-slate-100 pb-3">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-1 ${l.bgStyle} text-[10px] font-bold rounded-md uppercase tracking-wider">${l.id}</span>
                        <span class="text-[10px] font-bold text-slate-400 capitalize">${l.condition}</span>
                    </div>
                    <span class="text-xs font-semibold text-slate-400 bg-slate-50 px-2 rounded-full py-0.5">${items.length} mẫu</span>
                </div>
                <div class="space-y-4 overflow-y-auto pr-2 custom-scroll flex-1">
            `;
            
            items.forEach((item, idx) => {
                html += `
                <div class="group relative pb-4 border-b border-slate-50 last:border-0 last:pb-0 overflow-hidden">
                    <p class="text-sm text-slate-700 leading-relaxed relative z-10 whitespace-pre-line pl-3 border-l-2 border-slate-200 group-hover:border-blue-400 transition-colors">
                        ${item}
                    </p>
                    <div class="mt-3 flex gap-4 pl-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.editItem('GVBM', ${idx}, '${l.id}')" class="text-[11px] font-semibold text-blue-500 hover:text-blue-700 cursor-pointer">Sửa lại</button>
                        <button onclick="window.deleteItem('GVBM', ${idx}, '${l.id}')" class="text-[11px] font-semibold text-red-400 hover:text-red-600 cursor-pointer">Xóa mẫu</button>
                    </div>
                </div>`;
            });

            if(items.length === 0) {
                 html += `<p class="text-sm text-slate-400 italic py-4 text-center">Chưa có câu mẫu nào.</p>`;
            }

            html += `</div></div>`;
            grid.innerHTML += html;
        });
        grid.className = "grid grid-cols-1 md:grid-cols-2 gap-6";

    } else {
        const items = currentData[currentCapHoc][currentKhoiLop].HOC_BA || [];
        
        let html = `
        <div class="bg-white p-8 border border-slate-200 rounded-2xl shadow-sm col-span-2">
            <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 class="text-base font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                   <div class="w-2 h-2 rounded-full bg-indigo-500"></div> Danh sách Mẫu Học bạ (${currentCapHoc} - Khối ${currentKhoiLop})
                </h2>
                <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">${items.length} mẫu đã lưu</span>
            </div>
            <div class="space-y-4">
        `;
        
        items.forEach((item, idx) => {
            html += `
            <div class="group flex items-start justify-between p-4 bg-slate-50/50 rounded-xl border border-transparent hover:border-slate-200 transition-colors">
                <p class="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">"${item}"</p>
                <div class="flex gap-4 shrink-0 ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="window.editItem('HOC_BA', ${idx})" class="text-[11px] font-semibold text-blue-500 hover:text-blue-700 cursor-pointer">Sửa</button>
                    <button onclick="window.deleteItem('HOC_BA', ${idx})" class="text-[11px] font-semibold text-red-500 hover:text-red-700 cursor-pointer">Xóa</button>
                </div>
            </div>`;
        });

        if(items.length === 0) {
             html += `<div class="p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">Chưa có mẫu nào ở mục này. Hãy ấn thêm mới!</div>`;
        }

        html += `</div></div>`;
        grid.innerHTML = html;
        grid.className = "grid grid-cols-1 gap-6";
    }
}

window.editItem = function(role, idx, level = null) {
    window.editingIndex = idx;
    window.editingLevel = level;

    const modal = document.getElementById('editModal');
    document.getElementById('modalTitle').innerText = `Chỉnh Sửa Lời Phê`;
    
    let content = '';
    if (role === 'GVBM') {
        content = currentData[currentCapHoc][currentKhoiLop].GVBM[currentMonHoc][level][idx];
        document.getElementById('entryLevel').value = level;
        document.getElementById('levelSelectContainer').style.display = 'block';
    } else {
        content = currentData[currentCapHoc][currentKhoiLop].HOC_BA[idx];
        document.getElementById('levelSelectContainer').style.display = 'none';
    }
    document.getElementById('entryContent').value = content;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

window.deleteItem = function(role, idx, level = null) {
    if(!confirm("Bạn có chắc chắn muốn xóa lời phê này?")) return;
    
    if (role === 'GVBM') {
        currentData[currentCapHoc][currentKhoiLop].GVBM[currentMonHoc][level].splice(idx, 1);
    } else {
        currentData[currentCapHoc][currentKhoiLop].HOC_BA.splice(idx, 1);
    }
    
    saveToStorage();
    renderData();
}
