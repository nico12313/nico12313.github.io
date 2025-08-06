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
        this.initializeMessageContainer();
        this.renderCalendar();
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
        // Calendar navigation
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');
        
        prevMonthBtn.addEventListener('click', () => this.previousMonth());
        nextMonthBtn.addEventListener('click', () => this.nextMonth());

        // 提交表單
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.addEventListener('click', () => this.submitForm());

        // 表單驗證
        const voterNameInput = document.getElementById('voterName');
        const emailInput = document.getElementById('emailAddress');
        voterNameInput.addEventListener('input', () => this.validateForm());
        // emailInput.addEventListener('input', () => this.validateForm());
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    renderCalendar() {
        const currentMonthSpan = document.getElementById('currentMonth');
        const calendarDatesContainer = document.getElementById('calendarDates');
        
        // Set month/year header
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                           '七月', '八月', '九月', '十月', '十一月', '十二月'];
        currentMonthSpan.textContent = `${year}年 ${monthNames[month]}`;
        
        // Clear previous dates
        calendarDatesContainer.innerHTML = '';
        
        // Get first day of the month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-date other-month';
            const prevMonthDate = new Date(year, month, -startingDayOfWeek + i + 1);
            emptyCell.textContent = prevMonthDate.getDate();
            calendarDatesContainer.appendChild(emptyCell);
        }
        
        // Add days of the current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateCell = document.createElement('div');
            dateCell.className = 'calendar-date';
            dateCell.textContent = day;
            
            const cellDate = new Date(year, month, day);
            const dateString = this.formatDateString(cellDate);
            
            // Add classes based on date status
            if (this.isSameDay(cellDate, this.today)) {
                dateCell.classList.add('today');
            }
            
            if (cellDate < this.today) {
                dateCell.classList.add('past-date');
            } else {
                // Only add click listener for future dates
                dateCell.addEventListener('click', () => this.toggleDate(dateString));
                
                if (this.selectedDates.has(dateString)) {
                    dateCell.classList.add('selected');
                }
            }
            
            calendarDatesContainer.appendChild(dateCell);
        }
        
        // Add remaining days to fill the calendar grid
        const totalCells = calendarDatesContainer.children.length;
        const remainingCells = 42 - totalCells; // 6 rows × 7 days = 42 cells
        
        for (let i = 1; i <= remainingCells && totalCells + i <= 42; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-date other-month';
            emptyCell.textContent = i;
            calendarDatesContainer.appendChild(emptyCell);
        }
    }

    toggleDate(dateString) {
        if (this.selectedDates.has(dateString)) {
            this.removeDate(dateString);
        } else {
            this.addDateToSelection(dateString);
        }
    }

    addDateToSelection(dateString) {
        // Check if date is in the past
        const selectedDate = new Date(dateString);
        if (selectedDate < this.today) {
            this.showMessage('不能選擇過去的日期', 'error');
            return;
        }

        // Add date to selection
        this.selectedDates.add(dateString);
        this.updateSelectedDatesDisplay();
        this.validateForm();
        this.renderCalendar(); // Re-render to update visual state
        
        this.showMessage('日期添加成功', 'success');
    }

    formatDateString(date) {
        return date.toISOString().split('T')[0];
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    removeDate(date) {
        this.selectedDates.delete(date);
        this.updateSelectedDatesDisplay();
        this.validateForm();
        this.renderCalendar(); // Re-render to update visual state
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
            console.log('Form submission failed, trying fetch as fallback:', formError.message);
            
            // 如果 form submission 失敗，嘗試使用 fetch 作為備用方案
            try {
                await this.submitViaFetch(SCRIPT_URL, records);
                return;
            } catch (fetchError) {
                console.error('Both submission methods failed:', {
                    formError: formError.message,
                    fetchError: fetchError.message
                });
                throw new Error('提交失敗：網路連線問題或服務暫時無法使用');
            }
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

    async submitViaFetch(scriptUrl, records) {
        const response = await fetch(scriptUrl, {
            redirect: "follow",
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'submitVotes',
                data: records
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Fetch 提交失敗');
        }
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
        document.getElementById('voterName').value = '';
        document.getElementById('emailAddress').value = '';
        this.selectedDates.clear();
        this.updateSelectedDatesDisplay();
        this.validateForm();
        this.renderCalendar(); // Re-render calendar to update visual state
        this.showMessage('表單已重置', 'info');
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
    console.log('Initializing DateSelector...');
    
    // 檢查必要的 DOM 元素是否存在
    const requiredElements = ['prevMonth', 'nextMonth', 'voterName', 'emailAddress', 'submitBtn'];
    const elementsReady = requiredElements.every(id => document.getElementById(id) !== null);
    
    if (!elementsReady) {
        console.log('DOM elements not ready, retrying in 100ms...');
        setTimeout(initializeDateSelector, 100);
        return;
    }
    
    try {
        dateSelector = new DateSelector();
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
    if (!window.dateSelector) {
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
