/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ExternalLink, Monitor, Download, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'options' | 'popup'>('options');
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  return (
    <div className="bg-slate-50 w-full min-h-screen flex flex-col font-sans text-slate-800">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-20 shadow-sm relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-blue-200">
            P
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">Trợ lý Nhận xét Pro</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={() => setActiveTab('options')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'options' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Màn hình Quản lý
            </button>
            <button 
              onClick={() => setActiveTab('popup')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'popup' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Màn hình Popup
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          <a 
            href="/popup.html" target="_blank"
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Mở tab đầy đủ
          </a>
          <button 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 transition-all text-white rounded-md shadow drop-shadow-sm cursor-pointer"
            onClick={() => setShowInstallGuide(true)}
          >
            <Download className="w-4 h-4" /> HD Cài Đặt
          </button>
        </div>
      </header>

      {showInstallGuide && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Hướng Dẫn Cài Đặt</h3>
              <button onClick={() => setShowInstallGuide(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Tiện ích này yêu cầu Build để có thể chạy trên Chrome.</p>
              <ul className="list-decimal pl-5 space-y-2 font-medium text-slate-700">
                <li>Nhấn vào biểu tượng <strong>Cài đặt (hình bánh răng ⚙️)</strong> ở góc trên cùng bên phải.</li>
                <li>Chuyển sang tab <strong>GitHub</strong>. <em>(Nếu hệ thống yêu cầu "Sign in to GitHub", hãy nhấn vào đó, đăng nhập và chọn "Accept new permissions". Sau khi xong, hãy quay lại thẻ này)</em>.</li>
                <li>Lúc này trong tab GitHub, bạn sẽ thấy một đường link màu xanh (ví dụ: <a href="https://github.com/khoahoang9999-boop/Tr-I-Nh-n-x-t" target="_blank" className="text-blue-600 hover:underline">khoahoang9999-boop/Tr-I-Nh-n-x-t</a>). Hãy nhấn vào đường link màu xanh đó.</li>
                <li><strong>Lưu ý:</strong> Nền tảng sẽ tự động đồng bộ mã nguồn lên GitHub sau mỗi lần AI hoàn tất gõ code. Nếu xem trên GitHub chưa thấy code mới, hãy đợi 1 phút và tải lại trang (F5).</li>
                <li>Trang GitHub mã nguồn sẽ mở ra, nhấn vào nút màu xanh lá cây <strong>&lt;&gt; Code</strong> và chọn <strong>Download ZIP</strong> để tải file về máy.</li>
                <li>Giải nén file ZIP vừa tải về.</li>
                <li>Mở terminal (hoặc Command Prompt) tại thư mục vừa giải nén, chạy lệnh <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600">npm install</code></li>
                <li>Sau đó chạy lệnh <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600">npm run build</code></li>
                <li>Mở trình duyệt Chrome, gõ vào thanh địa chỉ: <code>chrome://extensions/</code> và bật <strong>Developer mode (Chế độ dành cho nhà phát triển)</strong> ở góc phải.</li>
                <li>Nhấn vào nút <strong>Load unpacked (Tải tiện ích đã giải nén)</strong> và chọn thư mục <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600">dist</code> nằm bên trong thư mục mã nguồn.</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowInstallGuide(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-sm transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex bg-slate-200/50 p-6 md:p-10 justify-center overflow-auto h-[calc(100vh-64px)] relative">
        <div className="absolute top-4 left-6 max-w-sm text-xs text-slate-500 italic">
          * Đây là môi trường Review. Ứng dụng thực tế là Chrome Extension chạy trên trang csdl.moet.gov.vn | vnedu.vn. CSS của Extension được xử lý qua Vite và render qua Iframe.
        </div>

        {activeTab === 'options' ? (
          <div className="w-full max-w-[1100px] h-fit bg-[#F8FAFC] rounded-xl shadow-2xl shadow-slate-300 overflow-hidden ring-1 ring-slate-200 flex flex-col">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex gap-1.5 items-center">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="ml-4 bg-white px-3 py-1 text-xs text-slate-500 rounded border border-slate-200 flex items-center gap-2 shadow-sm font-mono tracking-widest">
                  <Monitor className="w-3 h-3" /> options.html
                </div>
              </div>
            </div>
            <iframe src="/options.html" className="w-full min-h-[750px] border-0 bg-white" title="Options Preview" />
          </div>
        ) : (
          <div className="w-[360px] h-fit bg-white rounded-[2.5rem] shadow-2xl shadow-slate-400 ring-[8px] ring-slate-900 overflow-hidden relative flex flex-col mt-4">
            <div className="w-24 h-6 bg-slate-900 rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 z-10 hidden sm:block"></div>
            <div className="bg-slate-50 mt-6 px-4 py-2 border-y border-slate-200 flex justify-center text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              popup.html
            </div>
            <div className="w-[320px] mx-auto min-h-[400px] bg-slate-100 flex pb-4">
               <iframe src="/popup.html" className="w-[320px] min-h-[420px] border-0 mx-auto block bg-white shadow py-2" title="Popup Preview" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
