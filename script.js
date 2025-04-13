class StockSimulator {
    constructor() {
        this.initialCash = 1000000;
        this.cash = this.initialCash;
        this.holdings = 0;
        this.currentPrice = 50000;
        this.priceHistory = [this.currentPrice];
        this.chart = null;
        this.gameInterval = null;
        this.timeLeft = 120; // 2분
        this.isGameRunning = false;
        this.difficulty = 'easy'; // 기본값을 쉬움으로 변경
        this.volatility = 0.015;
        this.trendStrength = 0.3;
        this.trend = 0;
        this.adminPassword = 'admin123!@#'; // 관리자 비밀번호
        this.items = {
            '시간 정지': { price: 50000, duration: 10, used: false, active: false, startTime: null },
            '가격 고정': { price: 30000, duration: 5, used: false, active: false, startTime: null, fixedPrice: null },
            '이중 수익': { price: 100000, duration: 15, used: false, active: false, startTime: null, startPrice: null },
            '리스크 헤지': { price: 80000, duration: 20, used: false, active: false, startTime: null },
            '마지막 기회': { price: 150000, duration: 5, used: false, active: false, startTime: null }
        };
        this.activeEffects = [];
        this.eventHistory = [];
        
        this.achievements = {
            '초보 투자자': { description: '첫 거래 완료', achieved: false },
            '수익왕': { description: '수익률 100% 달성', achieved: false },
            '대부호': { description: '총 자산 1억 달성', achieved: false },
            '연속 수익': { description: '연속으로 5번 수익 실현', achieved: false },
            '리스크 테이커': { description: '전 재산을 한번에 투자', achieved: false }
        };
        
        this.dailyQuests = [
            { description: '10번 거래하기', target: 10, current: 0, reward: 100000, completed: false },
            { description: '50% 수익 달성하기', target: 50, current: 0, reward: 200000, completed: false },
            { description: '3번 아이템 사용하기', target: 3, current: 0, reward: 50000, completed: false }
        ];
        
        this.specialEvents = [
            { name: '황금시간', description: '1분간 모든 거래의 수수료가 없어집니다!', duration: 60 },
            { name: '급등장', description: '주가가 급격히 상승합니다!', duration: 10 },
            { name: '더블찬스', description: '1분간 모든 수익이 2배가 됩니다!', duration: 60 }
        ];
        
        localStorage.removeItem('stockGameAchievements');
        
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
                datasets: [
                    {
                        label: '현재가',
                        data: this.priceHistory,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        fill: false,
                        pointRadius: 0,
                        borderWidth: 4,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: 'rgb(75, 192, 192)',
                        order: 1
                    },
                    {
                        label: '3초 이동평균',
                        data: [],
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 3,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.1,
                        order: 2
                    },
                    {
                        label: '10초 이동평균',
                        data: [],
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 3,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.1,
                        order: 3
                    },
                    {
                        label: '상단 밴드',
                        data: [],
                        borderColor: 'rgba(128, 128, 128, 0.8)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.1,
                        borderDash: [5, 5],
                        order: 4
                    },
                    {
                        label: '하단 밴드',
                        data: [],
                        borderColor: 'rgba(128, 128, 128, 0.8)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: '-1',
                        backgroundColor: 'rgba(128, 128, 128, 0.15)',
                        tension: 0.1,
                        borderDash: [5, 5],
                        order: 5
                    },
                    {
                        label: '추세선',
                        data: [],
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 3,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.1,
                        borderDash: [5, 5],
                        order: 6
                    }
                ]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 0
                },
                interaction: {
                    mode: 'index',
                    intersect: false
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
                            color: 'rgba(0, 0, 0, 0.15)',
                            lineWidth: 1
                        },
                        ticks: {
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12,
                                weight: 'bold'
                            },
                            filter: function(legendItem, data) {
                                return legendItem.text !== '하단 밴드';
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.y.toLocaleString() + '원';
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // 이동평균 계산 함수 추가
    calculateMovingAverage(data, period) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(null);
                continue;
            }
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(Math.round(sum / period));
        }
        return result;
    }

    // 추세선 계산 함수 추가
    calculateTrendLine(data, period) {
        const result = [];
        const trendPeriod = Math.min(period, data.length);
        
        for (let i = 0; i < data.length; i++) {
            if (i < trendPeriod - 1) {
                result.push(null);
                continue;
            }
            
            const recentData = data.slice(i - trendPeriod + 1, i + 1);
            const firstPrice = recentData[0];
            const lastPrice = recentData[recentData.length - 1];
            const trend = (lastPrice - firstPrice) / firstPrice;
            
            // 다음 가격 예측
            const predictedPrice = Math.round(lastPrice * (1 + trend));
            result.push(predictedPrice);
        }
        return result;
    }

    // 볼린저 밴드 계산 함수 추가
    calculateBollingerBands(data, period = 10, multiplier = 2) {
        const result = {
            upper: [],
            lower: []
        };

        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.upper.push(null);
                result.lower.push(null);
                continue;
            }

            const slice = data.slice(i - period + 1, i + 1);
            const avg = slice.reduce((a, b) => a + b, 0) / period;
            
            // 표준편차 계산
            const sqrSum = slice.reduce((a, b) => a + Math.pow(b - avg, 2), 0);
            const std = Math.sqrt(sqrSum / period);

            result.upper.push(Math.round(avg + (multiplier * std)));
            result.lower.push(Math.round(avg - (multiplier * std)));
        }

        return result;
    }

    updateChart() {
        const labels = Array.from({ length: this.priceHistory.length }, (_, i) => i.toString());
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = this.priceHistory;
        
        // 3초 이동평균선 업데이트
        const shortMA = this.calculateMovingAverage(this.priceHistory, 3);
        this.chart.data.datasets[1].data = shortMA;
        
        // 10초 이동평균선 업데이트
        const longMA = this.calculateMovingAverage(this.priceHistory, 10);
        this.chart.data.datasets[2].data = longMA;

        // 볼린저 밴드 업데이트
        const bands = this.calculateBollingerBands(this.priceHistory, 10, 2);
        this.chart.data.datasets[3].data = bands.upper;
        this.chart.data.datasets[4].data = bands.lower;
        
        // 추세선 업데이트
        const trendLine = this.calculateTrendLine(this.priceHistory, 10);
        this.chart.data.datasets[5].data = trendLine;
        
        // PC와 모바일 환경에 따라 다른 Y축 범위 설정
        const currentPrice = this.currentPrice;
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // 모바일: 현재 가격의 ±60%
            const minPrice = Math.max(0, currentPrice * 0.4);
            const maxPrice = currentPrice * 1.6;
            this.chart.options.scales.y.min = minPrice;
            this.chart.options.scales.y.max = maxPrice;
        } else {
            // PC: 현재 가격의 ±200% (더 넓은 범위로 확대)
            const minPrice = Math.max(0, currentPrice * 0.05);
            const maxPrice = currentPrice * 3.0;
            this.chart.options.scales.y.min = minPrice;
            this.chart.options.scales.y.max = maxPrice;
        }
        
        this.chart.update('none');
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

        // 기능 모달 토글 버튼
        const featuresToggle = document.getElementById('features-toggle');
        featuresToggle.addEventListener('click', () => {
            const modal = document.getElementById('features-modal');
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
                featuresToggle.classList.remove('active');
                featuresToggle.querySelector('span').textContent = '🎮';
            } else {
                modal.classList.add('show');
                featuresToggle.classList.add('active');
                featuresToggle.querySelector('span').textContent = '✖';
                this.updateModalContents();
            }
        });

        // 모달 외부 클릭 시 닫기
        document.getElementById('features-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.target.classList.remove('show');
                const featuresToggle = document.getElementById('features-toggle');
                featuresToggle.classList.remove('active');
                featuresToggle.querySelector('span').textContent = '🎮';
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
        
        // 난이도 설정 업데이트
        this.updateDifficultySettings();
        
        // 그래프 업데이트 인터벌
        this.gameInterval = setInterval(() => {
            this.updatePrice();
        }, this.updateInterval);

        // 시간 업데이트 인터벌
        this.timeInterval = setInterval(() => {
            this.updateTimer();
        }, 1000); // 항상 1초 간격으로 시간 업데이트
    }

    resetGame() {
        this.cash = this.initialCash;
        this.holdings = 0;
        this.currentPrice = 50000;
        this.priceHistory = [this.currentPrice];
        this.timeLeft = 120;
        this.trend = 0;
        
        // 아이템 초기화
        Object.values(this.items).forEach(item => {
            item.used = false;
            item.active = false;
            item.startTime = null;
            item.fixedPrice = null;
            item.startPrice = null;
        });

        // 업적 초기화
        this.achievements = {
            '초보 투자자': { description: '첫 거래 완료', achieved: false },
            '수익왕': { description: '수익률 100% 달성', achieved: false },
            '대부호': { description: '총 자산 1억 달성', achieved: false },
            '연속 수익': { description: '연속으로 5번 수익 실현', achieved: false },
            '리스크 테이커': { description: '전 재산을 한번에 투자', achieved: false }
        };
        localStorage.removeItem('stockGameAchievements');

        // 퀘스트 초기화
        this.dailyQuests = [
            { description: '10번 거래하기', target: 10, current: 0, reward: 100000, completed: false },
            { description: '50% 수익 달성하기', target: 50, current: 0, reward: 200000, completed: false },
            { description: '3번 아이템 사용하기', target: 3, current: 0, reward: 50000, completed: false }
        ];

        // 이벤트 히스토리 초기화
        this.eventHistory = [];
        
        this.updateChart();
        this.updateUI();
        this.updateModalContents();
        this.updateEventLog();
        
        document.getElementById('start-btn').disabled = false;
        document.getElementById('buy-btn').disabled = true;
        document.getElementById('sell-btn').disabled = true;
        document.getElementById('difficulty').disabled = false;
        document.getElementById('timer').classList.add('hidden');

        // 모달 상태 초기화
        const modal = document.getElementById('features-modal');
        const featuresToggle = document.getElementById('features-toggle');
        modal.classList.remove('show');
        featuresToggle.classList.remove('active');
        featuresToggle.querySelector('span').textContent = '🎮';
    }

    updateTimer() {
        // 시간 정지 아이템이 활성화되지 않은 경우에만 시간 감소
        if (!this.items['시간 정지'].active) {
            this.timeLeft--;
        }
        
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timerElement = document.getElementById('timer');
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 시간 정지 아이템 활성화 시 타이머 색상 변경
        if (this.items['시간 정지'].active) {
            timerElement.style.color = '#FFD700'; // 골드 색상으로 변경
        } else {
            timerElement.style.color = ''; // 기본 색상으로 복귀
        }

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
        // 아이템 효과 체크 및 적용
        this.checkItemEffects();
        
        // 가격 고정 아이템이 활성화된 경우 가격 변동 없음
        if (this.items['가격 고정'].active) {
            // 가격 고정 상태에서도 priceHistory에는 추가하여 그래프 연속성 유지
            this.priceHistory.push(this.currentPrice);
            if (this.priceHistory.length > 200) {
                this.priceHistory.shift();
            }
            this.updateChart();
            this.updateUI();
            return;
        }

        // 트렌드 기반 가격 변동
        this.trend = this.trend * this.trendStrength + (Math.random() - 0.5) * (1 - this.trendStrength);
        let change = this.trend * this.volatility;

        // 이중 수익 아이템이 활성화된 경우 상승폭 2배, 하락폭 1/2배
        if (this.items['이중 수익'].active) {
            if (change > 0) {
                change *= 2; // 상승 시 2배
            } else {
                change *= 0.5; // 하락 시 1/2배
            }
        }
        
        // 랜덤 이벤트 발생
        if (Math.random() < 0.01) {
            this.triggerRandomEvent();
        }
        
        this.currentPrice = Math.max(1000, Math.round(this.currentPrice * (1 + change)));
        this.priceHistory.push(this.currentPrice);
        
        if (this.priceHistory.length > 200) {
            this.priceHistory.shift();
        }

        this.updateChart();
        this.updateUI();
        this.checkAchievements();
        this.updateDailyQuests();
    }

    checkItemEffects() {
        const now = Date.now();
        
        // 각 아이템의 상태 체크
        Object.entries(this.items).forEach(([itemName, item]) => {
            if (item.active) {
                const elapsedTime = (now - item.startTime) / 1000; // 초 단위로 변환
                
                if (elapsedTime >= item.duration) {
                    // 아이템 효과 종료
                    item.active = false;
                    this.addEventMessage(`${itemName} 아이템의 효과가 종료되었습니다.`);
                } else {
                    // 아이템별 효과 적용
                    switch (itemName) {
                        case '가격 고정':
                            this.currentPrice = item.fixedPrice;
                            break;
                    }
                }
            }
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
            item.active = true;
            item.startTime = Date.now();
            
            // 아이템별 특수 효과 초기화
            switch (itemName) {
                case '가격 고정':
                    item.fixedPrice = this.currentPrice;
                    this.addEventMessage(`가격이 ${this.formatNumber(this.currentPrice)}원으로 고정되었습니다! (${item.duration}초 동안)`);
                    break;
                case '이중 수익':
                    item.startPrice = this.currentPrice;
                    this.addEventMessage(`이중 수익 모드가 활성화되었습니다! 상승폭 2배, 하락폭 1/2배 (${item.duration}초 동안)`);
                    break;
                case '시간 정지':
                    this.addEventMessage(`시간이 정지되었습니다! (${item.duration}초 동안)`);
                    break;
            }
            
            this.updateUI();
        }
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

        // 현재가 표시에 아이템 효과 상태 표시
        const currentPriceElement = document.getElementById('current-price');
        if (this.items['가격 고정'].active) {
            currentPriceElement.style.color = '#FFD700'; // 골드 색상
            currentPriceElement.style.fontWeight = 'bold';
        } else if (this.items['이중 수익'].active) {
            currentPriceElement.style.color = '#FF4500'; // 주황색
            currentPriceElement.style.fontWeight = 'bold';
        } else {
            currentPriceElement.style.color = ''; // 기본 색상
            currentPriceElement.style.fontWeight = '';
        }

        const holdingsElement = document.getElementById('holdings');
        holdingsElement.innerHTML = `
            <div class="holding-item">
                <span>보유 수량: ${this.holdings}주</span>
                <span>평가 금액: ${this.formatNumber(this.holdings * this.currentPrice)}원</span>
                ${this.items['이중 수익'].active ? '<span class="double-profit-badge">이중 수익 중!</span>' : ''}
            </div>
        `;

        // 아이템 상태 업데이트
        const itemContainer = document.getElementById('items-container');
        if (itemContainer) {
            itemContainer.innerHTML = Object.entries(this.items)
                .map(([name, item]) => {
                    let statusText = '';
                    let effectText = '';
                    
                    if (item.active) {
                        const remainingTime = Math.ceil(item.duration - (Date.now() - item.startTime) / 1000);
                        statusText = `(${remainingTime}초 남음)`;
                        
                        if (name === '이중 수익') {
                            const profitMultiplier = ((this.currentPrice / item.startPrice - 1) * 100).toFixed(2);
                            effectText = `<p class="effect-text">현재 수익률: ${profitMultiplier}%</p>`;
                        }
                    }
                    
                    return `
                        <div class="item ${item.used ? 'used' : ''} ${item.active ? 'active' : ''}">
                            <h3>${name}</h3>
                            <p>가격: ${this.formatNumber(item.price)}원</p>
                            <p>지속시간: ${item.duration}초</p>
                            <p class="item-status">${statusText}</p>
                            ${effectText}
                            <button onclick="stockSimulator.buyItem('${name}')" 
                                    ${item.used || this.cash < item.price ? 'disabled' : ''}>
                                ${item.used ? (item.active ? '사용 중' : '사용됨') : '구매'}
                            </button>
                        </div>
                    `;
                }).join('');
        }

        this.updateModalContents(); // UI 업데이트 시 모달 내용도 함께 업데이트
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

    loadAchievements() {
        const savedAchievements = localStorage.getItem('stockGameAchievements');
        if (savedAchievements) {
            this.achievements = JSON.parse(savedAchievements);
        }
    }

    saveAchievements() {
        localStorage.setItem('stockGameAchievements', JSON.stringify(this.achievements));
    }

    checkAchievements() {
        const totalAssets = this.cash + (this.holdings * this.currentPrice);
        const profitRate = ((totalAssets - this.initialCash) / this.initialCash * 100);

        if (!this.achievements['초보 투자자'].achieved && (this.holdings > 0 || this.eventHistory.length > 0)) {
            this.unlockAchievement('초보 투자자');
        }

        if (!this.achievements['수익왕'].achieved && profitRate >= 100) {
            this.unlockAchievement('수익왕');
        }

        if (!this.achievements['대부호'].achieved && totalAssets >= 100000000) {
            this.unlockAchievement('대부호');
        }

        if (!this.achievements['리스크 테이커'].achieved && 
            (this.holdings * this.currentPrice) >= this.cash * 0.95) {
            this.unlockAchievement('리스크 테이커');
        }
    }

    unlockAchievement(achievementName) {
        this.achievements[achievementName].achieved = true;
        this.saveAchievements();
        this.showAchievementNotification(achievementName);
    }

    showAchievementNotification(achievementName) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <h3>🏆 업적 달성!</h3>
            <p>${achievementName}</p>
            <p>${this.achievements[achievementName].description}</p>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    updateDailyQuests() {
        const totalAssets = this.cash + (this.holdings * this.currentPrice);
        const profitRate = ((totalAssets - this.initialCash) / this.initialCash * 100);

        this.dailyQuests[0].current = this.eventHistory.length;
        this.dailyQuests[1].current = profitRate;
        this.dailyQuests[2].current = Object.values(this.items).filter(item => item.used).length;

        this.checkQuestCompletion();
    }

    checkQuestCompletion() {
        this.dailyQuests.forEach(quest => {
            if (quest.current >= quest.target && !quest.completed) {
                quest.completed = true;
                this.cash += quest.reward;
                this.showQuestCompletionNotification(quest);
            }
        });
    }

    showQuestCompletionNotification(quest) {
        const notification = document.createElement('div');
        notification.className = 'quest-notification';
        notification.innerHTML = `
            <h3>🎯 퀘스트 완료!</h3>
            <p>${quest.description}</p>
            <p>보상: ${this.formatNumber(quest.reward)}원</p>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    updateModalContents() {
        // 업적 목록 업데이트
        const achievementsList = document.getElementById('achievements-list-modal');
        achievementsList.innerHTML = Object.entries(this.achievements)
            .map(([name, achievement]) => `
                <div class="achievement-item ${achievement.achieved ? 'achieved' : ''}">
                    <h4>${name}</h4>
                    <p>${achievement.description}</p>
                    ${achievement.achieved ? '<span class="achievement-complete">✅ 달성</span>' : ''}
                </div>
            `).join('');

        // 퀘스트 목록 업데이트
        const questsList = document.getElementById('quests-list-modal');
        questsList.innerHTML = this.dailyQuests
            .map(quest => {
                const progress = (quest.current / quest.target) * 100;
                return `
                    <div class="quest-item ${quest.completed ? 'completed' : ''}">
                        <h4>${quest.description}</h4>
                        <p>진행도: ${quest.current}/${quest.target}</p>
                        <p>보상: ${this.formatNumber(quest.reward)}원</p>
                        <div class="quest-progress">
                            <div class="quest-progress-bar" style="width: ${Math.min(100, progress)}%"></div>
                        </div>
                        ${quest.completed ? '<span class="quest-complete">✅ 완료</span>' : ''}
                    </div>
                `;
            }).join('');
    }
}

// 전역 변수로 시뮬레이터 인스턴스 저장
let stockSimulator;

window.onload = () => {
    stockSimulator = new StockSimulator();
}; 
