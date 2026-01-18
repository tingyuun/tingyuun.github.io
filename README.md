# 網站開發與部署文件

## 📁 專案概述

這是一個基於純 HTML/CSS/JavaScript 的靜態網站專案，透過 GitHub Pages 進行部署。

### 技術棧
- **前端框架**: 純 HTML5/CSS3/JavaScript (無打包工具)
- **PWA 支援**: Service Worker + Web App Manifest
- **分析工具**: Google Analytics (G-FCK2EQM41Z)
- **第三方整合**:
  - AddToAny (社交分享)
  - Google Apps Script + Google Sheets (下載計數)
  - FlagCounter (訪客統計)
  - JSZip + FileSaver.js (批量下載)

---

## 🚀 本機開發指南

### 方法一：使用 Python 本機伺服器（推薦）

```bash
# 進入專案目錄
cd tingyuun.github.io

# Python 3.x
python3 -m http.server 8000

# Python 2.x
python -m SimpleHTTPServer 8000
```

然後開啟瀏覽器訪問 `http://localhost:8000`

### 方法二：使用 VS Code Live Server

1. 安裝 **Live Server** 擴充套件
2. 對 `index.html` 右鍵 → 選擇 **"Open with Live Server"**
3. 自動開啟瀏覽器並支援熱重載

### 方法三：使用 Node.js http-server

```bash
# 全域安裝 http-server
npm install -g http-server

# 啟動伺服器
http-server -p 8000

# 支援 HTTPS (測試 Service Worker)
http-server -p 8000 -S -C cert.pem -K key.pem
```

---

## 📦 專案結構

```
tingyuun.github.io/
├── index.html              # 首頁（互動遊戲）
├── about.html              # 個人簡介
├── gallery.html            # 照片集（支援下載）
├── story.html              # 事件記錄
├── faq.html                # 常見問題
├── resources.html          # 資源連結
├── contact.html            # 聯絡表單
├── disclaimer.html         # 免責聲明
├── 404.html                # 錯誤頁面
│
├── css/
│   └── common.css          # 全站共用樣式（已壓縮）
│
├── js/
│   ├── common.js           # 全站共用腳本（已壓縮）
│   └── common_unminified.js # 原始版本
│
├── images/
│   ├── profiles/           # 人物照片 (.png, .jpg, .webp)
│   ├── cum/                # 特效圖片 (.png, .webp)
│   ├── help/               # 輔助圖片
│   ├── favicon.png         # 網站圖標
│   ├── icon-192.png        # PWA 圖標 192x192
│   └── icon-512.png        # PWA 圖標 512x512
│
├── manifest.json           # PWA 配置檔
├── sw.js                   # Service Worker (快取策略)
├── robots.txt              # 搜尋引擎爬蟲規則
├── sitemap.xml             # 網站地圖索引
├── page-sitemap.xml        # 頁面地圖
├── image-sitemap.xml       # 圖片地圖
│
└── README.md               # 本文件
```

---

## 🛠️ 關鍵功能說明

### 1. PWA (漸進式 Web 應用)

**檔案**: `manifest.json`, `sw.js`

- ✅ 支援「加入主畫面」
- ✅ 離線快取（核心頁面 + 圖片）
- ✅ 快取版本管理 (`v1.1.0`)

**Service Worker 策略**:
- HTML/CSS/JS: **Cache First** (優先使用快取)
- 圖片: **Cache First** with Network Fallback
- API 請求: **Network Only**（第三方請求不快取，避免統計被快取污染）

### 2. 圖片格式優化

專案同時提供多種圖片格式以最佳化載入：
- `.webp` - 現代瀏覽器優先（檔案最小）
- `.png` - 備用格式（相容性最佳）
- `.jpg` - 特定照片使用

### 3. SEO 優化

每個頁面都包含：
- ✅ 完整 Meta 標籤 (title, description, keywords)
- ✅ Open Graph (Facebook/LINE 分享)
- ✅ Twitter Card (Twitter 分享)
- ✅ JSON-LD 結構化資料 (Schema.org)
- ✅ Canonical URL (避免重複索引)
- ✅ Sitemap (page + image)
- ✅ robots.txt (爬蟲規則)

### 4. 下載功能 (gallery.html)

**使用技術**: JSZip + FileSaver.js

```javascript
// 批量下載所有照片為 ZIP
function downloadAll() {
  const zip = new JSZip();
  // 添加所有圖片到 ZIP
  // 追蹤下載次數（由 gallery.html 透過 Apps Script 計數）
  // 產生並下載 ZIP 檔案
}
```

### 5. 分析與追蹤

- **Google Analytics 4**: 頁面瀏覽、事件追蹤
- **捲動深度追蹤**: 25%, 50%, 75%, 100%
- **下載計數**: Google Apps Script + Google Sheets（需 Web App 設為「任何人」可存取）
- **訪客統計**: FlagCounter

---

## 🌐 GitHub Pages 部署

### 自動部署流程

1. **推送代碼到 GitHub**
```bash
git add .
git commit -m "Update website"
git push origin main
```

2. **GitHub Pages 自動部署**
- 偵測分支: `main` (根目錄)
- 部署網址: `https://<username>.github.io/`
- 延遲時間: 通常 1-3 分鐘

### 驗證部署狀態

- 前往 GitHub Repo → **Settings** → **Pages**
- 查看 "Your site is live at..." 訊息
- 點擊連結確認網站正常運作

### 部署檢查清單

- [ ] 所有圖片路徑使用相對路徑 (`images/...`)
- [ ] Service Worker 版本已更新 (`CACHE_VERSION`)
- [ ] Sitemap 日期已更新 (`<lastmod>`)
- [ ] 測試所有頁面連結是否正常
- [ ] 確認 PWA 可以正常安裝
- [ ] 驗證 Google Analytics 是否追蹤成功

---

## 🐛 已知問題與解決方案

### 問題 1: Service Worker 快取更新不及時

**原因**: 瀏覽器持續使用舊版 Service Worker

**解決方案**:
```javascript
// sw.js 中更新版本號
const CACHE_VERSION = 'v1.2.0'; // 遞增版本號

// 或在瀏覽器 DevTools 中強制更新
// Application → Service Workers → Update / Unregister
```

### 問題 2: 圖片 404 錯誤

**原因**: HTML 中引用的檔名與實際檔案不符

**檢查方法**:
```bash
# 查看實際圖片檔案
ls -la images/profiles/
ls -la images/cum/

# 搜尋 HTML 中的圖片引用
grep -r "\.jpg\|\.png\|\.webp" *.html
```

### 問題 3: CSP 阻擋第三方資源

**症狀**: 控制台出現 "Refused to load..." 錯誤

**解決方案**: 在 `<head>` 中更新 CSP 政策
```html
<meta http-equiv="Content-Security-Policy" content="
  script-src 'self' 'unsafe-inline' 
    https://www.googletagmanager.com 
    https://static.addtoany.com 
    https://cdnjs.cloudflare.com;
  connect-src 'self' 
    https://www.google-analytics.com
    https://s7.addtoany.com
    https://script.google.com
    https://script.googleusercontent.com;
">
```

### 問題 4: 手機版選單無法關閉

**原因**: JavaScript 載入失敗或衝突

**檢查方法**:
1. 開啟瀏覽器 DevTools → Console
2. 檢查是否有 JavaScript 錯誤
3. 確認 `js/common.js` 正常載入

---

## 📊 效能優化建議

### 1. 圖片優化
```bash
# 使用 WebP 格式減少檔案大小
# macOS 使用 cwebp
brew install webp
cwebp -q 80 input.jpg -o output.webp

# 批次轉換
for file in images/profiles/*.jpg; do
  cwebp -q 80 "$file" -o "${file%.jpg}.webp"
done
```

### 2. CSS/JS 壓縮

目前 `common.css` 和 `common.js` 已經過壓縮，若需要修改：

```bash
# 安裝壓縮工具
npm install -g csso-cli uglify-js

# 壓縮 CSS
csso css/common_source.css -o css/common.css

# 壓縮 JS
uglifyjs js/common_unminified.js -o js/common.js -c -m
```

### 3. 啟用 HTTP/2 推送

在 GitHub Pages 中自動啟用，無需額外配置。

### 4. DNS Prefetch

已在 `<head>` 中配置：
```html
<link rel="dns-prefetch" href="https://www.googletagmanager.com">
<link rel="preconnect" href="https://www.google-analytics.com" crossorigin>
```

---

## 🔒 安全性注意事項

### CSP (Content Security Policy)
- ✅ 禁止內嵌框架 (`frame-src 'none'`)
- ✅ 限制資源來源 (`default-src 'self'`)
- ⚠️ 允許 `unsafe-inline` (互動功能需要)

### 資料保護
- ✅ 無後端資料庫（純靜態）
- ✅ 無使用者資料收集（除 Google Analytics）
- ✅ HTTPS 強制加密（GitHub Pages 預設）

---

## 📝 更新日誌

### 2026-01-18 (Latest)
- ✅ 修正 Service Worker 中 `cum_9.webp` 路徑錯誤
- ✅ 移除所有 Google Search Console 佔位符
- ✅ 更新下載計數：改用 Google Apps Script + Sheets（避免假數字）
- ✅ 新增完整 README 開發文件

### 2025-11-17
- ✅ 修復 4 個 HTML 檔案損壞問題
- ✅ 統一導覽列為 7 個標準連結
- ✅ 整合 AddToAny 社交分享 (6 個頁面)
- ✅ 部署 FlagCounter 訪客統計 (8 個頁面)
- ✅ 驗證下載功能正常運作

---

## 🤝 貢獻指南

### 回報問題
1. 前往 GitHub Issues
2. 描述問題詳情（截圖 + 瀏覽器版本）
3. 提供重現步驟

### 提交修改
```bash
# Fork 專案
git clone https://github.com/<your-username>/tingyuun.github.io.git

# 建立新分支
git checkout -b feature/your-feature-name

# 提交變更
git commit -m "Add: your feature description"

# 推送到 GitHub
git push origin feature/your-feature-name

# 建立 Pull Request
```

---

## 📧 聯絡方式

- **網站**: https://tingyuun.github.io/
- **聯絡頁面**: https://tingyuun.github.io/contact.html
- **GitHub Issues**: [回報問題](https://github.com/tingyuun/tingyuun.github.io/issues)

---

## 📄 授權條款

詳見 [disclaimer.html](https://tingyuun.github.io/disclaimer.html)

---

**最後更新**: 2026-01-18  
**文件版本**: v1.0.0
