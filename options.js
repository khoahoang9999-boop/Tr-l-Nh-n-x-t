// Prevent "Cannot set property fetch of #<Window> which has only a getter" from third-party libraries
let origFetch = window.fetch;
Object.defineProperty(window, "fetch", {
  get: () => origFetch,
  set: () => {},
  configurable: true,
});

import { GRADE_LEVELS, getSubjects, EVAL_LEVELS, getEmptySubject, generateAllSampleData } from "./shared.js";
import * as XLSX from "xlsx";

let currentData = { TH: {}, THCS: {}, THPT: {} };
let currentRole = "GVBM";
let currentCapHoc = "THCS";
let currentKhoiLop = "6";
let currentMonHoc = "Ngữ văn";

document.addEventListener("DOMContentLoaded", () => {
  const filterCapHoc = document.getElementById("filterCapHoc");
  const filterKhoiLop = document.getElementById("filterKhoiLop");
  const filterMonHoc = document.getElementById("filterMonHoc");
  const filterMonHocContainer = document.getElementById("filterMonHocContainer");

  const navTemplates = document.getElementById("navTemplates");
  const viewTemplates = document.getElementById("viewTemplates");
  const saveConfigBtn = document.getElementById("saveConfigBtn");

  const urlParams = new URLSearchParams(window.location.search);

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["commentsData"], (result) => {
      // Check if data exists and is new format
      const hasData = result.commentsData && Object.keys(result.commentsData).length > 0;
      let needsUpgrade = false;
      if (hasData && result.commentsData.THCS && result.commentsData.THCS["6"] && result.commentsData.THCS["6"].GVBM && result.commentsData.THCS["6"].GVBM["Toán"]) {
          const testObj = result.commentsData.THCS["6"].GVBM["Toán"];
          if (Array.isArray(testObj["Giỏi"]) || Array.isArray(testObj["Tốt"])) {
              needsUpgrade = true; // Old format (array instead of object)
          }
      }

      if (hasData && !needsUpgrade) {
        currentData = result.commentsData;
      } else {
        currentData = generateAllSampleData(); // Overwrite with new format if needed
        chrome.storage.local.set({ commentsData: currentData });
      }
      updateDropdowns();
      renderData();
    });
  } else {
    currentData = generateAllSampleData();
    updateDropdowns();
    renderData();
  }

  function updateDropdowns(source = null) {
    if (!source || source === "cap") {
      const khois = GRADE_LEVELS[currentCapHoc] || [];
      filterKhoiLop.innerHTML = khois.map((k) => `<option value="${k}">Khối ${k}</option>`).join("");
      currentKhoiLop = khois[0] || "";
    }

    if (!source || source === "cap" || source === "khoi") {
      if (currentRole === "GVBM") {
        const subjects = getSubjects(currentCapHoc, currentKhoiLop);
        filterMonHoc.innerHTML = subjects.map((s) => `<option value="${s}">${s}</option>`).join("");
        currentMonHoc = subjects[0] || "";
      }
    }

    filterCapHoc.value = currentCapHoc;
    if (filterKhoiLop.querySelector(`option[value="${currentKhoiLop}"]`)) {
      filterKhoiLop.value = currentKhoiLop;
    }
    if (filterMonHoc.querySelector(`option[value="${currentMonHoc}"]`)) {
      filterMonHoc.value = currentMonHoc;
    }
  }

  filterCapHoc.addEventListener("change", (e) => {
    currentCapHoc = e.target.value;
    updateDropdowns("cap");
    renderData();
  });

  filterKhoiLop.addEventListener("change", (e) => {
    currentKhoiLop = e.target.value;
    updateDropdowns("khoi");
    renderData();
  });

  filterMonHoc.addEventListener("change", (e) => {
    currentMonHoc = e.target.value;
    renderData();
  });

  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      tabs.forEach((t) => {
        t.classList.remove("border-red-600", "text-red-600");
        t.classList.add("border-transparent", "text-slate-400");
      });
      e.target.classList.remove("border-transparent", "text-slate-400");
      e.target.classList.add("border-red-600", "text-red-600");

      currentRole = e.target.dataset.role;
      document.getElementById("gvbmAlert").style.display =
        currentRole === "HOC_BA" ? "flex" : "none";
      filterMonHocContainer.style.display =
        currentRole === "GVBM" ? "block" : "none";

      updateDropdowns("role");
      renderData();
    });
  });

  saveConfigBtn.addEventListener("click", () => {
    ensureDataStructure();

    if (currentRole === "GVBM") {
      EVAL_LEVELS.forEach(level => {
        const minInput = document.getElementById(`min_${level}`);
        const maxInput = document.getElementById(`max_${level}`);
        const codeInput = document.getElementById(`code_${level}`);
        const commentsInput = document.getElementById(`comments_${level}`);

        if (minInput && maxInput && codeInput && commentsInput) {
            const min = parseFloat(minInput.value);
            const max = parseFloat(maxInput.value);
            const code = codeInput.value.trim();
            const comments = commentsInput.value.split('\n').map(s => s.trim()).filter(s => s);

            currentData[currentCapHoc][currentKhoiLop].GVBM[currentMonHoc][level] = {
                min: isNaN(min) ? 0 : min,
                max: isNaN(max) ? 10 : max,
                code: code,
                comments: comments
            };
        }
      });
    } else {
        const contentArea = document.getElementById("hocba_content");
        if (contentArea) {
            currentData[currentCapHoc][currentKhoiLop].HOC_BA = contentArea.value.split('\n').map(s => s.trim()).filter(s => s);
        }
    }

    saveToStorage();
    alert("Đã lưu cấu hình thành công!");
  });

  // CSV Import dummy hook - disabled/removed for simplicity of new view, wait we keep it just in case:
  const importCsvBtn = document.getElementById("importCsvBtn");
  if (importCsvBtn) {
      importCsvBtn.addEventListener("click", () => {
        alert("Tính năng nhập CSV hiện đang được bảo trì trong phiên bản giao diện thiết lập mới.");
      });
  }

});

function ensureDataStructure() {
  let modified = false;
  if (!currentData[currentCapHoc]) {
    currentData[currentCapHoc] = {};
    modified = true;
  }
  if (!currentData[currentCapHoc][currentKhoiLop]) {
    currentData[currentCapHoc][currentKhoiLop] = { GVBM: {}, HOC_BA: [] };
    modified = true;
  }
  const kData = currentData[currentCapHoc][currentKhoiLop];
  if (currentRole === "GVBM") {
    if (!kData.GVBM[currentMonHoc] || Object.keys(kData.GVBM[currentMonHoc]).length === 0) {
      kData.GVBM[currentMonHoc] = getEmptySubject(currentMonHoc);
      modified = true;
    }
  }
  if (modified) {
    saveToStorage();
  }
}

function saveToStorage() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ commentsData: currentData });
  }
}

function renderData() {
  const container = document.getElementById("configContainer");
  container.innerHTML = "";

  ensureDataStructure();

  if (currentRole === "GVBM") {
    const levels = EVAL_LEVELS;
    
    levels.forEach((l) => {
      const gvbmData = currentData[currentCapHoc][currentKhoiLop].GVBM[currentMonHoc] || {};
      const item = gvbmData[l] || { min: 0, max: 10, code: "", comments: [] };
      const commentText = (item.comments || []).join('\n');
      
      let style = "bg-stone-50 border-stone-200 text-stone-700";
      if (l === "Tốt" || l === "Giỏi") style = "bg-green-50 border-green-200 text-green-700";
      if (l === "Khá") style = "bg-blue-50 border-blue-200 text-blue-700";
      if (l === "Đạt") style = "bg-amber-50 border-amber-200 text-amber-700";
      if (l === "Chưa Đạt") style = "bg-red-50 border-red-200 text-red-700";

      container.innerHTML += `
        <div class="bg-white border text-sm border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div class="${style} px-5 py-3 border-b flex items-center gap-4">
                <span class="px-2.5 py-1 bg-white/50 mix-blend-multiply border border-black/5 rounded-md shadow-sm font-bold uppercase tracking-widest text-[#2f3542] text-xs">${l}</span>
                <span class="text-sm font-medium">Điểm: ${item.min} - ${item.max}</span>
            </div>
            
            <div class="p-5 flex flex-col gap-5">
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Điểm TT</label>
                        <input type="number" step="0.1" id="min_${l}" value="${item.min}" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-mono">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Điểm TĐ</label>
                        <input type="number" step="0.1" id="max_${l}" value="${item.max}" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-mono">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Mã NX</label>
                        <input type="text" id="code_${l}" value="${item.code || ''}" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-sans font-medium">
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ngân hàng Lời nhận xét (Mỗi dòng một mẫu)</label>
                    <textarea id="comments_${l}" rows="5" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-sans leading-relaxed transition-colors placeholder:text-slate-400 custom-scroll">${commentText}</textarea>
                </div>
            </div>
        </div>
      `;
    });
    container.className = "grid grid-cols-1 xl:grid-cols-2 gap-6";
  } else {
    const items = currentData[currentCapHoc][currentKhoiLop].HOC_BA || [];
    const textData = items.join('\n');

    container.innerHTML = `
        <div class="bg-white border text-sm border-slate-200 rounded-xl overflow-hidden shadow-sm p-6">
            <h2 class="text-base font-bold text-slate-800 uppercase tracking-widest mb-4">Danh sách Mẫu Học bạ (${currentCapHoc} - Khối ${currentKhoiLop})</h2>
            
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ngân hàng Lời nhận xét (Mỗi dòng một mẫu)</label>
            <textarea id="hocba_content" rows="15" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-sans leading-relaxed placeholder:text-slate-400">${textData}</textarea>
            
            <p class="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Bạn có thể dán danh sách lời phê vào đây. Mỗi dòng sẽ được hiểu là một mẫu (khi dùng AI sẽ được hỗ trợ trộn).
            </p>
        </div>
    `;
  }
}
