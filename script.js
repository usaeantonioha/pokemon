/* --- CONFIGURACIÓN Y ESTADO --- */
const TILE_SIZE = 32;
const VIEWPORT_W = 320;
const VIEWPORT_H = 288;

// IDs de Tiles
const T_FLOOR = 0;
const T_WALL = 1;
const T_GRASS = 2; // Encuentros aquí
const T_DOOR = 3;  // Teletransporte
const T_ROOF = 4;  // Estético
const T_EXIT = 5;  // Salida de casa

// Estado del Jugador
let player = {
    map: 'pueblo',
    x: 5, y: 5, // Coordenadas en tiles
    level: 1,
    currentExp: 0,
    maxExp: 50,
    maxHp: 20,
    currentHp: 20,
    // Estadísticas de combate base
    attack: 5,
    defense: 3
};

let gameActive = false;
let inBattle = false;
let isMoving = false;

// --- DATOS DE MAPAS ---
// Pueblo Paleta (Inspiración)
const MAPS = {
    'pueblo': {
        width: 10,
        data: [
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 2, 2, 2, 1, 4, 4, 4, 1, 1, // Hierba a la izq, Casa a la der
            1, 2, 2, 2, 1, 1, 3, 1, 1, 1, // Puerta en (6, 2)
            1, 2, 2, 2, 0, 0, 0, 0, 0, 1,
            1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
            1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
            1, 1, 1, 0, 0, 0, 1, 1, 1, 1,
            1, 2, 2, 0, 0, 0, 2, 2, 2, 1,
            1, 2, 2, 0, 0, 0, 2, 2, 2, 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1
        ],
        portals: {
            "6,2": { targetMap: 'casa', x: 2, y: 4 } // Puerta casa
        }
    },
    'casa': {
        width: 5,
        data: [
            1, 1, 1, 1, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
            1, 1, 5, 1, 1  // Salida en (2, 4)
        ],
        portals: {
            "2,4": { targetMap: 'pueblo', x: 6, y: 3 } // Salir al pueblo
        }
    }
};

// --- MOTOR DEL JUEGO ---

// Inicializar (Pantalla Título)
function startGame() {
    if (gameActive) return;
    loadGame(); // Intentar cargar partida
    
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('world-screen').classList.remove('hidden');
    gameActive = true;
    
    renderMap();
    updateCamera();
    updateHUD(); // Para preparar batalla futura
}

// Renderizado del Mapa
function renderMap() {
    const container = document.getElementById('map-container');
    container.innerHTML = '';
    
    const currentMapData = MAPS[player.map];
    container.style.width = (currentMapData.width * TILE_SIZE) + 'px';
    
    currentMapData.data.forEach(tileId => {
        const div = document.createElement('div');
        div.className = 'tile';
        if (tileId === T_WALL) div.classList.add('tile-wall');
        if (tileId === T_GRASS) div.classList.add('tile-bush');
        if (tileId === T_DOOR) div.classList.add('tile-door');
        if (tileId === T_ROOF) div.classList.add('tile-roof');
        if (tileId === T_EXIT) div.classList.add('tile-rug');
        if (tileId === T_FLOOR) div.classList.add('tile-floor');
        container.appendChild(div);
    });
}

// Cámara (Centrar jugador)
function updateCamera() {
    const mapEl = document.getElementById('map-container');
    // Calculamos el offset para centrar al jugador
    // El jugador siempre está en el centro de la pantalla (160, 144)
    // Map position = CenterScreen - (PlayerX * 32)
    const centerX = VIEWPORT_W / 2 - (TILE_SIZE / 2);
    const centerY = VIEWPORT_H / 2 - (TILE_SIZE / 2);
    
    const x = centerX - (player.x * TILE_SIZE);
    const y = centerY - (player.y * TILE_SIZE);
    
    mapEl.style.transform = `translate(${x}px, ${y}px)`;
}

// Movimiento
function inputDPad(dir) {
    if (!gameActive || isMoving || inBattle) return;
    
    let dx = 0, dy = 0;
    if (dir === 'up') dy = -1;
    if (dir === 'down') dy = 1;
    if (dir === 'left') dx = -1;
    if (dir === 'right') dx = 1;
    
    attemptMove(dx, dy);
}

function inputAction() {
    if (!gameActive) {
        // En título, A funciona como Start
        startGame();
        return;
    }
    // Interacciones futuras (hablar)
}

function attemptMove(dx, dy) {
    const mapInfo = MAPS[player.map];
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    // Verificar límites
    const index = newY * mapInfo.width + newX;
    if (newX < 0 || newX >= mapInfo.width || index < 0 || index >= mapInfo.data.length) return;
    
    const tileType = mapInfo.data[index];
    
    // Colisiones (Muros y Techos bloquean)
    if (tileType === T_WALL || tileType === T_ROOF) {
        // Sonido de choque?
        return;
    }
    
    // Mover
    player.x = newX;
    player.y = newY;
    isMoving = true;
    updateCamera();
    
    setTimeout(() => { 
        isMoving = false; 
        checkEvents(newX, newY, tileType);
        saveGame(); // Guardar tras mover
    }, 200);
}

function checkEvents(x, y, tileType) {
    const mapInfo = MAPS[player.map];
    const key = `${x},${y}`;
    
    // 1. Teletransporte (Puertas/Salidas)
    if (mapInfo.portals && mapInfo.portals[key]) {
        const portal = mapInfo.portals[key];
        player.map = portal.targetMap;
        player.x = portal.x;
        player.y = portal.y;
        renderMap();
        updateCamera();
        return;
    }
    
    // 2. Encuentros Aleatorios (Hierba)
    if (tileType === T_GRASS) {
        if (Math.random() < 0.15) { // 15% de probabilidad
            startBattle();
        }
    }
}

// --- SISTEMA DE BATALLA ---
let enemy = {};

function startBattle() {
    inBattle = true;
    document.getElementById('world-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');
    
    // Generar enemigo basado en el nivel del jugador
    const lvl = Math.max(1, player.level + Math.floor(Math.random() * 3) - 1);
    enemy = {
        name: "WILD BUG",
        level: lvl,
        maxHp: 15 + (lvl * 5),
        currentHp: 15 + (lvl * 5),
        xpReward: 10 + (lvl * 5)
    };
    
    updateBattleUI();
    writeBattleText(`¡Apareció un ${enemy.name}!`);
    document.getElementById('battle-menu').classList.remove('hidden');
}

function useMove(move) {
    document.getElementById('battle-menu').classList.add('hidden');
    
    // Turno Jugador
    let dmg = 0;
    if (move === 'tackle') dmg = Math.floor(player.attack * 1.5);
    if (move === 'water') dmg = Math.floor(player.attack * 2); // Más fuerte
    
    writeBattleText(`¡Usaste ${move.toUpperCase()}!`);
    
    setTimeout(() => {
        enemy.currentHp -= dmg;
        if (enemy.currentHp < 0) enemy.currentHp = 0;
        updateBattleUI();
        
        if (enemy.currentHp <= 0) {
            winBattle();
        } else {
            setTimeout(enemyTurn, 1000);
        }
    }, 1000);
}

function enemyTurn() {
    writeBattleText(`¡${enemy.name} ataca!`);
    const dmg = Math.max(1, Math.floor(enemy.level * 1.5) - Math.floor(player.defense / 2));
    
    setTimeout(() => {
        player.currentHp -= dmg;
        if (player.currentHp < 0) player.currentHp = 0;
        updateBattleUI();
        
        if (player.currentHp <= 0) {
            writeBattleText("¡Te has debilitado...");
            setTimeout(() => {
                // Respawn en casa (reset simple)
                player.currentHp = player.maxHp;
                player.map = 'casa'; player.x = 2; player.y = 2;
                endBattle();
            }, 2000);
        } else {
            document.getElementById('battle-menu').classList.remove('hidden');
            writeBattleText("¿Qué harás?");
        }
    }, 1000);
}

function tryRun() {
    if (Math.random() > 0.5) {
        writeBattleText("¡Escapaste sin problemas!");
        setTimeout(endBattle, 1000);
    } else {
        writeBattleText("¡No pudiste escapar!");
        document.getElementById('battle-menu').classList.add('hidden');
        setTimeout(enemyTurn, 1000);
    }
}

// --- SISTEMA DE EXPERIENCIA (Instrucción 3) ---
function winBattle() {
    writeBattleText("¡Ganaste la batalla!");
    setTimeout(() => {
        gainExp(enemy.xpReward);
    }, 1000);
}

function gainExp(amount) {
    player.currentExp += amount;
    writeBattleText(`¡Ganaste ${amount} XP!`);
    updateBattleUI();
    
    if (player.currentExp >= player.maxExp) {
        setTimeout(levelUp, 1000);
    } else {
        setTimeout(endBattle, 1500);
    }
}

function levelUp() {
    player.level++;
    player.currentExp -= player.maxExp;
    player.maxExp = Math.floor(player.maxExp * 1.5);
    
    // Subir stats 10%
    player.maxHp = Math.floor(player.maxHp * 1.1);
    player.attack = Math.floor(player.attack * 1.1);
    player.defense = Math.floor(player.defense * 1.1);
    player.currentHp = player.maxHp; // Curar al subir nivel
    
    updateBattleUI();
    writeBattleText(`¡Subiste al nivel ${player.level}!`);
    setTimeout(endBattle, 2000);
}

function endBattle() {
    inBattle = false;
    document.getElementById('battle-screen').classList.add('hidden');
    document.getElementById('world-screen').classList.remove('hidden');
    renderMap();
    updateCamera();
    saveGame();
}

// --- UI HELPERS ---
function updateBattleUI() {
    // Enemigo
    document.getElementById('enemy-name').innerText = enemy.name;
    document.getElementById('enemy-lvl').innerText = enemy.level;
    const enemyPct = (enemy.currentHp / enemy.maxHp) * 100;
    document.getElementById('enemy-hp-bar').style.width = enemyPct + '%';
    
    // Jugador
    document.getElementById('player-lvl').innerText = player.level;
    document.getElementById('player-hp-curr').innerText = player.currentHp;
    document.getElementById('player-hp-max').innerText = player.maxHp;
    const playerPct = (player.currentHp / player.maxHp) * 100;
    document.getElementById('player-hp-bar').style.width = playerPct + '%';
    
    const xpPct = (player.currentExp / player.maxExp) * 100;
    document.getElementById('player-xp-bar').style.width = xpPct + '%';
}

function writeBattleText(text) {
    document.getElementById('battle-text').innerText = text;
}

function updateHUD() {
    // Actualizar HUD sin estar en batalla (para transición suave)
    updateBattleUI(); 
}

// --- PERSISTENCIA (Instrucción 5) ---
function saveGame() {
    localStorage.setItem('monsterBlueSave', JSON.stringify(player));
}

function loadGame() {
    const saved = localStorage.getItem('monsterBlueSave');
    if (saved) {
        player = JSON.parse(saved);
    }
}

// Control por teclado para PC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame(); // Instrucción 5
    if (e.key === 'ArrowUp') inputDPad('up');
    if (e.key === 'ArrowDown') inputDPad('down');
    if (e.key === 'ArrowLeft') inputDPad('left');
    if (e.key === 'ArrowRight') inputDPad('right');
    if (e.key === 'z') inputAction(); // A
});
