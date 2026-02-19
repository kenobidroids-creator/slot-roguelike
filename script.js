const VER = "v17";
// Bulletproof Meta loading
let meta = JSON.parse(localStorage.getItem('cloverPit_META')) || { shards: 0, starterLvl: 0, taxLvl: 0 };
if (!meta.shards) meta.shards = 0;
if (!meta.starterLvl) meta.starterLvl = 0;
if (!meta.taxLvl) meta.taxLvl = 0;

const INITIAL_STATE = () => ({
    gold: 15 + (Number(meta.starterLvl) * 5),
    safeGold: 0,
    spinsUntilShop: 5,
    spinsUntilRent: 10,
    rentDue: 10,
    totalGained: 0,
    bestSpin: 0,
    lastResult: ['🍀', '🍎', '🍒'],
    playerDeck: ['🍀', '🍎', '🍒', '🪙', '💀', '💀']
});

let game = {};

function save() {
    localStorage.setItem('cloverPit_' + VER, JSON.stringify(game));
    localStorage.setItem('cloverPit_META', JSON.stringify(meta));
}

function load() {
    const saved = localStorage.getItem('cloverPit_' + VER);
    game = saved ? JSON.parse(saved) : INITIAL_STATE();
    
    // Safety check for corruption
    if (isNaN(game.gold)) game.gold = 15;
    if (isNaN(game.safeGold)) game.safeGold = 0;
    
    updateUI();
    setTimeout(fillReels, 100);
}

function fillReels() {
    document.querySelectorAll('.symbols-container').forEach((container, i) => {
        container.style.transition = 'none';
        container.innerHTML = `<div class="symbol">${game.lastResult[i]}</div>`;
        for (let j = 0; j < 40; j++) {
            const s = document.createElement('div');
            s.className = 'symbol';
            s.textContent = getRandomSymbol();
            container.appendChild(s);
        }
        container.style.transform = 'translateY(0)';
    });
}

async function spin() {
    const spinBtn = document.getElementById('spin-btn');
    if (game.gold <= 0 || spinBtn.disabled) return;
    
    spinBtn.disabled = true;
    document.getElementById('win-msg').innerHTML = "";
    
    game.gold--;
    game.spinsUntilShop--;
    game.spinsUntilRent--;
    updateUI();

    const results = await Promise.all([animateReel(0), animateReel(1), animateReel(2)]);
    game.lastResult = results;
    
    let win = 0;
    const skulls = results.filter(s => s === '💀').length;
    win -= (skulls * 2);

    // Jackpot 777
    if (results[0] === '7️⃣' && results[1] === '7️⃣' && results[2] === '7️⃣') {
        win += 500;
    } else if (results[0] === results[1] && results[1] === results[2] && results[0] !== '💀') {
        win += 15;
    } else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
        const match = (results[0] === results[1] || results[0] === results[2]) ? results[0] : results[1];
        if (match !== '💀') win += 2;
    }

    game.gold += win;
    if (win > 0) {
        game.totalGained += win;
        if (win > game.bestSpin) game.bestSpin = win;
    }

    const msg = document.getElementById('win-msg');
    msg.innerHTML = win !== 0 ? (win > 0 ? `+${win}G` : `${win}G`) : "—";
    msg.style.color = win > 0 ? "#2ecc71" : (win < 0 ? "#e74c3c" : "#888");

    updateUI(); 
    save();

    if (game.gold < 0) {
        endRun("Bankrupt!");
    } else if (game.spinsUntilRent <= 0) {
        setTimeout(showRent, 400);
    } else if (game.spinsUntilShop <= 0) {
        setTimeout(showShop, 400);
    } else {
        spinBtn.disabled = (game.gold === 0 && game.safeGold === 0);
    }
}

function animateReel(i) {
    return new Promise(resolve => {
        const el = document.querySelector(`#reel-${i} .symbols-container`);
        const symbolEl = el.querySelector('.symbol');
        const rSize = symbolEl ? symbolEl.offsetHeight : 100;
        const target = 30;
        
        el.style.transition = 'none';
        el.style.transform = 'translateY(0)';
        el.offsetHeight; // force reflow
        
        el.style.transition = `transform ${1 + (i * 0.2)}s cubic-bezier(0.1, 0, 0.1, 1)`;
        el.style.transform = `translateY(-${target * rSize}px)`;
        
        setTimeout(() => resolve(el.children[target].textContent), (1000 + (i * 200)));
    });
}

function showRent() {
    document.getElementById('rent-bill-text').textContent = `Pay Rent: ${game.rentDue}G`;
    document.getElementById('rent-overlay').style.display = 'flex';
    document.getElementById('pay-rent-btn').onclick = () => {
        const totalAvailable = game.gold + game.safeGold;
        if (totalAvailable >= game.rentDue) {
            let remainingBill = game.rentDue;
            const fromSafe = Math.min(game.safeGold, remainingBill);
            game.safeGold -= fromSafe;
            remainingBill -= fromSafe;
            game.gold -= remainingBill;
            
            // Scaled Rent Increase minus Tax Evasion
            let baseInc = Math.floor(game.rentDue * 0.5) + 5;
            let discount = (Number(meta.taxLvl) * 2);
            game.rentDue += Math.max(5, baseInc - discount);
            
            game.spinsUntilRent = 10;
            document.getElementById('rent-overlay').style.display = 'none';
            if (game.spinsUntilShop <= 0) showShop();
            else document.getElementById('spin-btn').disabled = false;
            updateUI(); save();
        } else { endRun("Evicted!"); }
    };
}

function showShop() {
    const box = document.getElementById('shop-options');
    box.innerHTML = '';
    const pool = ['💎', '7️⃣', '🌟', '🪙', '🍀', '🍎', '🍒'];
    
    // Normal 3 options
    for(let i=0; i<3; i++) {
        const s = pool[Math.floor(Math.random()*pool.length)];
        const btn = document.createElement('button');
        btn.style.cssText = 'padding:18px; border-radius:12px; border:2px solid #444; background:#222; font-size:1.8rem; cursor:pointer;';
        btn.innerHTML = s;
        btn.onclick = () => { game.playerDeck.push(s); closeShop(); };
        box.appendChild(btn);
    }

    // Surgical Add: Trash button
    const trashBtn = document.createElement('button');
    trashBtn.style.cssText = 'padding:10px; border-radius:12px; border:1px solid #e74c3c; background:none; color:#e74c3c; font-size:0.8rem; cursor:pointer; width:100%; margin-top:10px;';
    trashBtn.innerHTML = "TRASH A CARD (2G)";
    trashBtn.onclick = () => {
        if (game.gold >= 2) {
            const toRemove = prompt("Type symbol to remove (e.g. 🍎):");
            const idx = game.playerDeck.indexOf(toRemove);
            if (idx > -1) {
                game.gold -= 2;
                game.playerDeck.splice(idx, 1);
                closeShop();
            }
        } else { alert("Not enough gold!"); }
    };
    box.appendChild(trashBtn);

    document.getElementById('shop-overlay').style.display = 'flex';
}
function closeShop() {
    game.spinsUntilShop = 5;
    document.getElementById('shop-overlay').style.display = 'none';
    document.getElementById('spin-btn').disabled = false;
    updateUI(); save(); fillReels();
}

function rerollShop() {
    if (game.gold >= 1) {
        game.gold--;
        updateUI();
        showShop();
    }
}

function buyMeta(type, baseCost) {
    let lvl = Number(meta[type]) || 0;
    let cost = baseCost + (lvl * 5);
    if (meta.shards >= cost) {
        meta.shards -= cost;
        meta[type] = lvl + 1;
        updateUI(); save();
    }
}

// New Helper: Prevents "Loops" by weighting symbols
function getRandomSymbol() {
    const weights = {
        '7️⃣': 1, '💎': 2, '🌟': 4, '🪙': 8,
        '🍀': 12, '🍎': 12, '🍒': 12, '💀': 6
    };

    const currentDeck = game.playerDeck;
    let totalWeight = 0;
    currentDeck.forEach(s => totalWeight += (weights[s] || 5));
    
    let random = Math.random() * totalWeight;
    for (const symbol of currentDeck) {
        const weight = weights[symbol] || 5;
        if (random < weight) return symbol;
        random -= weight;
    }
    return currentDeck[0];
}

function endRun(reason) {
    const earned = Math.floor(game.totalGained / 10);
    meta.shards += earned;
    document.getElementById('death-title').textContent = reason;
    document.getElementById('best-spin').textContent = (game.bestSpin || 0) + "G";
    document.getElementById('run-total').textContent = (game.totalGained || 0) + "G";
    document.getElementById('game-over-overlay').style.display = 'flex';
    save(); updateUI();
}

function resetRun() {
    // Explicitly re-initialize the game object
    game = INITIAL_STATE();
    
    // Clear UI overlays
    document.getElementById('game-over-overlay').style.display = 'none';
    document.getElementById('win-msg').innerHTML = "";
    
    // Reset button states
    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) spinBtn.disabled = false;
    
    // Force Save and Refresh
    save(); 
    updateUI(); 
    fillReels();
}

function adjustSafe(n) {
    if (n > 0 && game.gold >= 1) { game.gold--; game.safeGold++; }
    else if (n < 0 && game.safeGold >= 1) { game.gold++; game.safeGold--; }
    document.getElementById('spin-btn').disabled = (game.gold === 0 && game.safeGold === 0);
    updateUI(); save();
}

function confirmForfeit() { if(confirm("Forfeit run? Shards will be saved.")) endRun("Retired"); }

function updateUI() {
    // Math safety to prevent NaN display
    const curGold = (game && isFinite(game.gold)) ? game.gold : (15 + (Number(meta.starterLvl) * 5));
    const curSafe = (game && isFinite(game.safeGold)) ? game.safeGold : 0;
    const curShards = (meta && isFinite(meta.shards)) ? meta.shards : 0;

    document.getElementById('gold-display').textContent = curGold;
    document.getElementById('safe-display').textContent = curSafe;
    document.getElementById('shard-display').textContent = `✧ ${curShards}`;
    document.getElementById('shop-counter').textContent = (game && game.spinsUntilShop) || 5;
    document.getElementById('rent-counter').textContent = (game && game.spinsUntilRent) || 10;
    
    // Meta Button Text
    const fundLvl = meta.starterLvl || 0;
    const taxLvl = meta.taxLvl || 0;
    document.getElementById('lvl-fund').textContent = `(Lvl ${fundLvl})`;
    document.getElementById('lvl-tax').textContent = `(Lvl ${taxLvl})`;
    document.getElementById('buy-fund').textContent = `✧ ${5 + (fundLvl * 5)}`;
    document.getElementById('buy-tax').textContent = `✧ ${10 + (taxLvl * 5)}`;
    
    // Inventory List Safety
    const inv = document.getElementById('inv-list');
    if (inv) {
        inv.innerHTML = '';
        const counts = {};
        const deck = (game && game.playerDeck) ? game.playerDeck : ['🍀', '🍎', '🍒', '🪙', '💀', '💀'];
        deck.forEach(x => counts[x] = (counts[x] || 0) + 1);
        Object.keys(counts).sort().forEach(s => {
            inv.innerHTML += `<div style="display:flex; justify-content:space-between; padding: 8px; background: #252525; margin-bottom: 5px; border-radius: 8px; font-size: 0.85rem; border: 1px solid #333;"><span>${s}</span><span>x${counts[s]}</span></div>`;
        });
    }
}

load();