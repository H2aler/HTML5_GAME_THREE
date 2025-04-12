class StockSimulator {
    constructor() {
        this.initialCash = 1000000;
        this.cash = this.initialCash;
        this.holdings = 0;
        this.currentPrice = 50000;
        this.priceHistory = [this.currentPrice];
        this.chart = null;
        this.gameInterval = null;
        this.timeLeft = 300; // 5분
        this.isGameRunning = false;
        this.difficulty = 'easy'; // 기본값을 쉬움으로 변경
        this.volatility = 0.015;
        this.trendStrength = 0.3;
        this.trend = 0;
        this.adminPassword = 'admin123!@#'; // 관리자 비밀번호
        this.items = {
            '시간 정지': { price: 50000, duration: 10, used: false },
            '가격 고정': { price: 30000, duration: 5, used: false },
            '이중 수익': { price: 100000, duration: 15, used: false }
        };
        this.activeEffects = [];
        this.eventHistory = [];
        
        this.loadLeaderboard();
        this.initializeChart();
        this.setupEventListeners();
        this.showLeaderboard();
        this.showTutorial();
    }

    loadLeaderboard() {
        const savedScores = localStorage.getItem('stockGameScores');
        this.leaderboard = savedScores ? JSON.parse(savedScores) : [];
        this.updateLeaderboard();
    }

    saveScore(playerName) {
        const totalAssets = this.cash + (this.holdings * this.currentPrice);
        const profitRate = ((totalAssets - this.initialCash) / this.initialCash * 100).toFixed(2);
        const gameTime = new Date().toISOString();
        
        const score = {
            name: playerName,
            score: totalAssets,
            profitRate: profitRate,
            difficulty: this.difficulty,
            time: gameTime
        };
        
        this.leaderboard.push(score);
        this.leaderboard.sort((a, b) => b.score - a.score);
        this.leaderboard = this.leaderboard.slice(0, 10); // 상위 10개만 유지
        
        localStorage.setItem('stockGameScores', JSON.stringify(this.leaderboard));
        this.updateLeaderboard();
    }

    updateLeaderboard() {
        const rankingsDiv = document.getElementById('rankings');
        rankingsDiv.innerHTML = this.leaderboard.map((score, index) => `
            <div class="ranking-item">
                <span>${index + 1}위</span>
                <span>${score.name}</span>
                <span>${this.formatNumber(score.score)}원 (${score.profitRate}%)</span>
                <span class="difficulty-badge ${score.difficulty}">${score.difficulty === 'easy' ? '쉬움' : score.difficulty === 'normal' ? '보통' : '어려움'}</span>
                <span class="time">${new Date(score.time).toLocaleString()}</span>
            </div>
        `).join('');
    }

    showTutorial() {
        document.getElementById('tutorial').classList.remove('hidden');
    }

    showLeaderboard() {
        document.getElementById('leaderboard').classList.remove('hidden');
    }

    initializeChart() {
        const ctx = document.getElementById('stockChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['0'],
                datasets: [{
                    label: '주가',
                    data: this.priceHistory,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false,
                    pointRadius: 0,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 0
                },
                elements: {
                    line: {
                        tension: 0.1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    setupEventListeners() {
        document.getElementById('buy-btn').addEventListener('click', () => this.buy());
        document.getElementById('sell-btn').addEventListener('click', () => this.sell());
        document.getElementById('start-btn').addEventListener('click', () => {
            document.getElementById('leaderboard').classList.add('hidden');
            this.startGame();
        });
        document.getElementById('tutorial-close').addEventListener('click', () => {
            document.getElementById('tutorial').classList.add('hidden');
            this.showLeaderboard();
        });
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.updateDifficultySettings();
        });
        document.getElementById('save-score').addEventListener('click', () => {
            const playerName = document.getElementById('player-name').value.trim();
            if (playerName) {
                this.saveScore(playerName);
                document.getElementById('game-over').classList.add('hidden');
                this.showLeaderboard();
            }
        });
        document.getElementById('restart-btn').addEventListener('click', () => {
            document.getElementById('game-over').classList.add('hidden');
            this.resetGame();
            this.showLeaderboard();
        });
        document.getElementById('manage-records').addEventListener('click', () => {
            const password = document.getElementById('admin-password').value;
            if (password === this.adminPassword) {
                this.showRecordManagement();
            } else {
                alert('잘못된 비밀번호입니다!');
            }
        });
    }

    updateDifficultySettings() {
        switch (this.difficulty) {
            case 'easy':
                this.volatility = 0.015;
                this.trendStrength = 0.3;
                this.updateInterval = 1000; // 1초 (일반 속도)
                this.timeInterval = 1000; // 1초 (일정한 시간 흐름)
                break;
            case 'hard':
                this.volatility = 0.03;
                this.trendStrength = 0.7;
                this.updateInterval = 600; // 0.6초 (더 빠른 속도)
                this.timeInterval = 1000; // 1초 (일정한 시간 흐름)
                break;
        }
    }

    startGame() {
        if (this.isGameRunning) return;
        
        this.resetGame();
        this.isGameRunning = true;
        document.getElementById('start-btn').disabled = true;
        document.getElementById('buy-btn').disabled = false;
        document.getElementById('sell-btn').disabled = false;
        document.getElementById('difficulty').disabled = true;
        document.getElementById('timer').classList.remove('hidden');
        
        // 그래프 업데이트 인터벌
        this.gameInterval = setInterval(() => {
            this.updatePrice();
        }, this.updateInterval);

        // 시간 업데이트 인터벌
        this.timeInterval = setInterval(() => {
            this.updateTimer();
        }, this.timeInterval);
    }

    resetGame() {
        this.cash = this.initialCash;
        this.holdings = 0;
        this.currentPrice = 50000;
        this.priceHistory = [this.currentPrice];
        this.timeLeft = 300;
        this.trend = 0;
        this.updateChart();
        this.updateUI();
        
        document.getElementById('start-btn').disabled = false;
        document.getElementById('buy-btn').disabled = true;
        document.getElementById('sell-btn').disabled = true;
        document.getElementById('difficulty').disabled = false;
        document.getElementById('timer').classList.add('hidden');
    }

    updateTimer() {
        this.timeLeft--;
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (this.timeLeft <= 0) {
            this.endGame();
        }
    }

    endGame() {
        clearInterval(this.gameInterval);
        clearInterval(this.timeInterval);
        this.isGameRunning = false;
        
        const totalAssets = this.cash + (this.holdings * this.currentPrice);
        const profitRate = ((totalAssets - this.initialCash) / this.initialCash * 100).toFixed(2);
        
        document.getElementById('final-assets').textContent = this.formatNumber(totalAssets);
        document.getElementById('final-profit-rate').textContent = profitRate;
        document.getElementById('game-over').classList.remove('hidden');
    }

    updatePrice() {
        // 아이템 효과 적용
        this.applyItemEffects();
        
        // 트렌드 기반 가격 변동
        this.trend = this.trend * this.trendStrength + (Math.random() - 0.5) * (1 - this.trendStrength);
        const change = this.trend * this.volatility;
        
        // 랜덤 이벤트 발생
        if (Math.random() < 0.01) { // 1% 확률로 이벤트 발생
            this.triggerRandomEvent();
        }
        
        this.currentPrice = Math.max(1000, Math.round(this.currentPrice * (1 + change)));
        this.priceHistory.push(this.currentPrice);
        
        if (this.priceHistory.length > 200) {
            this.priceHistory.shift();
        }

        this.updateChart();
        this.updateUI();
    }

    applyItemEffects() {
        const now = Date.now();
        this.activeEffects = this.activeEffects.filter(effect => {
            if (now - effect.startTime > effect.duration * 1000) {
                return false;
            }
            
            switch (effect.type) {
                case '시간 정지':
                    this.timeLeft++;
                    break;
                case '가격 고정':
                    this.currentPrice = effect.fixedPrice;
                    break;
                case '이중 수익':
                    if (this.currentPrice > effect.startPrice) {
                        this.currentPrice = effect.startPrice + (this.currentPrice - effect.startPrice) * 2;
                    }
                    break;
            }
            return true;
        });
    }

    triggerRandomEvent() {
        const events = [
            {
                name: '급등장',
                effect: () => {
                    this.currentPrice = Math.round(this.currentPrice * 1.2);
                    this.addEventMessage('급등장이 발생했습니다! 주가가 20% 상승했습니다!');
                }
            },
            {
                name: '급락장',
                effect: () => {
                    this.currentPrice = Math.round(this.currentPrice * 0.8);
                    this.addEventMessage('급락장이 발생했습니다! 주가가 20% 하락했습니다!');
                }
            },
            {
                name: '특별 배당',
                effect: () => {
                    const dividend = Math.round(this.holdings * this.currentPrice * 0.1);
                    this.cash += dividend;
                    this.addEventMessage(`특별 배당금 ${this.formatNumber(dividend)}원이 지급되었습니다!`);
                }
            },
            {
                name: '주식 분할',
                effect: () => {
                    this.holdings *= 2;
                    this.currentPrice = Math.round(this.currentPrice / 2);
                    this.addEventMessage('주식이 2:1로 분할되었습니다!');
                }
            }
        ];

        const randomEvent = events[Math.floor(Math.random() * events.length)];
        randomEvent.effect();
    }

    addEventMessage(message) {
        this.eventHistory.unshift(message);
        if (this.eventHistory.length > 5) {
            this.eventHistory.pop();
        }
        this.updateEventLog();
    }

    updateEventLog() {
        const eventLog = document.getElementById('event-log');
        if (eventLog) {
            eventLog.innerHTML = this.eventHistory.map(event => `<div class="event-message">${event}</div>`).join('');
        }
    }

    buyItem(itemName) {
        const item = this.items[itemName];
        if (item && !item.used && this.cash >= item.price) {
            this.cash -= item.price;
            item.used = true;
            
            const effect = {
                type: itemName,
                startTime: Date.now(),
                duration: item.duration,
                startPrice: this.currentPrice,
                fixedPrice: this.currentPrice
            };
            
            this.activeEffects.push(effect);
            this.addEventMessage(`${itemName} 아이템을 사용했습니다!`);
            this.updateUI();
        }
    }

    updateChart() {
        const labels = Array.from({ length: this.priceHistory.length }, (_, i) => i.toString());
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = this.priceHistory;
        
        // 차트의 y축 범위를 현재 가격의 ±20%로 설정
        const currentPrice = this.currentPrice;
        const minPrice = Math.max(0, currentPrice * 0.8);
        const maxPrice = currentPrice * 1.2;
        
        this.chart.options.scales.y.min = minPrice;
        this.chart.options.scales.y.max = maxPrice;
        
        this.chart.update('none'); // 애니메이션 없이 업데이트
    }

    buy() {
        if (!this.isGameRunning) return;
        
        const quantity = parseInt(document.getElementById('quantity').value);
        const totalCost = this.currentPrice * quantity;

        if (totalCost > this.cash) {
            alert('잔액이 부족합니다!');
            return;
        }

        this.cash -= totalCost;
        this.holdings += quantity;
        this.updateUI();
    }

    sell() {
        if (!this.isGameRunning) return;
        
        const quantity = parseInt(document.getElementById('quantity').value);
        
        if (quantity > this.holdings) {
            alert('보유 주식이 부족합니다!');
            return;
        }

        this.cash += this.currentPrice * quantity;
        this.holdings -= quantity;
        this.updateUI();
    }

    updateUI() {
        document.getElementById('cash').textContent = this.formatNumber(this.cash);
        document.getElementById('current-price').textContent = this.formatNumber(this.currentPrice);
        
        const totalAssets = this.cash + (this.holdings * this.currentPrice);
        document.getElementById('total-assets').textContent = this.formatNumber(totalAssets);
        
        const profitRate = ((totalAssets - this.initialCash) / this.initialCash * 100).toFixed(2);
        const profitRateElement = document.getElementById('profit-rate');
        profitRateElement.textContent = profitRate;
        profitRateElement.className = profitRate > 0 ? 'positive' : 'negative';
        
        const priceChange = this.priceHistory.length > 1 
            ? ((this.currentPrice - this.priceHistory[this.priceHistory.length - 2]) / this.priceHistory[this.priceHistory.length - 2] * 100).toFixed(2)
            : '0.00';
        
        const priceChangeElement = document.getElementById('price-change');
        priceChangeElement.textContent = priceChange;
        priceChangeElement.className = priceChange > 0 ? 'price-up' : 'price-down';

        const holdingsElement = document.getElementById('holdings');
        holdingsElement.innerHTML = `
            <div class="holding-item">
                <span>보유 수량: ${this.holdings}주</span>
                <span>평가 금액: ${this.formatNumber(this.holdings * this.currentPrice)}원</span>
            </div>
        `;

        // 아이템 상태 업데이트
        const itemContainer = document.getElementById('items-container');
        if (itemContainer) {
            itemContainer.innerHTML = Object.entries(this.items)
                .map(([name, item]) => `
                    <div class="item ${item.used ? 'used' : ''}">
                        <h3>${name}</h3>
                        <p>가격: ${this.formatNumber(item.price)}원</p>
                        <p>지속시간: ${item.duration}초</p>
                        <button onclick="stockSimulator.buyItem('${name}')" 
                                ${item.used || this.cash < item.price ? 'disabled' : ''}>
                            ${item.used ? '사용됨' : '구매'}
                        </button>
                    </div>
                `).join('');
        }
    }

    formatNumber(number) {
        return number.toLocaleString('ko-KR');
    }

    showRecordManagement() {
        const modal = document.createElement('div');
        modal.className = 'record-management';
        modal.innerHTML = `
            <div class="record-management-content">
                <h2>기록 관리</h2>
                <div class="record-controls">
                    <button id="export-records">기록 내보내기</button>
                    <button id="import-records">기록 가져오기</button>
                    <input type="file" id="import-file" accept=".json" style="display: none;">
                </div>
                <div class="record-list">
                    ${this.leaderboard.map((record, index) => `
                        <div class="record-item">
                            <div>
                                <strong>${index + 1}위</strong> - ${record.name}
                                <br>
                                ${this.formatNumber(record.score)}원 (${record.profitRate}%)
                                <br>
                                난이도: ${record.difficulty === 'easy' ? '쉬움' : '어려움'}
                                <br>
                                시간: ${new Date(record.time).toLocaleString()}
                            </div>
                            <div class="record-actions">
                                <button class="delete-record" data-index="${index}">삭제</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="add-record-form">
                    <h3>새 기록 추가</h3>
                    <input type="text" id="new-record-name" placeholder="이름" maxlength="20">
                    <input type="text" id="new-record-score" placeholder="점수" maxlength="20">
                    <input type="text" id="new-record-profit" placeholder="수익률 (%)" maxlength="20">
                    <select id="new-record-difficulty">
                        <option value="easy">쉬움</option>
                        <option value="hard">어려움</option>
                    </select>
                    <button id="add-record">추가</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 내보내기 버튼 이벤트
        modal.querySelector('#export-records').addEventListener('click', () => {
            const data = JSON.stringify(this.leaderboard, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `주식게임_기록_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        // 가져오기 버튼 이벤트
        modal.querySelector('#import-records').addEventListener('click', () => {
            const fileInput = modal.querySelector('#import-file');
            fileInput.click();
        });

        // 파일 선택 이벤트
        modal.querySelector('#import-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedRecords = JSON.parse(event.target.result);
                        if (Array.isArray(importedRecords)) {
                            this.leaderboard = importedRecords;
                            this.saveLeaderboard();
                            this.updateLeaderboard();
                            alert('기록이 성공적으로 가져와졌습니다!');
                            this.showRecordManagement();
                        } else {
                            alert('잘못된 형식의 파일입니다!');
                        }
                    } catch (error) {
                        alert('파일을 읽는 중 오류가 발생했습니다!');
                    }
                };
                reader.readAsText(file);
            }
        });

        // 삭제 버튼 이벤트
        modal.querySelectorAll('.delete-record').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.leaderboard.splice(index, 1);
                this.saveLeaderboard();
                this.updateLeaderboard();
                this.showRecordManagement();
            });
        });

        // 추가 버튼 이벤트
        modal.querySelector('#add-record').addEventListener('click', () => {
            const name = document.getElementById('new-record-name').value.trim();
            const score = parseInt(document.getElementById('new-record-score').value);
            const profit = parseFloat(document.getElementById('new-record-profit').value);
            const difficulty = document.getElementById('new-record-difficulty').value;

            if (name && !isNaN(score) && !isNaN(profit)) {
                this.leaderboard.push({
                    name: name,
                    score: score,
                    profitRate: profit.toFixed(2),
                    difficulty: difficulty,
                    time: new Date().toISOString()
                });
                this.leaderboard.sort((a, b) => b.score - a.score);
                this.leaderboard = this.leaderboard.slice(0, 10);
                this.saveLeaderboard();
                this.updateLeaderboard();
                this.showRecordManagement();
            } else {
                alert('모든 필드를 올바르게 입력해주세요!');
            }
        });

        // 모달 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    saveLeaderboard() {
        localStorage.setItem('stockGameScores', JSON.stringify(this.leaderboard));
    }
}

// 전역 변수로 시뮬레이터 인스턴스 저장
let stockSimulator;

window.onload = () => {
    stockSimulator = new StockSimulator();
}; 
