import { GRADE_LEVELS, getSubjects } from './shared.js';

document.addEventListener('DOMContentLoaded', () => {
    const capHocSel = document.getElementById('capHoc');
    const khoiLopSel = document.getElementById('khoiLop');
    const roleItemSel = document.getElementById('roleItem');
    const subjectContainer = document.getElementById('subjectContainer');
    const subjectSel = document.getElementById('subject');
    const optionsBtn = document.getElementById('optionsBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const runBtn = document.getElementById('runBtn');
    const platformSel = document.getElementById('platform');

    const updateKhoiLop = () => {
        const cap = capHocSel.value;
        const khois = GRADE_LEVELS[cap] || [];
        khoiLopSel.innerHTML = khois.map(k => `<option value="${k}">Khối ${k}</option>`).join('');
        updateMonHoc();
    };

    const updateMonHoc = () => {
        const cap = capHocSel.value;
        const khoi = khoiLopSel.value;
        const subjects = getSubjects(cap, khoi);
        subjectSel.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
    };

    capHocSel.addEventListener('change', updateKhoiLop);
    khoiLopSel.addEventListener('change', updateMonHoc);

    roleItemSel.addEventListener('change', (e) => {
        if (e.target.value === 'GVBM') {
            subjectContainer.style.display = 'block';
        } else {
            subjectContainer.style.display = 'none';
        }
    });

    updateKhoiLop();

    const openOptions = (tab = null) => {
        let url = chrome.runtime.getURL('options.html');
        if (tab) url += `?tab=${tab}`;
        window.open(url);
    };
    
    optionsBtn.addEventListener('click', openOptions);
    settingsBtn.addEventListener('click', openOptions);

    const setStatus = (msg, type) => {
        const text = document.getElementById('statusText');
        const dot = document.getElementById('statusDot');
        text.innerText = msg;
        if (type === 'error') {
            text.className = "text-[10px] font-bold text-red-500";
            dot.className = "w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse";
        } else if (type === 'success') {
            text.className = "text-[10px] font-bold text-green-600";
            dot.className = "w-1.5 h-1.5 rounded-full bg-green-500";
        } else {
            text.className = "text-[10px] font-medium text-slate-400";
            dot.className = "w-1.5 h-1.5 rounded-full bg-slate-300";
        }
    };

    runBtn.addEventListener('click', () => {
        const platform = platformSel.value;
        const role = roleItemSel.value;
        const capHoc = capHocSel.value;
        const khoiLop = khoiLopSel.value;
        const subject = role === 'GVBM' ? subjectSel.value : null;
        let method = 'template';
        const methodEl = document.querySelector('input[name="method"]:checked');
        if (methodEl) {
            method = methodEl.value;
        }

        if (method === 'ai') {
            chrome.storage.local.get(['geminiApiKey'], (res) => {
                if (!res.geminiApiKey) {
                    setStatus("Chưa cấu hình AI...", "error");
                    setTimeout(() => openOptions('ai'), 1500);
                    return;
                }
                executeLogic({ platform, role, capHoc, khoiLop, subject, method });
            });
        } else {
            executeLogic({ platform, role, capHoc, khoiLop, subject, method });
        }
    });

    function executeLogic(config) {
        setStatus("Đang xử lý...", "default");
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0] && !tabs[0].url.startsWith('chrome://')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "fillComments",
                    config
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        setStatus("Lỗi kết nối. Hãy tải lại trang web!", "error");
                    } else if (response && response.success) {
                        if (response.count > 0) {
                            setStatus(`Đã điền thành công ${response.count} dòng!`, "success");
                        } else {
                            setStatus("Không tìm thấy ô nhận xét phù hợp!", "error");
                        }
                    } else {
                        setStatus(response?.error || 'Lỗi không xác định', "error");
                    }
                });
            } else {
                setStatus("Không thể chạy tiện ích trên trang này.", "error");
            }
        });
    }
});