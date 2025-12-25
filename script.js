let yaGames = null;
let isYandexPlatform = false;

let state = {
    sand: 0, concentrate: 0, gold: 0, money: 0,
    prestigePoints: 0, multiplier: 1,
    chanceMod: 0.05, yieldMod: 5, goldPrice: 50,
    upgrades: {
        manualMining: { level: 0, baseCost: 50, name: '⛏️ Добыча песка' },
        manualRefining: { level: 0, baseCost: 50, name: '💧 Промывка песка' },
        manualExtraction: { level: 0, baseCost: 75, name: '✨ Очистка концентрата' },
        autoMining: { level: 0, baseCost: 75, name: '🤖 Авто-добыча' },
        autoRefining: { level: 0, baseCost: 75, name: '🤖 Авто-промывка' },
        autoExtraction: { level: 0, baseCost: 100, name: '🤖 Авто-очистка' },
        speedMining: { level: 0, baseCost: 150, name: '⚡ Скорость добычи' },
        speedRefining: { level: 0, baseCost: 150, name: '⚡ Скорость промывки' },
        speedExtraction: { level: 0, baseCost: 250, name: '⚡ Скорость очистки' }
    }
};

const prestigeCosts = [100, 500, 700, 1000, 1500, 2500, 3000, 3500, 4000, 5000];
const MAX_PRESTIGE = 10;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playClickSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

function spawnEffect(event, selector, text, color = null) {
    let x, y;
    if (event && event.clientX) { x = event.clientX; y = event.clientY; }
    else {
        const target = event ? event.target : document.querySelector(selector || '.main-click-btn');
        const rect = target.getBoundingClientRect();
        x = rect.left + rect.width / 2; y = rect.top;
    }
    const el = document.createElement('div');
    el.className = 'floating-text';
    if (color) el.style.color = color;
    el.innerText = text; el.style.left = `${x}px`; el.style.top = `${y}px`;
    document.getElementById('click-effects-container').appendChild(el);
    setTimeout(() => el.remove(), 800);
}

async function initializeGame() {
    try {
        yaGames = await YaGames.init();
        isYandexPlatform = true;
        console.log('Яндекс SDK успешно загружен');
        
        const player = await yaGames.getPlayer();
        console.log('Игрок:', player);
        
        await yaGames.adv.showBannerAdv();
        await loadGameFromCloud();
        
    } catch (error) {
        console.log('Яндекс SDK не загружен, используем локальный режим:', error);
        isYandexPlatform = false;
        loadGameLocal();
    }
    
    document.getElementById('game-container').classList.add('loaded');
    document.getElementById('loading-screen').style.opacity = '0';
    
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 500);
    
    setupEventListeners();
    updateUI();
    startGameTimers();
}

async function saveGameToCloud() {
    if (!isYandexPlatform) {
        saveGameLocal();
        return;
    }
    
    try {
        const saveData = JSON.stringify(state);
        await yaGames.saves.setGameSave(saveData);
        console.log('Игра сохранена в облако');
    } catch (error) {
        console.error('Ошибка сохранения в облако:', error);
        saveGameLocal();
    }
}

async function loadGameFromCloud() {
    if (!isYandexPlatform) {
        loadGameLocal();
        return;
    }
    
    try {
        const saveData = await yaGames.saves.getGameSave();
        if (saveData) {
            const loadedState = JSON.parse(saveData);
            Object.assign(state, loadedState);
            console.log('Игра загружена из облака');
        } else {
            console.log('Сохранение не найдено, начинаем новую игру');
        }
    } catch (error) {
        console.error('Ошибка загрузки из облака:', error);
        loadGameLocal();
    }
}

function saveGameLocal() {
    try {
        localStorage.setItem('gold_miner_save', JSON.stringify(state));
        console.log('Игра сохранена локально');
    } catch (error) {
        console.error('Ошибка локального сохранения:', error);
    }
}

function loadGameLocal() {
    try {
        const saveData = localStorage.getItem('gold_miner_save');
        if (saveData) {
            const loadedState = JSON.parse(saveData);
            Object.assign(state, loadedState);
            console.log('Игра загружена локально');
        }
    } catch (error) {
        console.error('Ошибка локальной загрузки:', error);
    }
}

async function showRewardedAd() {
    if (!isYandexPlatform) {
        activateMultiplier();
        return;
    }
    
    try {
        await yaGames.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => console.log('Реклама открыта'),
                onClose: () => console.log('Реклама закрыта'),
                onError: (error) => {
                    console.error('Ошибка рекламы:', error);
                    if (!isYandexPlatform) {
                        activateMultiplier();
                    }
                },
                onRewarded: () => {
                    console.log('Награда получена');
                    activateMultiplier();
                }
            }
        });
    } catch (error) {
        console.error('Ошибка показа рекламы:', error);
        if (!isYandexPlatform) {
            activateMultiplier();
        }
    }
}

function activateMultiplier() {
    state.multiplier = 2;
    
    document.body.style.boxShadow = '0 0 30px gold';
    setTimeout(() => {
        document.body.style.boxShadow = '';
    }, 1000);
    
    const bonusMsg = document.createElement('div');
    bonusMsg.className = 'floating-text';
    bonusMsg.innerText = '🚀 x2 АКТИВИРОВАН!';
    bonusMsg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2rem;
        color: gold;
        z-index: 1000;
        text-shadow: 0 0 20px red;
    `;
    document.getElementById('click-effects-container').appendChild(bonusMsg);
    
    setTimeout(() => {
        bonusMsg.remove();
    }, 2000);
    
    setTimeout(() => {
        state.multiplier = 1;
        updateUI();
        
        const endMsg = document.createElement('div');
        endMsg.className = 'floating-text';
        endMsg.innerText = 'Бонус окончен';
        endMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.5rem;
            color: silver;
            z-index: 1000;
        `;
        document.getElementById('click-effects-container').appendChild(endMsg);
        
        setTimeout(() => {
            endMsg.remove();
        }, 1500);
        
    }, 60000);
    
    updateUI();
    saveGameToCloud();
}

function startGameTimers() {
    setInterval(() => {
        state.chanceMod = Math.max(0.01, 0.05 * (1 + (Math.random() * 0.3 - 0.15)));
        state.yieldMod = Math.max(1, 5 * (1 + (Math.random() * 0.3 - 0.15)));
        state.goldPrice = Math.floor(50 + (Math.random() * 40 - 20)); 
        updateUI();
    }, 10000);

    setInterval(() => {
        let changed = false;
        let pMult = (1 + state.prestigePoints);
        
        if (state.upgrades.autoMining.level > 0) { 
            let autoMiningVolume = Math.pow(1.1, state.upgrades.autoMining.level) * pMult;
            for (let i = 0; i < state.upgrades.speedMining.level + 1; i++) {
                state.sand += autoMiningVolume;
                changed = true;
            }
        }
        
        if (state.upgrades.autoRefining.level > 0) { 
            let autoRefiningVolume = Math.pow(1.1, state.upgrades.autoRefining.level) * pMult;
            for (let i = 0; i < state.upgrades.speedRefining.level + 1; i++) {
                if (state.sand >= autoRefiningVolume) {
                    state.sand -= autoRefiningVolume;
                    if (Math.random() < state.chanceMod) {
                        let gained = state.yieldMod * autoRefiningVolume; 
                        state.concentrate += gained;
                    }
                    changed = true;
                }
            }
        }
        
        if (state.upgrades.autoExtraction.level > 0) { 
            let autoExtractionVolume = Math.pow(1.1, state.upgrades.autoExtraction.level) * pMult;
            for (let i = 0; i < state.upgrades.speedExtraction.level + 1; i++) {
                if (state.concentrate >= autoExtractionVolume) {
                    state.concentrate -= autoExtractionVolume;
                    if (Math.random() < 0.30) {
                        state.gold += autoExtractionVolume;
                    }
                    changed = true;
                }
            }
        }
        
        if (changed) {
            updateUI();
            saveGameToCloud();
        }
    }, 1000);
}

function setupEventListeners() {
    document.getElementById('mine-btn').addEventListener('click', mineSand);
    document.getElementById('process-btn').addEventListener('click', processSand);
    document.getElementById('extract-btn').addEventListener('click', extractGold);
    document.getElementById('sell-btn').addEventListener('click', sellGold);
    document.getElementById('ads-btn').addEventListener('click', showRewardedAd);
    document.getElementById('prestige-btn').addEventListener('click', applyPrestige);
    
    document.getElementById('tab-mining-btn').addEventListener('click', () => showTab('tab-mining'));
    document.getElementById('tab-upgrades-btn').addEventListener('click', () => showTab('tab-upgrades'));
    document.getElementById('tab-prestige-btn').addEventListener('click', () => showTab('tab-prestige'));
    
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('mousedown', () => button.classList.add('pressed'));
        button.addEventListener('mouseup', () => button.classList.remove('pressed'));
        button.addEventListener('mouseleave', () => button.classList.remove('pressed'));
        
        button.addEventListener('touchstart', () => button.classList.add('pressed'));
        button.addEventListener('touchend', () => button.classList.remove('pressed'));
    });
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

function mineSand(event) {
    let vol = Math.pow(1.1, state.upgrades.manualMining.level) * (1 + state.prestigePoints) * state.multiplier;
    state.sand += vol;
    playClickSound(); 
    spawnEffect(event, '.main-click-btn', `+${vol.toFixed(1)}кг`); 
    updateUI();
    saveGameToCloud();
}

function processSand(event) {
    let vol = Math.pow(1.1, state.upgrades.manualRefining.level) * (1 + state.prestigePoints) * state.multiplier;
    if (state.sand >= vol) {
        state.sand -= vol;
        if (Math.random() < state.chanceMod) {
            let gained = state.yieldMod * vol; 
            state.concentrate += gained;
            spawnEffect(event, null, `+${gained.toFixed(1)}г`, "#3498db");
        }
        playClickSound(); 
        updateUI();
        saveGameToCloud();
    }
}

function extractGold(event) {
    let vol = Math.pow(1.1, state.upgrades.manualExtraction.level) * (1 + state.prestigePoints) * state.multiplier;
    if (state.concentrate >= vol) {
        state.concentrate -= vol;
        if (Math.random() < 0.30) {
            state.gold += vol;
            spawnEffect(event, null, `+${vol.toFixed(1)}г золота!`, "#f1c40f");
        }
        playClickSound(); 
        updateUI();
        saveGameToCloud();
    }
}

function sellGold() { 
    state.money += state.gold * state.goldPrice; 
    state.gold = 0; 
    updateUI(); 
    saveGameToCloud();
}

function buyUpgrade(type) {
    let u = state.upgrades[type];
    let cost = Math.floor(u.baseCost * Math.pow(1.15, u.level));
    if (state.money >= cost) { 
        state.money -= cost; 
        u.level++; 
        playClickSound(); 
        updateUI(); 
        saveGameToCloud();
    }
}

function applyPrestige() {
    if (state.prestigePoints < MAX_PRESTIGE) {
        let cost = prestigeCosts[state.prestigePoints];
        if (state.gold >= cost) {
            state.prestigePoints++;
            state.gold = 0; state.sand = 0; state.concentrate = 0; state.money = 0;
            Object.keys(state.upgrades).forEach(key => {
                state.upgrades[key].level = 0;
            });
            updateUI();
            saveGameToCloud();
            alert(state.prestigePoints === MAX_PRESTIGE ? "ФИНАЛ! Вы добыли все золото!" : "Престиж получен!");
        }
    }
}

function updateUI() {
    document.getElementById('money-display').innerText = Math.floor(state.money).toLocaleString();
    document.getElementById('gold-display').innerText = Math.floor(state.gold).toLocaleString();
    document.getElementById('sand-display').innerText = state.sand.toFixed(1);
    document.getElementById('conc-display').innerText = state.concentrate.toFixed(1);
    document.getElementById('chance-val').innerText = (state.chanceMod * 100).toFixed(1) + '%';
    document.getElementById('yield-val').innerText = state.yieldMod.toFixed(1) + 'г';
    document.getElementById('price-val').innerText = state.goldPrice;
    
    let pMult = (1 + state.prestigePoints);
    document.getElementById('process-amount').innerText = (Math.pow(1.1, state.upgrades.manualRefining.level) * pMult * state.multiplier).toFixed(1);
    document.getElementById('extract-amount').innerText = (Math.pow(1.1, state.upgrades.manualExtraction.level) * pMult * state.multiplier).toFixed(1);
    document.getElementById('process-chance-ui').innerText = (state.chanceMod * 100).toFixed(1);
    
    document.getElementById('prestige-val').innerText = state.prestigePoints;
    document.getElementById('prestige-bonus').innerText = (state.prestigePoints * 100);
    
    const pBtn = document.getElementById('prestige-btn');
    if (state.prestigePoints < MAX_PRESTIGE) {
        let cost = prestigeCosts[state.prestigePoints];
        document.getElementById('prestige-status').innerHTML = `Нужно <b>${cost}г</b> золота`;
        pBtn.disabled = state.gold < cost;
    } else {
        document.getElementById('prestige-status').innerText = "Месторождения исчерпаны!"; 
        pBtn.disabled = true;
    }
    renderUpgrades();
}

function renderUpgrades() {
    const manualC = document.getElementById('upgrades-container-manual');
    manualC.innerHTML = '';
    
    const manualUpgrades = ['manualMining', 'manualRefining', 'manualExtraction'];
    manualUpgrades.forEach(k => {
        let u = state.upgrades[k];
        let cost = Math.floor(u.baseCost * Math.pow(1.15, u.level));
        manualC.innerHTML += `
            <div class="upgr-card">
                <div>
                    <b>${u.name}</b><br>
                    <small>Уровень: ${u.level}</small><br>
                    <small>+${(Math.pow(1.1, u.level + 1) - Math.pow(1.1, u.level)).toFixed(2)}x объём</small>
                </div>
                <button onclick="buyUpgrade('${k}')" ${state.money<cost?'disabled':''}>$${cost}</button>
            </div>`;
    });
    
    const autoC = document.getElementById('upgrades-container-auto');
    autoC.innerHTML = '';
    
    const autoUpgrades = ['autoMining', 'autoRefining', 'autoExtraction'];
    autoUpgrades.forEach(k => {
        let u = state.upgrades[k];
        let cost = Math.floor(u.baseCost * Math.pow(1.15, u.level));
        autoC.innerHTML += `
            <div class="upgr-card">
                <div>
                    <b>${u.name}</b><br>
                    <small>Уровень: ${u.level}</small><br>
                    <small>+${(Math.pow(1.1, u.level + 1) - Math.pow(1.1, u.level)).toFixed(2)}x авто-объём</small>
                </div>
                <button onclick="buyUpgrade('${k}')" ${state.money<cost?'disabled':''}>$${cost}</button>
            </div>`;
    });
    
    const speedC = document.getElementById('upgrades-container-speed');
    speedC.innerHTML = '';
    
    const speedUpgrades = ['speedMining', 'speedRefining', 'speedExtraction'];
    speedUpgrades.forEach(k => {
        let u = state.upgrades[k];
        let cost = Math.floor(u.baseCost * Math.pow(1.15, u.level));
        speedC.innerHTML += `
            <div class="upgr-card">
                <div>
                    <b>${u.name}</b><br>
                    <small>Уровень: ${u.level}</small><br>
                    <small>${u.level + 1} операций/сек</small>
                </div>
                <button onclick="buyUpgrade('${k}')" ${state.money<cost?'disabled':''}>$${cost}</button>
            </div>`;
    });
}

window.debug = {
    setMoney: (v) => { state.money = v; updateUI(); },
    setGold: (v) => { state.gold = v; updateUI(); },
    setSand: (v) => { state.sand = v; updateUI(); },
    setConcentrate: (v) => { state.concentrate = v; updateUI(); },
    help: () => { 
        console.log("Доступные команды:");
        console.log("debug.setMoney(n) - установить деньги");
        console.log("debug.setGold(n) - установить золото");
        console.log("debug.setSand(n) - установить песок");
        console.log("debug.setConcentrate(n) - установить концентрат");
        console.log("debug.reset() - сбросить игру");
        return "Удачи в отладке!";
    },
    reset: () => { 
        state = {
            sand: 0, concentrate: 0, gold: 0, money: 0,
            prestigePoints: 0, multiplier: 1,
            chanceMod: 0.05, yieldMod: 5, goldPrice: 50,
            upgrades: {
                manualMining: { level: 0, baseCost: 50, name: '⛏️ Добыча песка' },
                manualRefining: { level: 0, baseCost: 50, name: '💧 Промывка песка' },
                manualExtraction: { level: 0, baseCost: 75, name: '✨ Очистка концентрата' },
                autoMining: { level: 0, baseCost: 75, name: '🤖 Авто-добыча' },
                autoRefining: { level: 0, baseCost: 75, name: '🤖 Авто-промывка' },
                autoExtraction: { level: 0, baseCost: 100, name: '🤖 Авто-очистка' },
                speedMining: { level: 0, baseCost: 150, name: '⚡ Скорость добычи' },
                speedRefining: { level: 0, baseCost: 150, name: '⚡ Скорость промывки' },
                speedExtraction: { level: 0, baseCost: 250, name: '⚡ Скорость очистки' }
            }
        };
        updateUI();
        saveGameToCloud();
        alert("Игра сброшена!");
    }
};

console.log("%c Золотоискатель by TRRM, дебажить через debug.help()", "color: gold; font-weight: bold; font-size: 16px;");

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}