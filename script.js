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

// --- ЗВУК И ЭФФЕКТЫ ---
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

// --- ЛОГИКА ---
loadGame(); updateUI();

setInterval(() => {
    state.chanceMod = Math.max(0.01, 0.05 * (1 + (Math.random() * 0.3 - 0.15)));
    state.yieldMod = Math.max(1, 5 * (1 + (Math.random() * 0.3 - 0.15)));
    state.goldPrice = Math.floor(50 + (Math.random() * 40 - 20)); 
    updateUI();
}, 10000);

setInterval(() => {
    let changed = false;
    let pMult = (1 + state.prestigePoints);
    if (state.upgrades.mining.autoLevel > 0) { 
        for (let i = 0; i < state.upgrades.mining.autoLevel; i++) mineSand(null, true); changed = true; 
    }
    if (state.upgrades.refining.autoLevel > 0) { 
        for (let i = 0; i < state.upgrades.refining.autoLevel; i++) processSand(null, true); changed = true; 
    }
    if (state.upgrades.extraction.autoLevel > 0) { 
        for (let i = 0; i < state.upgrades.extraction.autoLevel; i++) extractGold(null, true); changed = true; 
    }
    if (changed) updateUI();
}, 1000);

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

function mineSand(event, silent = false) {
    let vol = Math.pow(1.1, state.upgrades.mining.level) * (1 + state.prestigePoints) * state.multiplier;
    state.sand += vol;
    if (!silent) { playClickSound(); spawnEffect(event, '.main-click-btn', `+${vol.toFixed(1)}кг`); updateUI(); }
}

function processSand(event, silent = false) {
    let vol = Math.pow(1.1, state.upgrades.refining.level) * (1 + state.prestigePoints);
    if (state.sand >= vol) {
        state.sand -= vol;
        if (Math.random() < state.chanceMod) {
            let gained = state.yieldMod * vol; state.concentrate += gained;
            if (!silent) spawnEffect(event, null, `+${gained.toFixed(1)}г`, "#3498db");
        }
        if (!silent) { playClickSound(); updateUI(); }
    }
}

function extractGold(event, silent = false) {
    let vol = Math.pow(1.1, state.upgrades.extraction.level) * (1 + state.prestigePoints);
    if (state.concentrate >= vol) {
        state.concentrate -= vol;
        if (Math.random() < 0.30) {
            state.gold += vol;
            if (!silent) spawnEffect(event, null, `+${vol.toFixed(1)}г золота!`, "#f1c40f");
        }
        if (!silent) { playClickSound(); updateUI(); }
    }
}

function sellGold() { state.money += state.gold * state.goldPrice; state.gold = 0; updateUI(); saveGame(); }

function buyUpgrade(type, isAuto) {
    let u = state.upgrades[type];
    let key = isAuto ? 'autoLevel' : 'level';
    let cost = Math.floor((isAuto ? u.baseCost * 2 : u.baseCost) * Math.pow(1.15, u[key]));
    if (state.money >= cost) { state.money -= cost; u[key]++; playClickSound(); saveGame(); updateUI(); }
}

function applyPrestige() {
    if (state.prestigePoints < MAX_PRESTIGE) {
        let cost = prestigeCosts[state.prestigePoints];
        if (state.gold >= cost) {
            state.prestigePoints++;
            state.gold = 0; state.sand = 0; state.concentrate = 0; state.money = 0;
            Object.values(state.upgrades).forEach(u => { u.level = 0; u.autoLevel = 0; });
            saveGame(); updateUI();
            alert(state.prestigePoints === MAX_PRESTIGE ? "ФИНАЛ! Вы скупили все золото!" : "Престиж получен!");
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
    document.getElementById('process-amount').innerText = (Math.pow(1.1, state.upgrades.refining.level) * pMult).toFixed(1);
    document.getElementById('extract-amount').innerText = (Math.pow(1.1, state.upgrades.extraction.level) * pMult).toFixed(1);
    document.getElementById('process-chance-ui').innerText = (state.chanceMod * 100).toFixed(1);
    
    document.getElementById('prestige-val').innerText = state.prestigePoints;
    document.getElementById('prestige-bonus').innerText = (state.prestigePoints * 100);
    
    const pBtn = document.getElementById('prestige-btn');
    if (state.prestigePoints < MAX_PRESTIGE) {
        let cost = prestigeCosts[state.prestigePoints];
        document.getElementById('prestige-status').innerHTML = `Нужно <b>${cost}г</b> золота`;
        pBtn.disabled = state.gold < cost;
    } else {
        document.getElementById('prestige-status').innerText = "Месторождения исчерпаны!"; pBtn.disabled = true;
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

function watchAds() { state.multiplier = 2; setTimeout(() => { state.multiplier = 1; updateUI(); }, 60000); updateUI(); alert("Бонус x2 на 60 сек!"); }
function saveGame() { localStorage.setItem('goldMiner_final_fixed_v11', JSON.stringify(state)); }
function loadGame() { let d = localStorage.getItem('goldMiner_final_fixed_v11'); if (d) state = Object.assign(state, JSON.parse(d)); }

window.debug = {
    setMoney: (v) => { state.money = v; updateUI(); },
    setGold: (v) => { state.gold = v; updateUI(); },
    help: () => { console.log("debug.setMoney(n), debug.setGold(n), debug.reset()"); return "Удачи!"; },
    reset: () => { localStorage.clear(); location.reload(); }
};
console.log("%c Золотодобытчик 2025: Режим отладки. Введите debug.help()", "color: gold; font-weight: bold;");
