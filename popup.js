// Prevent "Cannot set property fetch of #<Window> which has only a getter" from third-party libraries
let origFetch = window.fetch;
Object.defineProperty(window, "fetch", {
  get: () => origFetch,
  set: () => {},
  configurable: true,
});

import { GRADE_LEVELS, getSubjects } from "./shared.js";

document.addEventListener("DOMContentLoaded", () => {
  const capHocSel = document.getElementById("capHoc");
  const khoiLopSel = document.getElementById("khoiLop");
  const roleItemSel = document.getElementById("roleItem");
  const subjectContainer = document.getElementById("subjectContainer");
  const subjectSel = document.getElementById("subject");
  const optionsBtn = document.getElementById("optionsBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const runBtn = document.getElementById("runBtn");
  const platformSel = document.getElementById("platform");

  const updateKhoiLop = () => {
    const cap = capHocSel.value;
    const khois = GRADE_LEVELS[cap] || [];
    khoiLopSel.innerHTML = khois
      .map((k) => `<option value="${k}">Khối ${k}</option>`)
      .join("");
    updateMonHoc();
  };

  const updateMonHoc = () => {
    const cap = capHocSel.value;
    const khoi = khoiLopSel.value;
    const subjects = getSubjects(cap, khoi);
    subjectSel.innerHTML = subjects
      .map((s) => `<option value="${s}">${s}</option>`)
      .join("");
  };

  capHocSel.addEventListener("change", updateKhoiLop);
  khoiLopSel.addEventListener("change", updateMonHoc);

  roleItemSel.addEventListener("change", (e) => {
    if (e.target.value === "GVBM") {
      subjectContainer.style.display = "block";
    } else {
      subjectContainer.style.display = "none";
    }
  });

  updateKhoiLop();

  const openOptions = (tabParam = null) => {
    let url =
      typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL("options.html")
        : "/options.html";
    if (typeof tabParam === "string") url += `?tab=${tabParam}`;
    window.open(url);
  };

  optionsBtn.addEventListener("click", openOptions);
  settingsBtn.addEventListener("click", openOptions);

  const aiMethodRadio = document.getElementById("aiMethod");
  const templateMethodRadio = document.querySelector('input[value="template"]');
  const aiSettingsGroup = document.getElementById("aiSettingsGroup");
  const apiKeysList = document.getElementById("apiKeysList");
  const addApiKeyBtn = document.getElementById("addApiKeyBtn");

  let currentKeys = [];

  const saveApiKeys = (keys) => {
    const keyStr = keys.filter((k) => k.trim() !== "").join(", ");
    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local
    ) {
      chrome.storage.local.set({ geminiApiKey: keyStr });
    }
  };

  const renderApiKeys = () => {
    apiKeysList.innerHTML = "";
    currentKeys.forEach((key, index) => {
      const row = document.createElement("div");
      row.className = "flex gap-1.5 items-center";
      row.innerHTML = `
                <input type="text" class="flex-1 p-1.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-indigo-500 font-mono text-[10px]" value="${key}" placeholder="AIzaSy..." />
                <button class="w-6 h-6 flex items-center justify-center bg-red-50 text-red-500 hover:text-red-700 rounded hover:bg-red-100 cursor-pointer" title="Xóa">&times;</button>
            `;
      const inp = row.querySelector("input");
      inp.addEventListener("change", (e) => {
        currentKeys[index] = e.target.value.trim();
        saveApiKeys(currentKeys);
      });
      const btn = row.querySelector("button");
      btn.addEventListener("click", () => {
        currentKeys.splice(index, 1);
        saveApiKeys(currentKeys);
        renderApiKeys();
        if (currentKeys.length === 0) addEmptyKeyInput();
      });
      apiKeysList.appendChild(row);
    });
  };

  const addEmptyKeyInput = () => {
    const row = document.createElement("div");
    row.className = "flex gap-1.5 items-center";
    row.innerHTML = `
            <input type="text" class="flex-1 p-1.5 bg-white border border-indigo-300 rounded outline-none focus:border-indigo-500 shadow-inner font-mono text-[10px]" placeholder="Nhập API Key mới..." />
            <button class="w-6 h-6 flex items-center justify-center bg-green-50 text-green-600 hover:text-green-700 rounded hover:bg-green-100 cursor-pointer flex-shrink-0" title="Lưu">✓</button>
        `;
    const inp = row.querySelector("input");
    const btn = row.querySelector("button");

    const saveNewKey = () => {
      const val = inp.value.trim();
      if (val) {
        currentKeys.push(val);
        saveApiKeys(currentKeys);
        renderApiKeys();
      } else if (currentKeys.length > 0) {
        row.remove();
      }
    };

    inp.addEventListener("change", saveNewKey);
    btn.addEventListener("click", saveNewKey);
    apiKeysList.appendChild(row);
    inp.focus();
  };

  addApiKeyBtn.addEventListener("click", () => {
    // Prevent multiple empty inputs
    const emptyInp = apiKeysList.querySelector("input.border-indigo-300");
    if (!emptyInp) {
      addEmptyKeyInput();
    } else {
      emptyInp.focus();
    }
  });

  const loadApiKeys = () => {
    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local
    ) {
      chrome.storage.local.get(["geminiApiKey"], (res) => {
        let keyStr = res.geminiApiKey || "";
        currentKeys = keyStr
          .split(/[\s,]+/)
          .map((k) => k.trim())
          .filter((k) => k !== "");
        renderApiKeys();
        if (currentKeys.length === 0) {
          addEmptyKeyInput();
        }
      });
    } else {
      addEmptyKeyInput();
    }
  };

  const toggleAiSettings = () => {
    if (aiMethodRadio.checked) {
      aiSettingsGroup.style.display = "flex";
      loadApiKeys();
    } else {
      aiSettingsGroup.style.display = "none";
    }
  };

  aiMethodRadio.addEventListener("change", toggleAiSettings);
  templateMethodRadio.addEventListener("change", toggleAiSettings);

  // Initial check
  toggleAiSettings();

  const DEFAULT_KEYS = "";

  const setStatus = (msg, type) => {
    const text = document.getElementById("statusText");
    const dot = document.getElementById("statusDot");
    text.innerText = msg;
    if (type === "error") {
      text.className = "text-[10px] font-bold text-red-500";
      dot.className = "w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse";
    } else if (type === "success") {
      text.className = "text-[10px] font-bold text-green-600";
      dot.className = "w-1.5 h-1.5 rounded-full bg-green-500";
    } else {
      text.className = "text-[10px] font-medium text-slate-400";
      dot.className = "w-1.5 h-1.5 rounded-full bg-slate-300";
    }
  };

  runBtn.addEventListener("click", () => {
    const platform = platformSel.value;
    const role = roleItemSel.value;
    const capHoc = capHocSel.value;
    const khoiLop = khoiLopSel.value;
    const subject = role === "GVBM" ? subjectSel.value : null;
    let method = "template";
    const methodEl = document.querySelector('input[name="method"]:checked');
    if (methodEl) {
      method = methodEl.value;
    }

    if (method === "ai") {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        chrome.storage.local.get(["geminiApiKey"], (res) => {
          let key = res.geminiApiKey;
          if (!key || key.trim() === "") key = DEFAULT_KEYS;
          if (!key || key.trim() === "") {
            setStatus("Vui lòng nhập API Key để dùng AI!", "error");
            return;
          }
          executeLogic({ platform, role, capHoc, khoiLop, subject, method });
        });
      } else {
        executeLogic({ platform, role, capHoc, khoiLop, subject, method });
      }
    } else {
      executeLogic({ platform, role, capHoc, khoiLop, subject, method });
    }
  });

  function executeLogic(config) {
    setStatus("Đang xử lý...", "default");
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && !tabs[0].url.startsWith("chrome://")) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "fillComments",
              config,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                setStatus("Lỗi kết nối. Hãy tải lại trang web!", "error");
              } else if (response && response.success) {
                if (response.count > 0) {
                  setStatus(
                    `Đã điền thành công ${response.count} dòng!`,
                    "success",
                  );
                } else {
                  setStatus("Không tìm thấy ô nhận xét phù hợp!", "error");
                  alert(
                    "Không tìm thấy ô nhận xét phù hợp trên trang. Hãy chắc chắn bạn đã kích hoạt tính năng Nhập nhận xét.",
                  );
                }
              } else {
                const errDesc = response?.error || "Lỗi không xác định";
                setStatus("Mã lỗi: Xem thông báo", "error");
                alert(errDesc.replace("Error: ", ""));
                if (errDesc.includes("Chưa khởi tạo dữ liệu Mẫu")) {
                  openOptions();
                }
              }
            },
          );
        } else {
          setStatus("Không thể chạy tiện ích trên trang này.", "error");
        }
      });
    } else {
      setStatus("Tính năng này chỉ hoạt động khi cài đặt Extension.", "error");
    }
  }
});
