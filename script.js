let state = {
    sand: 0, concentrate: 0, gold: 0, money: 0,
    prestigePoints: 0, multiplier: 1,
    chanceMod: 0.05, yieldMod: 5, goldPrice: 50,
    upgrades: {
        mining: { level: 0, autoLevel: 0, baseCost: 50, name: 'Добыча' },
        refining: { level: 0, autoLevel: 0, baseCost: 50, name: 'Промывка' },
        extraction: { level: 0, autoLevel: 0, baseCost: 50, name: 'Очистка' }
    }
};

const prestigeCosts = [100, 500, 700, 1000, 1500, 2500, 3000, 3500, 4000, 5000];
const MAX_PRESTIGE = 10;

// --- СИСТЕМА ЗВУКА ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playClickSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

// --- ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ---
function createFloatingText(x, y, text) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.marginLeft = `${(Math.random() - 0.5) * 40}px`;
    document.getElementById('click-effects-container').appendChild(el);
    setTimeout(() => el.remove(), 800);
}

// Загрузка
loadGame();
updateUI();

// Рынок (10 сек)
setInterval(() => {
    state.chanceMod = Math.max(0.01, 0.05 * (1 + (Math.random() * 0.3 - 0.15)));
    state.yieldMod = Math.max(1, 5 * (1 + (Math.random() * 0.3 - 0.15)));
    state.goldPrice = Math.floor(50 + (Math.random() * 40 - 20)); 
    updateUI();
}, 10000);

// Автоматизация (1 сек)
setInterval(() => {
    let changed = false;
    if (state.upgrades.mining.autoLevel > 0) {
        for (let i = 0; i < state.upgrades.mining.autoLevel; i++) mineSand(null, true);
        changed = true;
    }
    if (state.upgrades.refining.autoLevel > 0) {
        for (let i = 0; i < state.upgrades.refining.autoLevel; i++) processSand(true);
        changed = true;
    }
    if (state.upgrades.extraction.autoLevel > 0) {
        for (let i = 0; i < state.upgrades.extraction.autoLevel; i++) extractGold(true);
        changed = true;
    }
    if (changed) updateUI();
}, 1000);

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

function mineSand(event, silent = false) {
    let vol = Math.pow(1.1, state.upgrades.mining.level);
    let totalPower = vol * (1 + state.prestigePoints) * state.multiplier;
    state.sand += totalPower;

    if (!silent) {
        playClickSound();
        if (event && event.clientX) {
            createFloatingText(event.clientX, event.clientY, `+${totalPower.toFixed(1)}`);
        } else {
            const btn = document.querySelector('.main-click-btn');
            const rect = btn.getBoundingClientRect();
            createFloatingText(rect.left + rect.width/2, rect.top, `+${totalPower.toFixed(1)}`);
        }
        updateUI();
    }
}

function processSand(silent = false) {
    let vol = Math.pow(1.1, state.upgrades.refining.level);
    if (state.sand >= vol) {
        state.sand -= vol;
        if (Math.random() < state.chanceMod) state.concentrate += state.yieldMod * vol;
    }
    if (!silent) updateUI();
}

function extractGold(silent = false) {
    let vol = Math.pow(1.1, state.upgrades.extraction.level);
    if (state.concentrate >= vol) {
        state.concentrate -= vol;
        if (Math.random() < 0.30) state.gold += vol;
    }
    if (!silent) updateUI();
}

function sellGold() {
    state.money += state.gold * state.goldPrice;
    state.gold = 0;
    updateUI();
    saveGame();
}

function buyUpgrade(type, isAuto) {
    let u = state.upgrades[type];
    let key = isAuto ? 'autoLevel' : 'level';
    let base = isAuto ? u.baseCost * 2 : u.baseCost;
    let cost = Math.floor(base * Math.pow(1.15, u[key]));
    if (state.money >= cost) {
        state.money -= cost;
        u[key]++;
        saveGame();
        updateUI();
    }
}

function applyPrestige() {
    if (state.prestigePoints < MAX_PRESTIGE) {
        let cost = prestigeCosts[state.prestigePoints];
        if (state.gold >= cost) {
            state.prestigePoints++;
            state.gold = 0; state.sand = 0; state.concentrate = 0; state.money = 0;
            Object.values(state.upgrades).forEach(u => { u.level = 0; u.autoLevel = 0; });
            saveGame();
            updateUI();
            alert(state.prestigePoints === MAX_PRESTIGE ? "ПОБЕДА! Все месторождения ваши!" : "Престиж получен!");
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
    document.getElementById('process-amount').innerText = Math.pow(1.1, state.upgrades.refining.level).toFixed(1);
    document.getElementById('process-chance-ui').innerText = (state.chanceMod * 100).toFixed(1);
    document.getElementById('extract-amount').innerText = Math.pow(1.1, state.upgrades.extraction.level).toFixed(1);
    document.getElementById('prestige-val').innerText = state.prestigePoints;
    document.getElementById('prestige-bonus').innerText = (state.prestigePoints * 100);
    
    const pBtn = document.getElementById('prestige-btn');
    const pStat = document.getElementById('prestige-status');
    if (state.prestigePoints < MAX_PRESTIGE) {
        let cost = prestigeCosts[state.prestigePoints];
        pStat.innerHTML = `Требуется <b>${cost}г</b> золота для сброса`;
        pBtn.disabled = state.gold < cost;
    } else {
        pStat.innerText = "Игра пройдена!";
        pBtn.disabled = true;
        pBtn.innerText = "МАКСИМУМ";
    }
    renderUpgrades();
}

function renderUpgrades() {
    const eC = document.getElementById('upgrades-container-eff');
    const aC = document.getElementById('upgrades-container-auto');
    eC.innerHTML = ''; aC.innerHTML = '';
    Object.keys(state.upgrades).forEach(k => {
        let u = state.upgrades[k];
        let cE = Math.floor(u.baseCost * Math.pow(1.15, u.level));
        eC.innerHTML += `<div class="upgr-card"><div><b>${u.name}</b><br><small>Ур.${u.level}</small></div><button onclick="buyUpgrade('${k}',false)" ${state.money<cE?'disabled':''}>$${cE}</button></div>`;
        let cA = Math.floor((u.baseCost*2) * Math.pow(1.15, u.autoLevel));
        aC.innerHTML += `<div class="upgr-card"><div><b>Авто-${u.name}</b><br><small>Ур.${u.autoLevel}</small></div><button onclick="buyUpgrade('${k}',true)" ${state.money<cA?'disabled':''}>$${cA}</button></div>`;
    });
}

function watchAds() {
    state.multiplier = 2;
    setTimeout(() => { state.multiplier = 1; updateUI(); }, 60000);
    updateUI();
    alert("Бонус x2 активирован!");
}

function saveGame() { localStorage.setItem('goldMiner_final_2025_v2', JSON.stringify(state)); }
function loadGame() { let d = localStorage.getItem('goldMiner_final_2025_v2'); if (d) state = Object.assign(state, JSON.parse(d)); }

// ОТЛАДКА
window.debug = {
    help: () => console.log("debug.setMoney(n), debug.setGold(n), debug.setUpgr(t, l), debug.setAuto(t, l), debug.reset()"),
    setMoney: (v) => { state.money = v; updateUI(); },
    setGold: (v) => { state.gold = v; updateUI(); },
    setUpgr: (t, l) => { if(state.upgrades[t]) state.upgrades[t].level = l; updateUI(); },
    setAuto: (t, l) => { if(state.upgrades[t]) state.upgrades[t].autoLevel = l; updateUI(); },
    reset: () => { localStorage.clear(); location.reload(); }
};
console.log("%c Золотодобытчик 2025: Отладка активна. Введите %cdebug.help()%c", "color: gold; font-weight: bold;", "background: #222; color: #bada55; padding: 2px 5px;", "color: gold;");
