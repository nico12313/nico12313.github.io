// 日期選擇器功能和 Google Sheets 整合
class DateSelector {
    constructor() {
        this.selectedDates = new Set();
        this.currentDate = new Date();
        this.today = new Date();
        this.today.setHours(0, 0, 0, 0);
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateSelectedDatesDisplay();
        this.initializeMessageContainer(); // 初始化訊息容器
        this.renderCalendar(); // 初始化日曆
    }

    initializeMessageContainer() {
        // 確保訊息容器存在
        let messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) {
            // 如果不存在，創建一個
            messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            messageContainer.className = 'message-container';
            
            // 插入到提交按鈕後面
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.parentNode.insertBefore(messageContainer, submitBtn.nextSibling);
        }
        
        // 初始化空訊息
        this.showMessage('', 'info');
    }

    setupEventListeners() {
        // 添加日期按鈕 (保留但隱藏)
        const addDateBtn = document.getElementById('addDateBtn');
        const dateInput = document.getElementById('dateInput');
        
        if (addDateBtn) {
            addDateBtn.addEventListener('click', () => this.addDate());
        }
        if (dateInput) {
            dateInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addDate();
                }
            });
        }

        // 提交表單
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.addEventListener('click', () => this.submitForm());

        // 表單驗證
        const voterNameInput = document.getElementById('voterName');
        const emailInput = document.getElementById('emailAddress');
        voterNameInput.addEventListener('input', () => this.validateForm());
        // emailInput.addEventListener('input', () => this.validateForm());
    }

    renderCalendar() {
        const container = document.getElementById('calendarContainer');
        if (!container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // 建立日曆 HTML
        const calendarHTML = `
            <div class="calendar-header">
                <button class="calendar-nav-btn" id="prevMonth">‹</button>
                <div class="calendar-month-year">${year}年${month + 1}月</div>
                <button class="calendar-nav-btn" id="nextMonth">›</button>
            </div>
            <div class="calendar-grid">
                ${this.generateCalendarDays()}
            </div>
        `;

        container.innerHTML = calendarHTML;

        // 添加導航事件
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        // 添加日期點擊事件
        container.querySelectorAll('.calendar-day').forEach(dayElement => {
            dayElement.addEventListener('click', (e) => {
                const dateStr = e.target.dataset.date;
                if (dateStr && !e.target.classList.contains('disabled')) {
                    this.addDateFromCalendar(dateStr);
                }
            });
        });
    }

    generateCalendarDays() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 取得當月第一天和最後一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // 取得第一天是星期幾 (0 = 星期日, 1 = 星期一, ...)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let daysHTML = '';
        
        // 添加星期標頭
        const dayHeaders = ['日', '一', '二', '三', '四', '五', '六'];
        dayHeaders.forEach(day => {
            daysHTML += `<div class="calendar-day-header">${day}</div>`;
        });

        // 生成42天 (6週)
        for (let i = 0; i < 42; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            
            const dayNum = currentDay.getDate();
            const isCurrentMonth = currentDay.getMonth() === month;
            const isToday = this.isSameDate(currentDay, this.today);
            const isPast = currentDay < this.today;
            const dateStr = this.formatDateForInput(currentDay);
            const isSelected = this.selectedDates.has(dateStr);
            
            let classes = ['calendar-day'];
            if (!isCurrentMonth) classes.push('other-month');
            if (isToday) classes.push('today');
            if (isPast) classes.push('disabled');
            if (isSelected) classes.push('selected');

            daysHTML += `
                <div class="${classes.join(' ')}" data-date="${dateStr}">
                    ${dayNum}
                </div>
            `;
        }

        return daysHTML;
    }

    addDateFromCalendar(dateStr) {
        // 檢查日期是否已被選擇
        if (this.selectedDates.has(dateStr)) {
            this.showMessage('此日期已被選擇', 'error');
            return;
        }

        // 檢查日期是否為過去的日期
        const selected = new Date(dateStr);
        if (selected < this.today) {
            this.showMessage('不能選擇過去的日期', 'error');
            return;
        }

        // 添加日期到選擇列表
        this.selectedDates.add(dateStr);
        this.updateSelectedDatesDisplay();
        this.renderCalendar(); // 重新渲染以更新選中狀態
        this.validateForm();
        
        this.showMessage('日期添加成功', 'success');
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    addDate() {
        const dateInput = document.getElementById('dateInput');
        const selectedDate = dateInput.value;

        if (!selectedDate) {
            this.showMessage('請選擇一個日期', 'error');
            return;
        }

        // 檢查日期是否已被選擇
        if (this.selectedDates.has(selectedDate)) {
            this.showMessage('此日期已被選擇', 'error');
            return;
        }

        // 檢查日期是否為過去的日期
        const today = new Date();
        const selected = new Date(selectedDate);
        today.setHours(0, 0, 0, 0);
        
        if (selected < today) {
            this.showMessage('不能選擇過去的日期', 'error');
            return;
        }

        // 添加日期到選擇列表
        this.selectedDates.add(selectedDate);
        this.updateSelectedDatesDisplay();
        //留著 input value 方便連續選擇
        //dateInput.value = '';
        this.validateForm();
        
        this.showMessage('日期添加成功', 'success');
    }

    removeDate(date) {
        this.selectedDates.delete(date);
        this.updateSelectedDatesDisplay();
        this.renderCalendar(); // 重新渲染日曆以更新選中狀態
        this.validateForm();
        this.showMessage('日期已移除', 'success');
    }

    updateSelectedDatesDisplay() {
        const container = document.getElementById('selectedDates');
        container.innerHTML = '';

        if (this.selectedDates.size === 0) {
            container.innerHTML = '<p style="color: #718096; font-style: italic;">尚未選擇任何日期</p>';
            return;
        }

        // 將日期排序並顯示
        const sortedDates = Array.from(this.selectedDates).sort();
        sortedDates.forEach(date => {
            const dateTag = document.createElement('div');
            dateTag.className = 'date-tag fade-in';
            
            const formattedDate = this.formatDate(date);
            dateTag.innerHTML = `
                ${formattedDate}
                <button class="remove-btn" onclick="dateSelector.removeDate('${date}')" title="移除此日期">×</button>
            `;
            
            container.appendChild(dateTag);
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[date.getDay()];
        
        return `${year}年${month}月${day}日 (週${weekday})`;
    }

    // email 沒寫就算了
    validateForm() {
        const voterName = document.getElementById('voterName').value.trim();
        const emailAddress = document.getElementById('emailAddress').value.trim();
        const submitBtn = document.getElementById('submitBtn');
        
        // // 驗證電子郵件格式
        // const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // const isEmailValid = emailPattern.test(emailAddress);
        
        // const isValid = voterName.length > 0 && emailAddress.length > 0 && isEmailValid && this.selectedDates.size > 0;
        const isValid = voterName.length > 0 && this.selectedDates.size > 0;
        submitBtn.disabled = !isValid;
        
        // // 顯示電子郵件格式錯誤提示
        // if (emailAddress.length > 0 && !isEmailValid) {
        //     this.showMessage('請輸入有效的電子郵件地址', 'error');
        // }
        
        return isValid;
    }

    async submitForm() {
        if (!this.validateForm()) {
            // this.showMessage('請填寫姓名、有效電子郵件並選擇至少一個日期', 'error');
            this.showMessage('請填寫姓名、並選擇至少一個日期', 'error');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        
        // 顯示載入狀態
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span>提交中...';
        this.showMessage('正在提交中...', 'info');

        try {
            const voterName = document.getElementById('voterName').value.trim();
            const emailAddress = document.getElementById('emailAddress').value.trim();
            const votingTime = new Date().toLocaleString('zh-TW', {
                timeZone: 'Asia/Taipei',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            // 為每個選擇的日期創建一個記錄
            const records = Array.from(this.selectedDates).map(date => ({
                voterName: voterName,
                votingDate: date,
                votingTime: votingTime,
                emailAddress: emailAddress,
                validityStatus: '1'
            }));

            await this.submitToGoogleSheets(records);
            
            this.showMessage('提交成功！感謝您的參與。', 'success');
            this.resetForm();
            
        } catch (error) {
            console.error('提交錯誤:', error);
            this.showMessage('提交失敗，請稍後再試。如問題持續發生，請聯絡系統管理員。', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    async submitToGoogleSheets(records) {
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwHbsuLKmY43dmLaXCnmCXGxf1wOw_IxlWOYF7lsVJBUp9saCKX5pH9M87bz2hMO3EF/exec';
        
        if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            // 開發模式 - 模擬提交
            await this.simulateSubmission(records);
            return;
        }

        // 先嘗試使用 form submission 方法避開 CORS 限制
        try {
            await this.submitViaForm(SCRIPT_URL, records);
            return;
        } catch (formError) {
            console.log('Form submission failed:', formError.message);
            throw new Error('提交失敗：網路連線問題或服務暫時無法使用');
        }
    }

    async submitViaForm(scriptUrl, records) {
        return new Promise(async (resolve, reject) => {
            try {
                // 創建 FormData 對象
                const formData = new FormData();
                
                // 添加數據到 FormData
                formData.append('data', JSON.stringify({
                    action: 'submitVotes',
                    data: records
                }));
    
                // 使用 fetch 發送 POST 請求
                const response = await fetch(scriptUrl, {
                    method: "POST",
                    body: formData,
                });
    
                // 檢查回應狀態
                if (!response.ok) {
                    reject(new Error(`HTTP error! status: ${response.status}`));
                    return;
                }
    
                // 嘗試解析回應（如果 Google Apps Script 返回 JSON）
                let result;
                try {
                    result = await response.json();
                } catch {
                    // 如果不是 JSON，返回文本內容
                    result = await response.text();
                }
    
                resolve({ success: true, data: result });
    
            } catch (error) {
                console.error('表單提交失敗:', error);
                reject(new Error(`表單提交失敗: ${error.message}`));
            }
        });
    }

    async simulateSubmission(records) {
        // 模擬網路延遲
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 在控制台輸出數據（開發用）
        console.log('模擬提交到 Google Sheets:');
        console.log('記錄數量:', records.length);
        records.forEach((record, index) => {
            console.log(`記錄 ${index + 1}:`, {
                姓名: record.voterName,
                電子郵件: record.emailAddress,
                投票日期: record.votingDate,
                投票時間: record.votingTime,
                狀態: record.validityStatus
            });
        });
        
        // 模擬隨機失敗（10% 機率）
        if (Math.random() < 0.1) {
            throw new Error('模擬網路錯誤');
        }
    }

    resetForm() {
        this.selectedDates.clear();
        this.updateSelectedDatesDisplay();
        this.renderCalendar(); // 重新渲染日曆以清除選中狀態
        this.validateForm();
    }

    showMessage(text, type) {
        // 獲取或創建訊息容器
        let messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            messageContainer.className = 'message-container';
            
            // 插入到提交按鈕後面
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.parentNode.insertBefore(messageContainer, submitBtn.nextSibling);
        }

        // 更新訊息內容
        messageContainer.className = `message-container message ${type}`;
        
        if (text.trim() === '') {
            // 空訊息時顯示佔位符
            messageContainer.innerHTML = '<span style="color: #a0aec0; font-style: italic;">準備就緒</span>';
            messageContainer.className = 'message-container message info';
        } else {
            messageContainer.textContent = text;
        }
    }
}

// 初始化日期選擇器
let dateSelector;

function initializeDateSelector() {
    // 檢查是否已經初始化
    if (document.body.classList.contains('app_init')) {
        console.log('DateSelector already initialized, skipping...');
        return;
    }
    
    console.log('Initializing DateSelector...');
    
    // 檢查必要的 DOM 元素是否存在
    const requiredElements = ['addDateBtn', 'dateInput', 'voterName', 'emailAddress', 'submitBtn'];
    const elementsReady = requiredElements.every(id => document.getElementById(id) !== null);
    
    if (!elementsReady) {
        console.log('DOM elements not ready, retrying in 100ms...');
        setTimeout(initializeDateSelector, 100);
        return;
    }
    
    try {
        dateSelector = new DateSelector();
        
        // 設置最小日期為今天
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dateInput').min = today;
        
        // 標記為已初始化
        document.body.classList.add('app_init');
        
        console.log('DateSelector initialized successfully');
    } catch (error) {
        console.error('Error initializing DateSelector:', error);
    }
}

// 多種初始化策略
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDateSelector);
} else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    // DOM 已經載入完成，立即初始化
    initializeDateSelector();
}

// 作為備援，在 window.onload 時也嘗試初始化
window.addEventListener('load', function() {
    if (!window.dateSelector || !document.body.classList.contains('app_init')) {
        console.log('Backup initialization on window.onload');
        initializeDateSelector();
    }
});

// Google Apps Script 配置說明
/*
要啟用 Google Sheets 整合，請按照以下步驟：

1. 前往 https://script.google.com/
2. 創建新專案
3. 複製以下代碼到 Apps Script 編輯器：

function doPost(e) {
  try {
    // 處理 CORS preflight 請求
    if (e.request && e.request.method === 'OPTIONS') {
      return ContentService
        .createTextOutput('')
        .setMimeType(ContentService.MimeType.TEXT)
        .setHeaders({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
    }
    
    // 處理表單數據 (來自隱藏表單提交)
    let data;
    if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      throw new Error('無法解析請求數據');
    }
    
    if (data.action === 'submitVotes') {
      // Google Sheets ID - 請替換為您的實際 Sheets ID
      const sheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID').getActiveSheet();
      
      // 確保標題行存在 (包含新的電子郵件欄位)
      if (sheet.getLastRow() === 0) {
        sheet.getRange(1, 1, 1, 5).setValues([['投票者姓名', '電子郵件地址', '投票日期', '投票時間', '有效性狀態']]);
      }
      
      // 添加數據
      data.data.forEach(record => {
        sheet.appendRow([
          record.voterName,
          record.emailAddress,
          record.votingDate,
          record.votingTime,
          record.validityStatus
        ]);
      });
      
      return ContentService
        .createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
    }
    
  } catch (error) {
    // 錯誤處理和日誌記錄
    try {
      const spreadsheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
      
      // 檢查是否有 'log' 工作表，沒有就新增
      let logSheet;
      try {
        logSheet = spreadsheet.getSheetByName('log');
      } catch (e) {
        logSheet = null;
      }
      
      if (!logSheet) {
        logSheet = spreadsheet.insertSheet('log');
        // 添加標題行
        logSheet.getRange(1, 1, 1, 2).setValues([['錯誤訊息', '時間']]);
      }
      
      // 添加錯誤記錄
      const currentTime = new Date();
      logSheet.appendRow([
        error.toString(),
        currentTime
      ]);
      
    } catch (logError) {
      // 如果日誌記錄也失敗，至少在 Console 中記錄
      console.error('日誌記錄失敗:', logError);
      console.error('原始錯誤:', error);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}

4. 部署為網路應用程式
5. 複製網路應用程式 URL
6. 將 URL 替換到本文件中的 SCRIPT_URL 變數
7. 將您的 Google Sheets ID 替換到 YOUR_SPREADSHEET_ID

Google Sheets ID 可以從試算表 URL 中取得：
https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit

Google Sheets 數據欄位 (更新版本)：
- 投票者姓名：使用者輸入的姓名
- 電子郵件地址：使用者輸入的電子郵件 (新增)
- 投票日期：選擇的日期
- 投票時間：提交表單的時間戳記
- 有效性狀態：固定為「有效」

CORS 解決方案：
此實作使用雙重提交機制：
1. 主要方法：隱藏表單提交 (避開 CORS 限制)
2. 備用方法：Fetch API (如果表單提交失敗)
3. 改進的錯誤處理和用戶反饋
*/
