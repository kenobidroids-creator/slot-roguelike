window.addEventListener('DOMContentLoaded', () => {
const symbolList = ['🍎', '💎', '🍒', '🔔', '🍀'];
let gold = 10;

function setupReel(reelContainer) {
    const symbolDiv = reelContainer.querySelector('.symbols');
    // Create a long strip of symbols for the "spin" effect
    for (let i = 0; i < 30; i++) {
        const div = document.createElement('div');
        div.classList.add('symbol');
        div.textContent = symbolList[Math.floor(Math.random() * symbolList.length)];
        symbolDiv.appendChild(div);
    }
}

async function spinReel(reelId) {
    const reel = document.getElementById(reelId).querySelector('.symbols');
    const symbolHeight = 80;
    const totalSymbols = 30;
    
    // Reset position without transition
    reel.style.transition = 'none';
    reel.style.transform = `translateY(0)`;
    
    // Force reflow
    reel.offsetHeight;
    
    // Animate to a random symbol near the end of the strip
    const targetIndex = Math.floor(Math.random() * (totalSymbols - 5)) + 1;
    reel.style.transition = 'transform 2s cubic-bezier(0.1, 0, 0.1, 1)';
    reel.style.transform = `translateY(-${targetIndex * symbolHeight}px)`;
    
    return symbolList[targetIndex % symbolList.length];
}

document.getElementById('spin-btn').addEventListener('click', async () => {
    if (gold <= 0) return alert("Game Over!");
    
    gold--;
    document.getElementById('gold-count').textContent = gold;
    
    // Spin all reels and wait for them to finish
    const results = await Promise.all([
        spinReel('reel-1'),
        spinReel('reel-2'),
        spinReel('reel-3')
    ]);
    
    // Roguelite Logic: Check for synergies
    if (results[0] === results[1] && results[1] === results[2]) {
        gold += 10;
        alert("Jackpot! +10G");
    }
});

// Initialize
document.querySelectorAll('.reel').forEach(setupReel);
});