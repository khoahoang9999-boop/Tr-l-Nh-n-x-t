import { generateAllSampleData } from "./shared.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize sample data if it doesn't exist
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["commentsData"], (result) => {
      if (
        !result.commentsData ||
        Object.keys(result.commentsData).length === 0 ||
        !result.commentsData.THCS ||
        Object.keys(result.commentsData.THCS).length === 0
      ) {
        chrome.storage.local.set({ commentsData: generateAllSampleData() });
      }
    });
  }

  const optionsBtn = document.getElementById("optionsBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const runBtn = document.getElementById("runBtn");

  const openOptions = (tabParam = null) => {
    let url =
      typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL("options.html")
        : "/options.html";
    if (typeof tabParam === "string" && typeof tabParam !== 'object') url += `?tab=${tabParam}`;
    window.open(url);
  };

  if (optionsBtn) optionsBtn.addEventListener("click", openOptions);
  if (settingsBtn) settingsBtn.addEventListener("click", openOptions);

  const setStatus = (msg, type) => {
    const area = document.getElementById("statusArea");
    const text = document.getElementById("statusText");
    const dot = document.getElementById("statusDot");
    if (!area) return;
    
    area.classList.remove("hidden");
    text.innerText = msg;
    if (type === "error") {
      text.className = "text-[11px] font-bold text-red-500";
      dot.className = "w-2 h-2 rounded-full bg-red-500 animate-pulse";
    } else if (type === "success") {
      text.className = "text-[11px] font-bold text-green-600";
      dot.className = "w-2 h-2 rounded-full bg-green-500";
    } else {
      text.className = "text-[11px] font-medium text-slate-500";
      dot.className = "w-2 h-2 rounded-full bg-slate-300";
    }
  };

  if (runBtn) {
    runBtn.addEventListener("click", () => {
      const method = "template";
      executeLogic({ method });
    });
  }

  function executeLogic(config) {
    setStatus("Đang quét trang và xử lý dữ liệu...", "default");
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
                setStatus("Lỗi kết nối. Hãy đảm bảo bạn đang ở đúng trang web tra điểm!", "error");
              } else if (response && response.success) {
                if (response.count > 0) {
                  setStatus(
                    `Đã điền thành công ${response.count} dòng! Môn: ${response.detectedMon || '?'}`,
                    "success"
                  );
                } else {
                  setStatus("Không tìm thấy ô nhập nhận xét phù hợp trên trang!", "error");
                }
              } else {
                const errDesc = response?.error || "Lỗi không xác định";
                setStatus(errDesc.replace("Error: ", ""), "error");
              }
            }
          );
        } else {
          setStatus("Không thể chạy tự động trên trang web này.", "error");
        }
      });
    } else {
      setStatus("Chỉ hoạt động khi chạy như Extension thật.", "error");
      
      // MOCK for Web Env
      setTimeout(() => {
        setStatus("Chế độ Demo Web: Đã mô phỏng điền 40 dòng thành công!", "success");
      }, 1000);
    }
  }
});
