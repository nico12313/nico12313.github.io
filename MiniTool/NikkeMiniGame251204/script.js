/**
 * Nikke 小遊戲解析器 - 通關步驟產生器
 * 
 * 功能：
 * 1. 上傳遊戲截圖並使用 OCR 辨識數字格子
 * 2. 生成數值矩陣和二元陣列
 * 3. 計算和為 10 的矩形區域組合
 * 4. 產生通關步驟文字指示
 */

// 可配置的常數
const CONFIG = {
    // 預設網格大小
    DEFAULT_GRID_ROWS: 6,
    DEFAULT_GRID_COLS: 6,
    
    // 支援的網格尺寸（寬 × 高）
    SUPPORTED_SIZES: [
        { cols: 8, rows: 14 },
        { cols: 9, rows: 15 },
        { cols: 10, rows: 16 }
    ],
    
    // 圖像處理參數
    GRID_SIZE_RATIO: 0.7,           // 網格佔畫面的比例 (70%)
    DARK_PIXEL_BRIGHTNESS: 50,       // 暗色像素亮度閾值
    EMPTY_CELL_THRESHOLD: 0.8,       // 空格判定閾值 (80% 暗色像素)
    MIN_CELL_SIZE: 20,               // 最小格子大小 (像素)
    
    // 視覺化參數
    MAX_CANVAS_HEIGHT: 800,          // Canvas 最大高度限制 (像素)
    MAX_CELL_SIZE: 50,               // 格子最大尺寸 (像素)
    
    // 演算法參數
    MAX_GREEDY_STEPS: 100,           // 貪心策略最大步數
    BACKTRACK_MAX_DEPTH: 50,         // 回溯演算法最大深度
    BACKTRACK_BRANCH_LIMIT: 10,      // 回溯演算法分支限制
    
    // 遊戲規則
    TARGET_SUM: 10                   // 目標數字和
};

class NikkeSolver {
    constructor() {
        this.imageData = null;
        this.valueMatrix = [];
        this.binaryMatrix = [];
        this.gridRows = 0;
        this.gridCols = 0;
        this.steps = [];
        this.currentStrategy = 'greedy';
        this.currentStepIndex = 0;
        this.originalImage = null;
        this.currentMode = 'manual'; // 'image' or 'manual' - default to manual
        this.selectedSize = 'auto'; // 'auto', '8x14', '9x15', '10x16'
        this.parsedManualArray = null;
        this.needsTranspose = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupModeToggle();
        this.setupManualInput();
    }

    // Toast notification helper using SweetAlert2
    showToast(message, type = 'info') {
        // Fallback to console if SweetAlert2 is not loaded
        if (typeof Swal === 'undefined') {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }

        const iconMap = {
            success: 'success',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
            }
        });

        Toast.fire({
            icon: iconMap[type] || 'info',
            title: message
        });
    }

    setupEventListeners() {
        // 上傳區域事件
        const uploadArea = document.getElementById('uploadArea');
        const imageInput = document.getElementById('imageInput');
        const analyzeBtn = document.getElementById('analyzeBtn');

        uploadArea.addEventListener('click', () => imageInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0]);
            }
        });

        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        analyzeBtn.addEventListener('click', () => this.analyzeImage());

        // 重新計算按鈕
        document.getElementById('recalculateBtn').addEventListener('click', () => {
            this.recalculateFromEditableMatrix();
        });

        // 策略切換
        document.querySelectorAll('.strategy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.strategy-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentStrategy = e.target.dataset.strategy;
                this.calculateSteps();
            });
        });

        // 步驟導航
        document.getElementById('prevStepBtn').addEventListener('click', () => this.navigateStep(-1));
        document.getElementById('nextStepBtn').addEventListener('click', () => this.navigateStep(1));

        // 下載按鈕
        document.getElementById('downloadJSON').addEventListener('click', () => this.downloadJSON());
        document.getElementById('downloadText').addEventListener('click', () => this.downloadText());

        // 尺寸選擇
        document.getElementById('gridSizeSelect').addEventListener('change', (e) => {
            this.selectedSize = e.target.value;
            if (this.currentMode === 'manual') {
                this.validateManualInput();
            }
        });
    }

    setupModeToggle() {
        const imageModeBtn = document.getElementById('imageModeBtn');
        const manualModeBtn = document.getElementById('manualModeBtn');
        const uploadSection = document.getElementById('uploadSection');
        const manualSection = document.getElementById('manualSection');

        imageModeBtn.addEventListener('click', () => {
            this.currentMode = 'image';
            imageModeBtn.classList.add('active');
            manualModeBtn.classList.remove('active');
            uploadSection.style.display = 'block';
            manualSection.style.display = 'none';
        });

        manualModeBtn.addEventListener('click', () => {
            this.currentMode = 'manual';
            manualModeBtn.classList.add('active');
            imageModeBtn.classList.remove('active');
            uploadSection.style.display = 'none';
            manualSection.style.display = 'block';
        });
    }

    setupManualInput() {
        const manualInput = document.getElementById('manualInput');
        const parseBtn = document.getElementById('parseManualBtn');
        const transposeBtn = document.getElementById('transposeBtn');

        manualInput.addEventListener('input', () => this.validateManualInput());
        parseBtn.addEventListener('click', () => this.parseManualArray());
        transposeBtn.addEventListener('click', () => this.transposeArray());
    }

    validateManualInput() {
        const input = document.getElementById('manualInput').value.trim();
        const infoDiv = document.getElementById('manualInputInfo');
        const parseBtn = document.getElementById('parseManualBtn');
        const transposePrompt = document.getElementById('transposePrompt');

        if (!input) {
            infoDiv.textContent = '';
            infoDiv.className = 'manual-info';
            parseBtn.disabled = true;
            transposePrompt.style.display = 'none';
            this.parsedManualArray = null;
            return;
        }

        try {
            // 嘗試解析 JSON
            const parsed = JSON.parse(input);

            // 驗證是否為二維陣列
            if (!Array.isArray(parsed) || parsed.length === 0) {
                throw new Error('請輸入有效的二維陣列');
            }

            if (!parsed.every(row => Array.isArray(row))) {
                throw new Error('每一行必須是陣列');
            }

            // 驗證每行長度一致
            const colCount = parsed[0].length;
            if (!parsed.every(row => row.length === colCount)) {
                throw new Error('每一行的元素數量必須一致');
            }

            // 驗證數值範圍 (0-9)
            for (let r = 0; r < parsed.length; r++) {
                for (let c = 0; c < parsed[r].length; c++) {
                    const val = parsed[r][c];
                    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 9) {
                        throw new Error(`格子數值必須為 0-9 的整數（發現無效值 "${val}" 在第 ${r + 1} 行第 ${c + 1} 列）`);
                    }
                }
            }

            const rows = parsed.length;
            const cols = colCount;

            this.parsedManualArray = parsed;
            
            // 判斷尺寸是否需要轉置
            const dimensionInfo = this.analyzeDimensions(rows, cols);
            
            if (dimensionInfo.needsTranspose) {
                this.needsTranspose = true;
                infoDiv.innerHTML = `✅ 格式正確！偵測到尺寸：<strong>${cols} × ${rows}</strong>（寬 × 高）`;
                infoDiv.className = 'manual-info warning';
                transposePrompt.style.display = 'flex';
                document.getElementById('currentDimension').textContent = `${cols} × ${rows}`;
            } else {
                this.needsTranspose = false;
                infoDiv.innerHTML = `✅ 格式正確！尺寸：<strong>${cols} × ${rows}</strong>（寬 × 高，共 ${rows} 行 ${cols} 列）`;
                infoDiv.className = 'manual-info success';
                transposePrompt.style.display = 'none';
            }

            parseBtn.disabled = false;

        } catch (error) {
            if (error instanceof SyntaxError) {
                infoDiv.textContent = '❌ JSON 格式錯誤，請確認陣列格式正確';
            } else {
                infoDiv.textContent = '❌ ' + error.message;
            }
            infoDiv.className = 'manual-info error';
            parseBtn.disabled = true;
            transposePrompt.style.display = 'none';
            this.parsedManualArray = null;
        }
    }

    analyzeDimensions(rows, cols) {
        // 支援的尺寸：8x14, 9x15, 10x16（寬×高）
        // 正確格式：rows（行數）應該是高度，cols（列數）應該是寬度
        // 例如：10x16 表示 10 列寬 × 16 行高，所以正確的陣列應該是 16 rows × 10 cols

        const selectedSize = this.selectedSize;

        if (selectedSize !== 'auto') {
            // 使用者指定了尺寸
            const [expectedCols, expectedRows] = selectedSize.split('x').map(Number);
            
            // 檢查是否匹配
            if (rows === expectedRows && cols === expectedCols) {
                return { valid: true, needsTranspose: false };
            } else if (rows === expectedCols && cols === expectedRows) {
                return { valid: true, needsTranspose: true };
            }
            return { valid: false, needsTranspose: false };
        }

        // 自動判斷模式
        for (const size of CONFIG.SUPPORTED_SIZES) {
            // 正確方向：rows = height, cols = width
            if (rows === size.rows && cols === size.cols) {
                return { valid: true, needsTranspose: false };
            }
            // 需要轉置：rows 和 cols 對調
            if (rows === size.cols && cols === size.rows) {
                return { valid: true, needsTranspose: true };
            }
        }

        // 未匹配任何預設尺寸，但格式正確，不需轉置
        return { valid: true, needsTranspose: false };
    }

    transposeArray() {
        if (!this.parsedManualArray) return;

        const original = this.parsedManualArray;
        const rows = original.length;
        const cols = original[0].length;

        // 轉置陣列
        const transposed = [];
        for (let c = 0; c < cols; c++) {
            const newRow = [];
            for (let r = 0; r < rows; r++) {
                newRow.push(original[r][c]);
            }
            transposed.push(newRow);
        }

        // 更新輸入框
        document.getElementById('manualInput').value = JSON.stringify(transposed);
        
        // 重新驗證
        this.validateManualInput();
    }

    parseManualArray() {
        if (!this.parsedManualArray) {
            this.showToast('請先輸入有效的二維陣列', 'warning');
            return;
        }

        // 設定矩陣資料
        this.valueMatrix = this.parsedManualArray.map(row => 
            row.map(val => (val >= 0 && val <= 9) ? val : null)
        );
        
        this.gridRows = this.valueMatrix.length;
        this.gridCols = this.valueMatrix[0].length;

        // 生成二元陣列
        this.binaryMatrix = this.valueMatrix.map(row => 
            row.map(val => val !== null ? 1 : 0)
        );

        // 顯示結果
        this.displayResults();
        
        // 計算通關步驟
        this.calculateSteps();
        
        // 顯示結果區域
        document.getElementById('resultSection').style.display = 'block';

        // 顯示成功訊息
        this.showToast(`成功解析 ${this.gridCols} × ${this.gridRows} 陣列！`, 'success');

        // 滾動到視覺化路徑區域
        setTimeout(() => {
            document.getElementById('visualizationContainer').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    handleImageUpload(file) {
        if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
            this.showToast('請上傳 PNG 或 JPG 格式的圖片', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImage = document.getElementById('previewImage');
            const uploadPlaceholder = document.getElementById('uploadPlaceholder');
            
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
            
            this.originalImage = new Image();
            this.originalImage.src = e.target.result;
            this.originalImage.onload = () => {
                document.getElementById('analyzeBtn').disabled = false;
            };
        };
        reader.readAsDataURL(file);
    }

    async analyzeImage() {
        if (!this.originalImage) {
            this.showToast('請先上傳圖片', 'warning');
            return;
        }

        this.showLoading(true);
        this.updateProgress(0, '正在初始化 OCR 引擎...');

        try {
            // 使用 Tesseract.js 進行 OCR
            const result = await this.performOCR(this.originalImage);
            
            // 解析格子位置和數字
            this.updateProgress(70, '正在解析格子...');
            await this.parseGridFromImage(this.originalImage);
            
            // 顯示結果
            this.updateProgress(90, '正在生成結果...');
            this.displayResults();
            
            // 計算通關步驟
            this.calculateSteps();
            
            this.updateProgress(100, '完成！');
            
            setTimeout(() => {
                this.showLoading(false);
                document.getElementById('resultSection').style.display = 'block';
            }, 500);
            
        } catch (error) {
            console.error('分析錯誤:', error);
            this.showToast('分析過程發生錯誤，請確認圖片格式正確或嘗試其他截圖', 'error');
            this.showLoading(false);
        }
    }

    async performOCR(image) {
        return new Promise(async (resolve, reject) => {
            try {
                const { createWorker } = Tesseract;
                const worker = await createWorker('eng', 1, {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 60);
                            this.updateProgress(10 + progress, '正在辨識數字...');
                        }
                    }
                });
                
                const { data } = await worker.recognize(image.src);
                await worker.terminate();
                
                resolve(data);
            } catch (error) {
                reject(error);
            }
        });
    }

    async parseGridFromImage(image) {
        // 創建 canvas 進行圖像分析
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 嘗試自動偵測網格
        const gridInfo = this.detectGrid(imageData, canvas.width, canvas.height);
        
        if (gridInfo) {
            this.gridRows = gridInfo.rows;
            this.gridCols = gridInfo.cols;
            this.valueMatrix = await this.extractNumbers(ctx, gridInfo);
        } else {
            // 如果無法自動偵測，使用預設網格大小
            this.gridRows = CONFIG.DEFAULT_GRID_ROWS;
            this.gridCols = CONFIG.DEFAULT_GRID_COLS;
            this.valueMatrix = await this.extractNumbersDefault(ctx, canvas.width, canvas.height);
        }
        
        // 生成二元陣列
        this.binaryMatrix = this.valueMatrix.map(row => 
            row.map(val => val !== null && val >= 0 ? 1 : 0)
        );
    }

    detectGrid(imageData, width, height) {
        // 簡化的網格偵測 - 假設遊戲畫面中心有一個正方形網格區域
        // 實際應用中可以使用更複雜的邊緣偵測算法
        
        // 預設假設網格在畫面中心，佔約 60-80% 的寬度
        const estimatedGridSize = Math.min(width, height) * CONFIG.GRID_SIZE_RATIO;
        const cellSize = estimatedGridSize / CONFIG.DEFAULT_GRID_COLS;
        
        if (cellSize < CONFIG.MIN_CELL_SIZE) {
            return null; // 圖片太小，無法準確偵測
        }
        
        return {
            rows: CONFIG.DEFAULT_GRID_ROWS,
            cols: CONFIG.DEFAULT_GRID_COLS,
            startX: (width - estimatedGridSize) / 2,
            startY: (height - estimatedGridSize) / 2,
            cellWidth: cellSize,
            cellHeight: cellSize
        };
    }

    async extractNumbers(ctx, gridInfo) {
        const matrix = [];
        const { rows, cols, startX, startY, cellWidth, cellHeight } = gridInfo;
        
        for (let row = 0; row < rows; row++) {
            const rowData = [];
            for (let col = 0; col < cols; col++) {
                const x = startX + col * cellWidth;
                const y = startY + row * cellHeight;
                
                // 取得單元格的圖像數據
                const cellCanvas = document.createElement('canvas');
                const cellCtx = cellCanvas.getContext('2d');
                cellCanvas.width = cellWidth;
                cellCanvas.height = cellHeight;
                
                cellCtx.drawImage(
                    ctx.canvas,
                    x, y, cellWidth, cellHeight,
                    0, 0, cellWidth, cellHeight
                );
                
                // 分析單元格是否為空（基於顏色分析）
                const cellImageData = cellCtx.getImageData(0, 0, cellWidth, cellHeight);
                const isEmpty = this.isCellEmpty(cellImageData);
                
                if (isEmpty) {
                    rowData.push(null);
                } else {
                    // 使用 OCR 辨識數字，如果失敗則使用隨機數字模擬
                    const number = await this.recognizeCellNumber(cellCanvas);
                    rowData.push(number);
                }
            }
            matrix.push(rowData);
        }
        
        return matrix;
    }

    async extractNumbersDefault(ctx, width, height) {
        // 當無法準確偵測網格時，使用預設網格大小
        const gridSize = Math.min(width, height) * CONFIG.GRID_SIZE_RATIO;
        const cellSize = gridSize / CONFIG.DEFAULT_GRID_COLS;
        const startX = (width - gridSize) / 2;
        const startY = (height - gridSize) / 2;
        
        return this.extractNumbers(ctx, {
            rows: CONFIG.DEFAULT_GRID_ROWS,
            cols: CONFIG.DEFAULT_GRID_COLS,
            startX,
            startY,
            cellWidth: cellSize,
            cellHeight: cellSize
        });
    }

    isCellEmpty(imageData) {
        const data = imageData.data;
        let darkPixels = 0;
        let totalPixels = data.length / 4;
        
        // 計算暗色像素的比例
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            
            if (brightness < CONFIG.DARK_PIXEL_BRIGHTNESS) {
                darkPixels++;
            }
        }
        
        // 如果超過閾值比例是暗色像素，認為是空格
        return (darkPixels / totalPixels) > CONFIG.EMPTY_CELL_THRESHOLD;
    }

    async recognizeCellNumber(cellCanvas) {
        try {
            // 對單元格進行 OCR
            const { createWorker } = Tesseract;
            const worker = await createWorker('eng');
            
            // 設置 OCR 只識別數字
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789'
            });
            
            const { data } = await worker.recognize(cellCanvas.toDataURL());
            await worker.terminate();
            
            const text = data.text.trim();
            const number = parseInt(text, 10);
            
            if (!isNaN(number) && number >= 0 && number <= 9) {
                return number;
            }
            
            // 如果 OCR 無法識別，返回 null 讓用戶手動修正
            return null;
            
        } catch {
            // OCR 失敗時返回 null，讓用戶手動修正
            return null;
        }
    }

    displayResults() {
        // 顯示數值矩陣
        this.renderMatrix('valueMatrix', this.valueMatrix, false);
        
        // 顯示矩陣信息
        document.getElementById('matrixInfo').innerHTML = 
            `矩陣大小：<span class="highlight">${this.gridRows} × ${this.gridCols}</span>`;
        
        // 顯示二元陣列
        this.renderBinaryMatrix('binaryMatrix', this.binaryMatrix);
        
        // 顯示可編輯矩陣
        this.renderEditableMatrix('editableMatrix', this.valueMatrix);
        
        // 初始化視覺化
        this.initVisualization();
    }

    renderMatrix(containerId, matrix, highlight = false, highlightCells = []) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        matrix.forEach((row, rowIndex) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'matrix-row';
            
            row.forEach((cell, colIndex) => {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'matrix-cell';
                
                if (cell === null) {
                    cellDiv.classList.add('empty');
                    cellDiv.textContent = '-';
                } else {
                    cellDiv.textContent = cell;
                }
                
                // 高亮顯示
                if (highlight && highlightCells.some(c => c.row === rowIndex && c.col === colIndex)) {
                    cellDiv.classList.add('highlighted');
                }
                
                rowDiv.appendChild(cellDiv);
            });
            
            container.appendChild(rowDiv);
        });
    }

    renderBinaryMatrix(containerId, matrix) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        matrix.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'matrix-row';
            
            row.forEach(cell => {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'matrix-cell';
                cellDiv.textContent = cell;
                
                if (cell === 1) {
                    cellDiv.classList.add('has-block');
                }
                
                rowDiv.appendChild(cellDiv);
            });
            
            container.appendChild(rowDiv);
        });
    }

    renderEditableMatrix(containerId, matrix) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        matrix.forEach((row, rowIndex) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'matrix-row';
            
            row.forEach((cell, colIndex) => {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'matrix-cell';
                cellDiv.dataset.row = rowIndex;
                cellDiv.dataset.col = colIndex;
                
                if (cell === null) {
                    cellDiv.classList.add('empty');
                    cellDiv.textContent = '-';
                } else {
                    cellDiv.textContent = cell;
                }
                
                // 點擊編輯
                cellDiv.addEventListener('click', () => this.editCell(cellDiv, rowIndex, colIndex));
                
                rowDiv.appendChild(cellDiv);
            });
            
            container.appendChild(rowDiv);
        });
    }

    editCell(cellDiv, row, col) {
        if (cellDiv.querySelector('input')) return; // 已經在編輯中
        
        const currentValue = this.valueMatrix[row][col];
        cellDiv.classList.add('editing');
        
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'cell-input';
        input.min = 0;
        input.max = 9;
        input.value = currentValue !== null ? currentValue : '';
        
        cellDiv.textContent = '';
        cellDiv.appendChild(input);
        input.focus();
        input.select();
        
        const finishEdit = () => {
            const newValue = input.value.trim();
            cellDiv.classList.remove('editing');
            
            if (newValue === '' || newValue === '-') {
                this.valueMatrix[row][col] = null;
                this.binaryMatrix[row][col] = 0;
                cellDiv.textContent = '-';
                cellDiv.classList.add('empty');
            } else {
                const num = parseInt(newValue, 10);
                if (!isNaN(num) && num >= 0 && num <= 9) {
                    this.valueMatrix[row][col] = num;
                    this.binaryMatrix[row][col] = 1;
                    cellDiv.textContent = num;
                    cellDiv.classList.remove('empty');
                } else {
                    cellDiv.textContent = currentValue !== null ? currentValue : '-';
                }
            }
            
            // 更新二元陣列顯示
            this.renderBinaryMatrix('binaryMatrix', this.binaryMatrix);
        };
        
        input.addEventListener('blur', finishEdit);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    }

    recalculateFromEditableMatrix() {
        // 重新計算步驟
        this.calculateSteps();
        
        // 更新數值矩陣顯示
        this.renderMatrix('valueMatrix', this.valueMatrix, false);
    }

    calculateSteps() {
        // 創建矩陣副本用於模擬
        const matrixCopy = this.valueMatrix.map(row => [...row]);
        const binaryCopy = this.binaryMatrix.map(row => [...row]);
        
        this.steps = [];
        
        if (this.currentStrategy === 'greedy') {
            this.calculateGreedySteps(matrixCopy, binaryCopy);
        } else {
            this.calculateOptimalSteps(matrixCopy, binaryCopy);
        }
        
        this.displaySteps();
        this.updateVisualization();
    }

    calculateGreedySteps(matrix, binary) {
        let stepCount = 0;
        let changed = true;
        
        while (changed && stepCount < CONFIG.MAX_GREEDY_STEPS) {
            changed = false;
            
            // 尋找所有可能的矩形區域（和為目標值）
            const rectangles = this.findAllPathsSumTo10(matrix, binary);
            
            if (rectangles.length > 0) {
                // 貪心策略：選擇最大的矩形（消除最多方塊）
                rectangles.sort((a, b) => b.cellCount - a.cellCount);
                const bestRect = rectangles[0];
                
                stepCount++;
                this.steps.push({
                    stepNumber: stepCount,
                    topLeft: bestRect.topLeft,
                    bottomRight: bestRect.bottomRight,
                    cells: bestRect.cells,
                    numbers: bestRect.numbers,
                    sum: CONFIG.TARGET_SUM
                });
                
                // 更新矩陣（移除選中的方塊）
                bestRect.cells.forEach(cell => {
                    matrix[cell.row][cell.col] = null;
                    binary[cell.row][cell.col] = 0;
                });
                
                changed = true;
            }
        }
    }

    calculateOptimalSteps(matrix, binary) {
        // 使用回溯法尋找最多消除的策略
        const bestResult = { steps: [], totalRemoved: 0 };
        this.backtrackOptimal(matrix, binary, [], 0, bestResult, 0);
        
        this.steps = bestResult.steps;
    }

    backtrackOptimal(matrix, binary, currentSteps, removed, bestResult, depth) {
        if (depth > CONFIG.BACKTRACK_MAX_DEPTH) return; // 限制搜索深度
        
        const rectangles = this.findAllPathsSumTo10(matrix, binary);
        
        if (rectangles.length === 0) {
            // 無法再消除，檢查是否是最佳解
            if (removed > bestResult.totalRemoved) {
                bestResult.steps = currentSteps.map(s => ({...s}));
                bestResult.totalRemoved = removed;
            }
            return;
        }
        
        // 嘗試每個矩形（限制分支數以控制計算時間）
        for (const rect of rectangles.slice(0, CONFIG.BACKTRACK_BRANCH_LIMIT)) {
            const matrixCopy = matrix.map(row => [...row]);
            const binaryCopy = binary.map(row => [...row]);
            
            // 移除選中的方塊
            rect.cells.forEach(cell => {
                matrixCopy[cell.row][cell.col] = null;
                binaryCopy[cell.row][cell.col] = 0;
            });
            
            const step = {
                stepNumber: currentSteps.length + 1,
                topLeft: rect.topLeft,
                bottomRight: rect.bottomRight,
                cells: rect.cells,
                numbers: rect.numbers,
                sum: CONFIG.TARGET_SUM
            };
            
            currentSteps.push(step);
            this.backtrackOptimal(matrixCopy, binaryCopy, currentSteps, removed + rect.cells.length, bestResult, depth + 1);
            currentSteps.pop();
        }
    }

    findAllPathsSumTo10(matrix, binary) {
        const rectangles = [];
        const rows = matrix.length;
        const cols = matrix[0].length;
        
        // 尋找所有矩形區域，其數字和為目標值
        for (let r1 = 0; r1 < rows; r1++) {
            for (let c1 = 0; c1 < cols; c1++) {
                // 檢查起點是否有效
                if (binary[r1][c1] === 0 || matrix[r1][c1] === null) continue;
                
                for (let r2 = r1; r2 < rows; r2++) {
                    for (let c2 = c1; c2 < cols; c2++) {
                        // 檢查終點是否有效
                        if (binary[r2][c2] === 0 || matrix[r2][c2] === null) continue;
                        
                        // 計算矩形區域的數字和
                        const rectInfo = this.calculateRectangleSum(matrix, binary, r1, c1, r2, c2);
                        
                        if (rectInfo.sum === CONFIG.TARGET_SUM && rectInfo.valid) {
                            rectangles.push({
                                topLeft: { row: r1, col: c1 },
                                bottomRight: { row: r2, col: c2 },
                                cells: rectInfo.cells,
                                numbers: rectInfo.numbers,
                                sum: rectInfo.sum,
                                cellCount: rectInfo.cells.length
                            });
                        }
                    }
                }
            }
        }
        
        return rectangles;
    }

    calculateRectangleSum(matrix, binary, r1, c1, r2, c2) {
        let sum = 0;
        const cells = [];
        const numbers = [];
        let valid = true;
        
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                // 檢查矩形內所有格子是否都有方塊
                if (binary[r][c] === 0 || matrix[r][c] === null) {
                    valid = false;
                    break;
                }
                sum += matrix[r][c];
                cells.push({ row: r, col: c });
                numbers.push(matrix[r][c]);
            }
            if (!valid) break;
        }
        
        return { sum, cells, numbers, valid };
    }

    removeDuplicatePaths(paths) {
        // 矩形不需要去重，因為每個矩形由 topLeft 和 bottomRight 唯一確定
        return paths;
    }

    getOriginalValue(step, row, col) {
        // 找出步驟中對應座標的數值
        for (let i = 0; i < step.cells.length; i++) {
            if (step.cells[i].row === row && step.cells[i].col === col) {
                return step.numbers[i];
            }
        }
        return '?';
    }

    displaySteps() {
        const container = document.getElementById('stepsContainer');
        const summary = document.getElementById('stepsSummary');
        
        if (this.steps.length === 0) {
            container.innerHTML = `<p class="no-steps">沒有找到可消除的組合（和為 ${CONFIG.TARGET_SUM} 的矩形區域）</p>`;
            summary.innerHTML = '';
            document.getElementById('stepNavigation').style.display = 'none';
            return;
        }
        
        container.innerHTML = '';
        
        this.steps.forEach((step, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step-item';
            stepDiv.dataset.index = index;
            
            // 取得矩形的左上角和右下角座標及數字（使用 1-based 座標）
            const topLeft = step.topLeft;
            const bottomRight = step.bottomRight;
            const topLeftNum = this.getOriginalValue(step, topLeft.row, topLeft.col);
            const bottomRightNum = this.getOriginalValue(step, bottomRight.row, bottomRight.col);
            
            // 判斷是單一格子還是矩形區域
            const isSingleCell = topLeft.row === bottomRight.row && topLeft.col === bottomRight.col;
            
            let description;
            if (isSingleCell) {
                description = `選取格子 <strong>(${topLeft.row + 1}, ${topLeft.col + 1})</strong> [${topLeftNum}]`;
            } else {
                description = `選取矩形區域：左上 <strong>(${topLeft.row + 1}, ${topLeft.col + 1})</strong> [${topLeftNum}] → 右下 <strong>(${bottomRight.row + 1}, ${bottomRight.col + 1})</strong> [${bottomRightNum}]`;
            }
            
            stepDiv.innerHTML = `
                <div class="step-number">步驟 ${step.stepNumber}</div>
                <div class="step-description">${description}</div>
                <div class="step-path">
                    ${step.cells.map((c, i) => 
                        `<span class="path-cell">(${c.row + 1},${c.col + 1}): ${step.numbers[i]}</span>`
                    ).join('')}
                </div>
                <div class="step-sum">數字和 = ${step.sum}</div>
            `;
            
            stepDiv.addEventListener('click', () => {
                this.currentStepIndex = index;
                this.highlightStep(index);
            });
            
            container.appendChild(stepDiv);
        });
        
        // 統計摘要
        const totalRemoved = this.steps.reduce((sum, step) => sum + step.cells.length, 0);
        summary.innerHTML = `
            <p>總步驟數：<span class="highlight">${this.steps.length}</span> 步</p>
            <p>總消除方塊：<span class="highlight">${totalRemoved}</span> 個</p>
            <p>策略：<span class="highlight">${this.currentStrategy === 'greedy' ? '貪心策略' : '最佳化策略'}</span></p>
        `;
        
        // 顯示導航
        document.getElementById('stepNavigation').style.display = 'flex';
        this.currentStepIndex = 0;
        this.highlightStep(0);
    }

    highlightStep(index) {
        // 更新步驟高亮
        document.querySelectorAll('.step-item').forEach((item, i) => {
            item.classList.toggle('current', i === index);
        });
        
        // 更新導航顯示
        document.getElementById('currentStepDisplay').textContent = 
            `步驟 ${index + 1} / ${this.steps.length}`;
        document.getElementById('prevStepBtn').disabled = index === 0;
        document.getElementById('nextStepBtn').disabled = index === this.steps.length - 1;
        
        // 更新視覺化
        this.drawStepOnCanvas(index);
    }

    navigateStep(direction) {
        const newIndex = this.currentStepIndex + direction;
        if (newIndex >= 0 && newIndex < this.steps.length) {
            this.currentStepIndex = newIndex;
            this.highlightStep(newIndex);
        }
    }

    initVisualization() {
        const canvas = document.getElementById('visualCanvas');
        
        // 設置 canvas 大小 - 動態根據實際格子數量
        // canvas.width = cellSize * this.gridCols;
        // canvas.height = cellSize * this.gridRows;
        
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const fixedHeight = 80 * (vh / 100);
        const fixedWidth = fixedHeight * (10 / 16);
        canvas.width = fixedWidth;
        canvas.height = fixedHeight;
        
        this.drawGrid();
    }

    updateVisualization() {
        if (this.steps.length > 0) {
            this.drawStepOnCanvas(0);
        } else {
            this.drawGrid();
        }
    }

    drawGrid() {
        const canvas = document.getElementById('visualCanvas');
        const ctx = canvas.getContext('2d');
        const cellSize = canvas.width / this.gridCols;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 繪製背景
        ctx.fillStyle = '#252525';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 繪製格子
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const x = col * cellSize;
                const y = row * cellSize;
                const value = this.valueMatrix[row][col];
                
                // 繪製格子背景
                if (value === null) {
                    ctx.fillStyle = '#1a1a1a';
                } else {
                    ctx.fillStyle = '#2a2a2a';
                }
                ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                
                // 繪製邊框
                ctx.strokeStyle = '#404040';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                
                // 繪製數字
                if (value !== null) {
                    ctx.fillStyle = '#e0e0e0';
                    ctx.font = `bold ${cellSize * 0.5}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(value.toString(), x + cellSize / 2, y + cellSize / 2);
                }
            }
        }
    }

    drawStepOnCanvas(stepIndex) {
        this.drawGrid();
        
        if (stepIndex >= this.steps.length) return;
        
        const canvas = document.getElementById('visualCanvas');
        const ctx = canvas.getContext('2d');
        const cellSize = canvas.width / this.gridCols;
        const step = this.steps[stepIndex];
        
        // 繪製矩形區域邊框
        if (step.topLeft && step.bottomRight) {
            const rectX = step.topLeft.col * cellSize;
            const rectY = step.topLeft.row * cellSize;
            const rectWidth = (step.bottomRight.col - step.topLeft.col + 1) * cellSize;
            const rectHeight = (step.bottomRight.row - step.topLeft.row + 1) * cellSize;
            
            // 繪製矩形外框
            ctx.strokeStyle = '#ff8c42';
            ctx.lineWidth = 4;
            ctx.strokeRect(rectX + 1, rectY + 1, rectWidth - 2, rectHeight - 2);
        }
        
        // 高亮選中的格子
        step.cells.forEach((cell, i) => {
            const x = cell.col * cellSize;
            const y = cell.row * cellSize;
            
            // 判斷是左上角還是右下角
            const isTopLeft = step.topLeft && cell.row === step.topLeft.row && cell.col === step.topLeft.col;
            const isBottomRight = step.bottomRight && cell.row === step.bottomRight.row && cell.col === step.bottomRight.col;
            
            // 繪製高亮背景
            if (isTopLeft) {
                ctx.fillStyle = '#4caf50'; // 左上角綠色
            } else if (isBottomRight) {
                ctx.fillStyle = '#f44336'; // 右下角紅色
            } else {
                ctx.fillStyle = '#ff8c42'; // 中間橙色
            }
            ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            
            // 繪製邊框
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            
            // 繪製數字
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${cellSize * 0.5}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(step.numbers[i].toString(), x + cellSize / 2, y + cellSize / 2);
        });
    }

    downloadJSON() {
        const data = {
            gridSize: { rows: this.gridRows, cols: this.gridCols },
            valueMatrix: this.valueMatrix,
            binaryMatrix: this.binaryMatrix,
            strategy: this.currentStrategy,
            steps: this.steps.map(step => ({
                stepNumber: step.stepNumber,
                topLeft: { row: step.topLeft.row + 1, col: step.topLeft.col + 1 }, // 1-based
                bottomRight: { row: step.bottomRight.row + 1, col: step.bottomRight.col + 1 }, // 1-based
                cells: step.cells.map(c => ({ row: c.row + 1, col: c.col + 1 })), // 1-based
                numbers: step.numbers,
                sum: step.sum
            })),
            totalSteps: this.steps.length,
            totalRemoved: this.steps.reduce((sum, step) => sum + step.cells.length, 0),
            generatedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, 'nikke_solver_steps.json');
    }

    downloadText() {
        let text = '=== Nikke 小遊戲通關步驟 ===\n\n';
        text += `矩陣大小：${this.gridRows} × ${this.gridCols}\n`;
        text += `策略：${this.currentStrategy === 'greedy' ? '貪心策略' : '最佳化策略'}\n`;
        text += `總步驟數：${this.steps.length} 步\n`;
        text += `總消除方塊：${this.steps.reduce((sum, step) => sum + step.cells.length, 0)} 個\n\n`;
        
        text += '--- 數值矩陣 ---\n';
        this.valueMatrix.forEach((row, i) => {
            text += row.map(v => v === null ? '-' : v).join(' ') + '\n';
        });
        
        text += '\n--- 通關步驟 ---\n\n';
        
        this.steps.forEach(step => {
            const topLeftNum = this.getOriginalValue(step, step.topLeft.row, step.topLeft.col);
            const bottomRightNum = this.getOriginalValue(step, step.bottomRight.row, step.bottomRight.col);
            const isSingleCell = step.topLeft.row === step.bottomRight.row && step.topLeft.col === step.bottomRight.col;
            
            text += `【步驟 ${step.stepNumber}】\n`;
            if (isSingleCell) {
                text += `選取格子：(${step.topLeft.row + 1}, ${step.topLeft.col + 1}) [${topLeftNum}]\n`;
            } else {
                text += `矩形區域：左上 (${step.topLeft.row + 1}, ${step.topLeft.col + 1}) [${topLeftNum}] → 右下 (${step.bottomRight.row + 1}, ${step.bottomRight.col + 1}) [${bottomRightNum}]\n`;
            }
            text += `數字和：${step.sum}\n\n`;
        });
        
        text += `\n生成時間：${new Date().toLocaleString('zh-TW')}\n`;
        
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        this.downloadBlob(blob, 'nikke_solver_steps.txt');
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showLoading(show) {
        document.getElementById('loadingSection').style.display = show ? 'block' : 'none';
        document.getElementById('analyzeBtn').disabled = show;
    }

    updateProgress(percent, text) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = text;
    }
}

// 初始化
let solver;

document.addEventListener('DOMContentLoaded', () => {
    solver = new NikkeSolver();
});
