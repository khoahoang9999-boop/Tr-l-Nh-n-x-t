chrome.runtime.onInstalled.addListener(() => {
    console.log("Trợ lý Nhận xét Pro Installed!");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateAIComment") {
        handleAIGenerate(request.payload).then(sendResponse).catch(e => {
            console.error("Gemini err", e);
            sendResponse({ error: e.toString() });
        });
        return true; 
    }
});

async function handleAIGenerate({ apiKey, promptTemplate, diem, mon, ten, role }) {
    if (!apiKey) throw new Error("Missing API Key");

    // Replace template vars
    let promptText = promptTemplate || "Bạn là một giáo viên chuyên nghiệp. Nhận xét ngắn gọn, động viên học sinh đạt {diem} điểm môn {mon}. Không quá 12 từ.";
    promptText = promptText.replace(/\{diem\}/g, diem)
                           .replace(/\{mon\}/g, mon || "của bạn")
                           .replace(/\{ten\}/g, ten || "Em");
    
    if (role === 'HOC_BA') {
        promptText += " Đối với nhận xét học bạ, vui lòng tách riêng 3 mặt: Phẩm chất; Năng lực; Hoạt động ngoại khóa. Sử dụng dấu xuống dòng (\\n) hoặc ngắt dòng rõ ràng cho từng mặt.";
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 200,
            }
        })
    });

    if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
    }

    const data = await res.json();
    let result = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean up markdown formatting if exists
    result = result.replace(/\*\*/g, '').replace(/\*/g, '');
    return { text: result.trim() };
}