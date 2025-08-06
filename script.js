// 日期選擇器功能和 Google Sheets 整合
class DateSelector {
    constructor() {
        this.selectedDates = new Set();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateSelectedDatesDisplay();
    }

    setupEventListeners() {
        // 添加日期按鈕
        const addDateBtn = document.getElementById('addDateBtn');
        const dateInput = document.getElementById('dateInput');
        
        addDateBtn.addEventListener('click', () => this.addDate());
        dateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addDate();
            }
        });

        // 提交表單
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.addEventListener('click', () => this.submitForm());

        // 表單驗證
        const voterNameInput = document.getElementById('voterName');
        voterNameInput.addEventListener('input', () => this.validateForm());
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

    validateForm() {
        const voterName = document.getElementById('voterName').value.trim();
        const submitBtn = document.getElementById('submitBtn');
        
        const isValid = voterName.length > 0 && this.selectedDates.size > 0;
        submitBtn.disabled = !isValid;
        
        return isValid;
    }

    async submitForm() {
        if (!this.validateForm()) {
            this.showMessage('請填寫姓名並選擇至少一個日期', 'error');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        
        // 顯示載入狀態
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span>提交中...';

        try {
            const voterName = document.getElementById('voterName').value.trim();
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
                validityStatus: '有效'
            }));

            await this.submitToGoogleSheets(records);
            
            this.showMessage('提交成功！感謝您的參與。', 'success');
            this.resetForm();
            
        } catch (error) {
            console.error('提交錯誤:', error);
            this.showMessage('提交失敗，請稍後再試。', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    async submitToGoogleSheets(records) {
        // 這裡需要配置您的 Google Sheets API
        // 由於這是靜態網頁，建議使用 Google Apps Script 作為中介
        
        // 示例配置 - 請替換為您的實際 Google Apps Script URL
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxUj3KL7PPwLHlOT9BYVWK9P7rDH95M6GMgqjss2ynaQJdmGVSkm9L9rUPObuPz1Lox/exec';
        
        if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
            // 開發模式 - 模擬提交
            await this.simulateSubmission(records);
            return;
        }

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
            throw new Error(result.error || '提交失敗');
        }
    }

    async simulateSubmission(records) {
        // 模擬網路延遲
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 在控制台輸出數據（開發用）
        console.log('模擬提交到 Google Sheets:');
        console.log('記錄數量:', records.length);
        records.forEach((record, index) => {
            console.log(`記錄 ${index + 1}:`, record);
        });
        
        // 模擬隨機失敗（10% 機率）
        if (Math.random() < 0.1) {
            throw new Error('模擬網路錯誤');
        }
    }

    resetForm() {
        document.getElementById('voterName').value = '';
        this.selectedDates.clear();
        this.updateSelectedDatesDisplay();
        this.validateForm();
    }

    showMessage(text, type) {
        // 移除現有消息
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 創建新消息
        const message = document.createElement('div');
        message.className = `message ${type} fade-in`;
        message.textContent = text;

        // 插入到提交按鈕後面
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.parentNode.insertBefore(message, submitBtn.nextSibling);

        // 3秒後自動移除成功消息
        if (type === 'success') {
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 3000);
        }
    }
}

// 初始化日期選擇器
let dateSelector;

function initializeDateSelector() {
    console.log('Initializing DateSelector...');
    
    // 檢查必要的 DOM 元素是否存在
    const requiredElements = ['addDateBtn', 'dateInput', 'voterName', 'submitBtn'];
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
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'submitVotes') {
      const sheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID').getActiveSheet();
      
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

4. 部署為網路應用程式
5. 複製網路應用程式 URL
6. 將 URL 替換到本文件中的 SCRIPT_URL 變數
7. 將您的 Google Sheets ID 替換到 YOUR_SPREADSHEET_ID

Google Sheets ID 可以從試算表 URL 中取得：
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
*/
