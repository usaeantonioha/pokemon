// --- CONFIGURACIÓN DEL MUNDO ---
const tileSize = 32;
const mapWidth = 10;
const mapHeight = 10;

// 0: Suelo, 1: Pared/Casa, 2: Puerta Casa 1, 3: Puerta Casa 2, 4: Jefe/Rival
// 5: NPC Vecino, 6: NPC Madre
const mapLayout = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 2, 1, 0, 1, 3, 1, 1], // Casas arriba
    [1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 6, 1], // NPC Madre (6)
    [1, 5, 0, 0, 0, 0, 0, 0, 0, 1], // NPC Vecino (5)
    [1, 0, 0, 1, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 1, 4, 1, 1, 0, 0, 1], // Jefe (4) bloqueando casa final
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Estado del Jugador
let playerX = 1;
let playerY = 8;
let isMoving = false;
let inBattle = false;
let canMove = true;

// Referencias DOM
const gameMap = document.getElementById('game-map');
const playerSprite = document.getElementById('player-character');
const dialogBox = document.getElementById('dialogue-box');
const dialogText = document.getElementById('dialogue-text');
const worldContainer = document.getElementById('world-container');
const battleContainer = document.getElementById('battle-container');
const transitionOverlay = document.getElementById('transition-overlay');

// --- INICIALIZACIÓN DEL MAPA ---
function drawMap() {
    gameMap.innerHTML = '';
    gameMap.appendChild(playerSprite); // Mantener al jugador

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const tileType = mapLayout[y][x];
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.style.gridColumnStart = x + 1;
            tile.style.gridRowStart = y + 1;

            if (tileType === 1) tile.classList.add('wall', 'house');
            else if (tileType === 2 || tileType === 3) tile.classList.add('door');
            else if (tileType === 0) tile.classList.add('floor');
            
            // Renderizar NPCs
            if (tileType === 4) { tile.innerText = '🦹'; tile.classList.add('npc', 'floor'); } // Jefe
            if (tileType === 5) { tile.innerText = '👴'; tile.classList.add('npc', 'floor'); } // Vecino
            if (tileType === 6) { tile.innerText = '👩'; tile.classList.add('npc', 'floor'); } // Madre

            gameMap.appendChild(tile);
        }
    }
    updatePlayerPosition();
}

// --- MOVIMIENTO ---
function updatePlayerPosition() {
    playerSprite.style.left = (playerX * tileSize) + 'px';
    playerSprite.style.top = (playerY * tileSize) + 'px';
}

function movePlayer(dx, dy) {
    if (isMoving || inBattle || !canMove) return;

    const newX = playerX + dx;
    const newY = playerY + dy;

    // Colisiones
    const targetTile = mapLayout[newY][newX];
    if (targetTile === 1 || targetTile === 4 || targetTile === 5 || targetTile === 6) {
        // Sonido de choque (opcional)
        return;
    }

    isMoving = true;
    playerX = newX;
    playerY = newY;
    updatePlayerPosition();
    
    // Resetear flag de movimiento
    setTimeout(() => { isMoving = false; }, 200);
}

// --- INTERACCIÓN ---
function interact() {
    if (inBattle || !canMove) {
        closeDialog(); // Cerrar diálogo si está abierto
        return;
    }

    // Buscar qué hay en frente (asumimos que mira hacia donde se movió, o revisamos adyacentes)
    // Para simplificar, revisamos los 4 lados
    const neighbors = [
        {x: playerX, y: playerY -1}, // Arriba
        {x: playerX, y: playerY +1}, // Abajo
        {x: playerX -1, y: playerY}, // Izquierda
        {x: playerX +1, y: playerY}  // Derecha
    ];

    let foundInteraction = false;

    neighbors.forEach(pos => {
        const tile = mapLayout[pos.y][pos.x];
        if (tile === 4) { // JEFE
            showDialog("Rival: ¿Así que tienes un Hidrojet? ¡Mi Solasaur te aplastará!");
            setTimeout(startBattleSequence, 2000);
            foundInteraction = true;
        } else if (tile === 5) { // VECINO
            showDialog("Vecino: Dicen que en la fábrica abandonada hay Avidrones salvajes.");
            foundInteraction = true;
        } else if (tile === 6) { // MADRE
            showDialog("Mamá: ¡Oh! Tus Pokémon se ven cansados. (Se han curado)");
            playerHp = 25; updateBattleHUD(); // Curar
            foundInteraction = true;
        } else if (tile === 2) { // CASA 1
            showDialog("Es tu casa. Huele a aceite de motor.");
            foundInteraction = true;
        }
    });

    if (!foundInteraction) showDialog("Nada interesante aquí.");
}

// --- SISTEMA DE DIÁLOGO ---
function showDialog(text) {
    dialogText.innerText = text;
    dialogBox.classList.remove('hidden');
    canMove = false;
}

function closeDialog() {
    dialogBox.classList.add('hidden');
    canMove = true;
}

// --- TRANSICIÓN Y BATALLA ---
function startBattleSequence() {
    canMove = false;
    dialogBox.classList.add('hidden');
    transitionOverlay.classList.add('flash-anim'); // Animación de destello

    setTimeout(() => {
        worldContainer.classList.add('hidden'); // Ocultar mundo
        document.getElementById('controls').classList.add('hidden'); // Ocultar controles de mapa
        battleContainer.classList.remove('hidden'); // Mostrar batalla
        inBattle = true;
        
        // Resetear la opacidad de la transición
        setTimeout(() => {
            transitionOverlay.classList.remove('flash-anim');
            transitionOverlay.style.opacity = 0;
        }, 500);
        
    }, 1500); // Esperar a que el flash cubra la pantalla
}

function endBattleSequence(playerWon) {
    battleContainer.classList.add('hidden');
    worldContainer.classList.remove('hidden');
    document.getElementById('controls').classList.remove('hidden');
    inBattle = false;
    
    if (playerWon) {
        showDialog("Rival: ¡Imposible! Mi tecnología era superior... Toma, ganaste.");
        // Eliminar al jefe del mapa (opcional)
        mapLayout[7][4] = 0; // Se vuelve suelo
        drawMap(); 
    } else {
        showDialog("Rival: ¡Jaja! Te falta actualizar tu software. Vuelve a casa.");
        // Teletransportar a casa (opcional)
        playerX = 1; playerY = 8;
        updatePlayerPosition();
    }
}

// --- LÓGICA DE BATALLA (Simplificada del anterior) ---
let playerHp = 25;
let enemyHp = 25;
const maxHp = 25;

function playerAttack(type) {
    let dmg = 0;
    let msg = "";
    
    if (type === 'pistón') { dmg = 5; msg = "¡Hidrojet usó Golpe Pistón!"; }
    if (type === 'chorro') { dmg = 7; msg = "¡Hidrojet usó Chorro Presión!"; }

    document.getElementById('battle-dialog').innerText = msg;
    enemyHp -= dmg;
    updateBattleHUD();

    if (enemyHp <= 0) {
        setTimeout(() => endBattleSequence(true), 1000);
    } else {
        setTimeout(enemyAttack, 1000);
    }
}

function enemyAttack() {
    let dmg = 4;
    document.getElementById('battle-dialog').innerText = "¡Solasaur usó Rayo Solar!";
    playerHp -= dmg;
    updateBattleHUD();

    if (playerHp <= 0) {
        setTimeout(() => endBattleSequence(false), 1000);
    }
}

function updateBattleHUD() {
    document.getElementById('player-hp').style.width = (playerHp / maxHp * 100) + "%";
    document.getElementById('enemy-hp').style.width = (enemyHp / maxHp * 100) + "%";
    document.getElementById('current-hp').innerText = playerHp > 0 ? playerHp : 0;
}

// Iniciar
drawMap();
