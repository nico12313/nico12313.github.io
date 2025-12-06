/**
 * Nikke 小遊戲解析器 - 通關步驟產生器
 * 
 * 功能：
 * 1. 上傳遊戲截圖並使用 OCR 辨識數字格子
 * 2. 生成數值矩陣和二元陣列
 * 3. 計算和為 10 的相鄰路徑組合
 * 4. 產生通關步驟文字指示
 */

// 可配置的常數
const CONFIG = {
    // 預設網格大小
    DEFAULT_GRID_ROWS: 6,
    DEFAULT_GRID_COLS: 6,
    
    // 圖像處理參數
    GRID_SIZE_RATIO: 0.7,           // 網格佔畫面的比例 (70%)
    DARK_PIXEL_BRIGHTNESS: 50,       // 暗色像素亮度閾值
    EMPTY_CELL_THRESHOLD: 0.8,       // 空格判定閾值 (80% 暗色像素)
    MIN_CELL_SIZE: 20,               // 最小格子大小 (像素)
    
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
        
        this.init();
    }

    init() {
        this.setupEventListeners();
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
    }

    handleImageUpload(file) {
        if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
            alert('請上傳 PNG 或 JPG 格式的圖片');
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
            alert('請先上傳圖片');
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
            alert('分析過程發生錯誤，請確認圖片格式正確或嘗試其他截圖');
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
            
            // 尋找所有可能的路徑（和為目標值）
            const paths = this.findAllPathsSumTo10(matrix, binary);
            
            if (paths.length > 0) {
                // 貪心策略：選擇最長的路徑（消除最多方塊）
                paths.sort((a, b) => b.cells.length - a.cells.length);
                const bestPath = paths[0];
                
                stepCount++;
                this.steps.push({
                    stepNumber: stepCount,
                    cells: bestPath.cells,
                    numbers: bestPath.numbers,
                    sum: CONFIG.TARGET_SUM
                });
                
                // 更新矩陣（移除選中的方塊）
                bestPath.cells.forEach(cell => {
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
        
        const paths = this.findAllPathsSumTo10(matrix, binary);
        
        if (paths.length === 0) {
            // 無法再消除，檢查是否是最佳解
            if (removed > bestResult.totalRemoved) {
                bestResult.steps = currentSteps.map(s => ({...s}));
                bestResult.totalRemoved = removed;
            }
            return;
        }
        
        // 嘗試每條路徑（限制分支數以控制計算時間）
        for (const path of paths.slice(0, CONFIG.BACKTRACK_BRANCH_LIMIT)) {
            const matrixCopy = matrix.map(row => [...row]);
            const binaryCopy = binary.map(row => [...row]);
            
            // 移除選中的方塊
            path.cells.forEach(cell => {
                matrixCopy[cell.row][cell.col] = null;
                binaryCopy[cell.row][cell.col] = 0;
            });
            
            const step = {
                stepNumber: currentSteps.length + 1,
                cells: path.cells,
                numbers: path.numbers,
                sum: 10
            };
            
            currentSteps.push(step);
            this.backtrackOptimal(matrixCopy, binaryCopy, currentSteps, removed + path.cells.length, bestResult, depth + 1);
            currentSteps.pop();
        }
    }

    findAllPathsSumTo10(matrix, binary) {
        const paths = [];
        const rows = matrix.length;
        const cols = matrix[0].length;
        
        // 從每個非空格子開始搜索
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (binary[row][col] === 1 && matrix[row][col] !== null) {
                    const visited = Array(rows).fill(null).map(() => Array(cols).fill(false));
                    this.dfsPath(matrix, binary, row, col, [], [], 0, paths, visited);
                }
            }
        }
        
        // 去除重複路徑
        return this.removeDuplicatePaths(paths);
    }

    dfsPath(matrix, binary, row, col, currentPath, currentNumbers, currentSum, paths, visited) {
        if (row < 0 || row >= matrix.length || col < 0 || col >= matrix[0].length) return;
        if (visited[row][col]) return;
        if (binary[row][col] === 0 || matrix[row][col] === null) return;
        
        const value = matrix[row][col];
        const newSum = currentSum + value;
        
        if (newSum > CONFIG.TARGET_SUM) return; // 超過目標值，停止搜索
        
        visited[row][col] = true;
        currentPath.push({ row, col });
        currentNumbers.push(value);
        
        if (newSum === CONFIG.TARGET_SUM && currentPath.length >= 2) {
            // 找到一條和為目標值的路徑
            paths.push({
                cells: [...currentPath],
                numbers: [...currentNumbers]
            });
        }
        
        // 繼續搜索相鄰格子（上下左右）
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            this.dfsPath(matrix, binary, row + dr, col + dc, currentPath, currentNumbers, newSum, paths, visited);
        }
        
        // 回溯
        currentPath.pop();
        currentNumbers.pop();
        visited[row][col] = false;
    }

    removeDuplicatePaths(paths) {
        const unique = [];
        const seen = new Set();
        
        for (const path of paths) {
            // 將路徑的格子排序後作為唯一標識
            const sortedCells = [...path.cells].sort((a, b) => 
                a.row === b.row ? a.col - b.col : a.row - b.row
            );
            const key = sortedCells.map(c => `${c.row},${c.col}`).join('|');
            
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(path);
            }
        }
        
        return unique;
    }

    displaySteps() {
        const container = document.getElementById('stepsContainer');
        const summary = document.getElementById('stepsSummary');
        
        if (this.steps.length === 0) {
            container.innerHTML = `<p class="no-steps">沒有找到可消除的組合（和為 ${CONFIG.TARGET_SUM} 的相鄰路徑）</p>`;
            summary.innerHTML = '';
            document.getElementById('stepNavigation').style.display = 'none';
            return;
        }
        
        container.innerHTML = '';
        
        this.steps.forEach((step, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step-item';
            stepDiv.dataset.index = index;
            
            // 生成座標描述（使用 1-based 座標）
            const cellsDesc = step.cells.map((c, i) => 
                `(${c.row + 1}, ${c.col + 1})=${step.numbers[i]}`
            ).join(' → ');
            
            stepDiv.innerHTML = `
                <div class="step-number">步驟 ${step.stepNumber}</div>
                <div class="step-description">
                    從格子 <strong>(${step.cells[0].row + 1}, ${step.cells[0].col + 1})</strong> 開始，
                    依序選取相鄰格子，消除這些方塊。
                </div>
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
        const container = document.getElementById('visualizationContainer');
        
        // 設置 canvas 大小
        const size = Math.min(container.clientWidth - 30, 500);
        canvas.width = size;
        canvas.height = size;
        
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
        
        // 繪製路徑連線
        if (step.cells.length > 1) {
            ctx.strokeStyle = '#ff8c42';
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            step.cells.forEach((cell, i) => {
                const x = cell.col * cellSize + cellSize / 2;
                const y = cell.row * cellSize + cellSize / 2;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
        
        // 高亮選中的格子
        step.cells.forEach((cell, i) => {
            const x = cell.col * cellSize;
            const y = cell.row * cellSize;
            
            // 繪製高亮背景
            if (i === 0) {
                ctx.fillStyle = '#4caf50'; // 起點綠色
            } else if (i === step.cells.length - 1) {
                ctx.fillStyle = '#f44336'; // 終點紅色
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
            
            // 繪製序號
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${cellSize * 0.25}px sans-serif`;
            ctx.fillText((i + 1).toString(), x + cellSize - 10, y + 12);
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
            text += `【步驟 ${step.stepNumber}】\n`;
            text += `路徑：${step.cells.map((c, i) => `(${c.row + 1},${c.col + 1})=${step.numbers[i]}`).join(' → ')}\n`;
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
