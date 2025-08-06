# 日期選擇器 - 多重日期投票系統

響應式的多重日期選擇器，支援 Google Sheets 數據提交，適用於 GitHub Pages 部署。

## 功能特色

- ✅ **多重日期選擇**：支援選擇多個非連續日期
- ✅ **響應式設計**：水平和垂直居中，適配各種螢幕尺寸
- ✅ **手機友善**：針對移動設備優化的介面
- ✅ **Google Sheets 整合**：自動將投票數據提交到 Google Sheets
- ✅ **Traditional Chinese**：繁體中文介面
- ✅ **表單驗證**：確保數據完整性

## Google Sheets 數據欄位

系統會將以下數據提交到 Google Sheets：

| 欄位名稱 | 說明 | 範例 |
|---------|------|------|
| 投票者姓名 | 填寫表單的使用者姓名 | 張小明 |
| 投票日期 | 選擇的日期 | 2024-01-15 |
| 投票時間 | 提交表單的時間 | 2024-01-10 14:30:25 |
| 有效性狀態 | 投票記錄的狀態 | 有效 |

## 設置說明

### 1. 基本部署

1. Fork 或下載此專案
2. 啟用 GitHub Pages（在 Repository Settings 中）
3. 選擇部署來源為主分支
4. 訪問 `https://你的用戶名.github.io/專案名稱`

### 2. Google Sheets 整合設置

#### 步驟 1：創建 Google Sheets

1. 前往 [Google Sheets](https://sheets.google.com/)
2. 創建新的試算表
3. 複製試算表 URL 中的 ID（例如：`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`）

#### 步驟 2：設置 Google Apps Script

1. 前往 [Google Apps Script](https://script.google.com/)
2. 創建新專案
3. 將下面的代碼複製到編輯器中：

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'submitVotes') {
      // 替換為您的 Google Sheets ID
      const sheet = SpreadsheetApp.openById('您的_SPREADSHEET_ID').getActiveSheet();
      
      // 確保標題行存在
      if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, 4).setValues([['投票者姓名', '投票日期', '投票時間', '有效性狀態']]);
      }
      
      // 添加數據
      data.data.forEach(record => {
        sheet.appendRow([
          record.voterName,
          record.votingDate,
          record.votingTime,
          record.validityStatus
        ]);
      });
      
      return ContentService
        .createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. 將 `您的_SPREADSHEET_ID` 替換為您的實際 Google Sheets ID
5. 儲存專案
6. 點擊「部署」→「新增部署」
7. 選擇類型為「網路應用程式」
8. 執行身分選擇「我」
9. 存取權限選擇「任何人」
10. 點擊「部署」並複製網路應用程式 URL

#### 步驟 3：更新前端配置

1. 開啟 `script.js` 檔案
2. 找到 `SCRIPT_URL` 變數
3. 將 `YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` 替換為您的 Google Apps Script 網路應用程式 URL

```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
```

## 檔案結構

```
├── index.html          # 主頁面（日期選擇器介面）
├── styles.css          # 響應式樣式
├── script.js           # 日期選擇功能和 Google Sheets 整合
├── README.md           # 設置說明文件
└── cmonBruh.ico        # 網站圖示
```

## 使用方式

1. 填寫投票者姓名
2. 使用日期選擇器選擇日期
3. 點擊「新增日期」將日期加入選擇列表
4. 重複步驟 2-3 選擇多個日期
5. 點擊「提交選擇」送出投票

## 功能限制

- 不能選擇過去的日期
- 不能重複選擇相同日期
- 必須填寫姓名才能提交
- 必須選擇至少一個日期才能提交

## 技術規格

- **前端**：純 HTML5、CSS3、JavaScript（ES6+）
- **響應式框架**：自訂 CSS Grid 和 Flexbox
- **API 整合**：Google Apps Script + Google Sheets API
- **部署平台**：GitHub Pages
- **瀏覽器支援**：Chrome 60+、Firefox 60+、Safari 12+、Edge 79+

## 自訂配置

### 修改樣式主題

在 `styles.css` 中修改以下變數來改變主題色彩：

```css
body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.submit-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### 修改表單驗證規則

在 `script.js` 的 `validateForm()` 方法中自訂驗證邏輯。

## 疑難排解

### Google Sheets 無法接收數據

1. 確認 Google Apps Script 權限設置正確
2. 檢查 Google Sheets ID 是否正確
3. 確認網路應用程式 URL 已正確設置在 `script.js` 中

### 在手機上顯示異常

1. 確認 viewport meta 標籤已設置
2. 檢查 CSS 媒體查詢是否正確載入

### 日期選擇器不工作

1. 確認瀏覽器支援 HTML5 date input
2. 檢查 JavaScript 控制台是否有錯誤訊息

## 授權

MIT License - 歡迎自由使用和修改。

## 支援

如有問題，請在 GitHub Issues 中提出。
