// --- CONFIGURACIÓN DEL MAPA ---
const tileSize = 32;
const mapLayout = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 2, 1, 0, 1, 3, 1, 1],
    [1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 6, 1], 
    [1, 5, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 1, 4, 1, 1, 0, 0, 1], // Jefe (4)
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Estado
let playerX = 1, playerY = 8;
let inBattle = false, canMove = true;

// Referencias
const gameMap = document.getElementById('game-map');
const playerSprite = document.getElementById('player-character');
const worldContainer = document.getElementById('world-container');
const battleContainer = document.getElementById('battle-container');
const worldDialog = document.getElementById('world-dialog');
const worldDialogText = document.getElementById('world-dialog-text');
const transitionOverlay = document.getElementById('transition-overlay');

// --- INICIALIZAR MAPA ---
function drawMap() {
    gameMap.innerHTML = '';
    gameMap.appendChild(playerSprite);
    
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const type = mapLayout[y][x];
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.style.gridColumnStart = x + 1;
            tile.style.gridRowStart = y + 1;

            if (type === 1) tile.classList.add('wall');
            else if (type === 2 || type === 3) tile.classList.add('door');
            else tile.classList.add('floor');

            if (type === 4) { tile.innerText = '🦹'; tile.classList.add('npc'); }
            if (type === 5) { tile.innerText = '👴'; tile.classList.add('npc'); }
            if (type === 6) { tile.innerText = '👩'; tile.classList.add('npc'); }

            gameMap.appendChild(tile);
        }
    }
    updatePlayerPos();
}

function updatePlayerPos() {
    playerSprite.style.left = (playerX * tileSize) + 'px';
    playerSprite.style.top = (playerY * tileSize) + 'px';
}

function movePlayer(dx, dy) {
    if (inBattle || !canMove) return;
    const nx = playerX + dx, ny = playerY + dy;
    const target = mapLayout[ny][nx];
    
    if (target === 1 || target === 4 || target === 5 || target === 6) return; // Colisión
    
    playerX = nx; playerY = ny;
    updatePlayerPos();
}

// --- INTERACCIÓN ---
function interact() {
    if (inBattle) return; // El botón A no hace nada aquí, se usan los botones de ataque
    if (!canMove) { closeDialog(); return; }

    const neighbors = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
    let found = false;

    for (let offset of neighbors) {
        const tx = playerX + offset.x, ty = playerY + offset.y;
        const tile = mapLayout[ty][tx];
        
        if (tile === 4) { // JEFE
            showDialog("Rival: ¡Mi Solasaur está listo! ¡Pelea!");
            setTimeout(startBattle, 1500);
            found = true; break;
        } else if (tile === 5) { showDialog("Vecino: Usa los botones de abajo para moverte."); found = true; break; }
        else if (tile === 6) { showDialog("Mamá: ¡Suerte en tu aventura!"); playerHp=25; updateBattleHUD(); found = true; break; }
    }
    
    if (!found) showDialog("...");
}

function showDialog(text) {
    worldDialogText.innerText = text;
    worldDialog.classList.remove('hidden');
    canMove = false;
}
function closeDialog() {
    worldDialog.classList.add('hidden');
    canMove = true;
}

// --- BATALLA ---
let playerHp = 25, enemyHp = 20;
const pBar = document.getElementById('player-hp'), eBar = document.getElementById('enemy-hp');
const bDialog = document.getElementById('battle-dialog'), bActions = document.getElementById('battle-actions');

function startBattle() {
    closeDialog();
    transitionOverlay.classList.add('flash-anim');
    setTimeout(() => {
        worldContainer.classList.add('hidden');
        battleContainer.classList.remove('hidden');
        inBattle = true;
        bActions.classList.remove('hidden');
        bDialog.innerText = "¡Rival Solasaur ataca!";
        transitionOverlay.classList.remove('flash-anim');
    }, 1000);
}

function playerAttack(move) {
    bActions.classList.add('hidden');
    let dmg = (move === 'pistón') ? 5 : 7;
    bDialog.innerText = "¡Usaste " + (move === 'pistón' ? "Golpe Pistón" : "Chorro") + "!";
    
    // Animación ataque
    document.getElementById('player-sprite').classList.add('attack-anim');
    setTimeout(() => document.getElementById('player-sprite').classList.remove('attack-anim'), 300);

    setTimeout(() => {
        enemyHp -= dmg;
        if (enemyHp < 0) enemyHp = 0;
        updateBattleHUD();
        document.getElementById('enemy-sprite').classList.add('shake');
        setTimeout(() => document.getElementById('enemy-sprite').classList.remove('shake'), 500);

        if (enemyHp <= 0) setTimeout(() => endBattle(true), 1000);
        else setTimeout(enemyTurn, 1500);
    }, 1000);
}

function enemyTurn() {
    bDialog.innerText = "¡Solasaur usó Hoja Afilada!";
    setTimeout(() => {
        playerHp -= 4;
        if (playerHp < 0) playerHp = 0;
        updateBattleHUD();
        document.getElementById('player-sprite').classList.add('shake');
        setTimeout(() => document.getElementById('player-sprite').classList.remove('shake'), 500);

        if (playerHp <= 0) setTimeout(() => endBattle(false), 1000);
        else {
            bDialog.innerText = "¿Qué harás?";
            bActions.classList.remove('hidden');
        }
    }, 1000);
}

function updateBattleHUD() {
    pBar.style.width = (playerHp / 25 * 100) + "%";
    eBar.style.width = (enemyHp / 20 * 100) + "%";
    document.getElementById('current-hp').innerText = playerHp;
}

function endBattle(win) {
    if (win) {
        bDialog.innerText = "¡Ganaste!";
        mapLayout[7][4] = 0; // Quitar jefe
    } else {
        bDialog.innerText = "Perdiste...";
        playerX = 1; playerY = 8; // Reset pos
        playerHp = 25; enemyHp = 20; updateBattleHUD(); // Reset vida
    }
    
    setTimeout(() => {
        battleContainer.classList.add('hidden');
        worldContainer.classList.remove('hidden');
        inBattle = false;
        drawMap();
    }, 2000);
}

drawMap();
