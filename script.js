/* === MOTOR NEOS FIXED v16 === */

// --- CONFIGURACIÓN ---
const CFG = { W: 320, H: 288, TILE: 32 };
const DB = {
    monsters: {
        1: { name: "SOLASAUR", type: "Planta", maxHp: 45, atk: 12, def: 10, moves: [0, 4] },
        4: { name: "CALDERÓN", type: "Fuego", maxHp: 39, atk: 14, def: 9, moves: [1, 5] },
        7: { name: "HIDROJET", type: "Agua", maxHp: 44, atk: 11, def: 13, moves: [0, 6] },
        25: { name: "VOLTMOUSE", type: "Eléctrico", maxHp: 35, atk: 15, def: 8, moves: [0, 7] },
        99: { name: "RATTABYTE", type: "Ciber", maxHp: 30, atk: 10, def: 8, moves: [0, 8] }
    },
    moves: [
        {name: "PLACAJE", pwr: 40, type: "Normal"},
        {name: "ASCUAS", pwr: 40, type: "Fuego"},
        {name: "BURBUJA", pwr: 40, type: "Agua"},
        {name: "HOJA", pwr: 45, type: "Planta"},
        {name: "LATIGO", pwr: 0, type: "Normal"},
        {name: "PIROTECNIA", pwr: 50, type: "Fuego"},
        {name: "CHORRO", pwr: 50, type: "Agua"},
        {name: "CHISPA", pwr: 45, type: "Eléctrico"},
        {name: "HACKEO", pwr: 30, type: "Ciber"}
    ]
};

// --- ESTADO GLOBAL ---
const State = {
    started: false,
    mode: 'START', 
    mapId: 'room',
    player: {
        x: 3, y: 3, 
        dir: 0, // 0:Abajo, 1:Arriba, 2:Izq, 3:Der
        isMoving: false,
        moveProg: 0,
        team: [],
        storyProgress: 0
    },
    battle: { enemy: null, turn: 'player' },
    input: { up:false, down:false, left:false, right:false }
};

// --- MAPAS ---
const MAPS = {
    'room': {
        w: 8, h: 8,
        data: [
            1,1,1,1,1,1,1,1,
            1,0,0,0,0,0,0,1,
            1,0,0,0,0,0,0,1,
            1,0,0,0,0,0,0,1,
            1,0,0,0,0,0,0,1,
            1,0,0,0,0,0,0,1,
            1,0,0,9,9,0,0,1,
            1,1,1,1,1,1,1,1
        ],
        warps: { '3,6': 'town', '4,6': 'town' },
        warpDest: { 'town': {x: 5, y: 5} }
    },
    'town': {
        w: 12, h: 12,
        data: [
            1,1,1,1,1,1,1,1,1,1,1,1,
            1,0,0,0,1,9,1,0,0,0,0,1,
            1,0,0,0,1,1,1,0,0,0,0,1,
            1,0,0,0,0,0,0,0,0,0,0,1,
            1,0,0,0,0,0,0,0,0,0,0,1,
            1,0,0,0,0,0,0,0,0,0,0,1,
            1,2,2,2,2,2,2,2,2,2,2,1,
            1,2,2,2,2,2,2,2,2,2,2,1,
            1,2,2,2,2,2,2,2,2,2,2,1,
            1,2,2,2,2,2,2,2,2,2,2,1,
            1,2,2,2,2,2,2,2,2,2,2,1,
            1,1,1,1,1,1,1,1,1,1,1,1
        ],
        warps: { '5,1': 'room' },
        warpDest: { 'room': {x: 3, y: 5} }
    }
};

// --- RENDERIZADO ---
let Ctx = null;

function initGraphics() {
    const canvas = document.getElementById('game-canvas');
    Ctx = canvas.getContext('2d');
    Ctx.imageSmoothingEnabled = false;
}

function drawPlayer(x, y, dir) {
    const pX = Math.floor(x); 
    const pY = Math.floor(y);
    
    // Cuerpo
    Ctx.fillStyle = '#00ffcc'; 
    Ctx.fillRect(pX+8, pY+4, 16, 24); 
    // Gorra
    Ctx.fillStyle = '#ff00ff'; 
    Ctx.fillRect(pX+8, pY+2, 16, 6);
    
    // Ojos
    Ctx.fillStyle = '#000';
    if(dir === 0) { // Abajo
        Ctx.fillRect(pX+10, pY+10, 4, 4); Ctx.fillRect(pX+18, pY+10, 4, 4);
    } else if(dir === 2) { // Izq
        Ctx.fillRect(pX+8, pY+10, 4, 4);
    } else if(dir === 3) { // Der
        Ctx.fillRect(pX+20, pY+10, 4, 4);
    }
}

function render() {
    if (!Ctx) return;

    // Fondo Negro Limpio
    Ctx.fillStyle = '#000'; Ctx.fillRect(0,0,320,288);

    if(State.mode === 'BATTLE') {
        renderBattle();
        return;
    }

    // --- RENDER MAPA ---
    const map = MAPS[State.mapId];
    // Cámara
    const camX = Math.floor(State.player.x * CFG.TILE - 160 + 16);
    const camY = Math.floor(State.player.y * CFG.TILE - 144 + 16);

    for(let y=0; y<map.h; y++) {
        for(let x=0; x<map.w; x++) {
            const t = map.data[y*map.w + x];
            const dX = x*CFG.TILE - camX;
            const dY = y*CFG.TILE - camY;
            
            // Optimización de dibujado
            if(dX > -32 && dX < 320 && dY > -32 && dY < 288) {
                if(t === 0) { // Suelo
                    Ctx.fillStyle='#222'; Ctx.fillRect(dX,dY,32,32); 
                    Ctx.strokeStyle='#333'; Ctx.strokeRect(dX,dY,32,32); 
                } 
                else if(t === 1) { // Muro
                    Ctx.fillStyle='#555'; Ctx.fillRect(dX,dY,32,32); 
                    Ctx.fillStyle='#333'; Ctx.fillRect(dX+4,dY+4,24,24); 
                } 
                else if(t === 2) { // Hierba
                    Ctx.fillStyle='#0f380f'; Ctx.fillRect(dX,dY,32,32); 
                    Ctx.fillStyle='#306230'; Ctx.fillRect(dX+8,dY+8,16,16); 
                } 
                else if(t === 9) { // Puerta
                    Ctx.fillStyle='#000'; Ctx.fillRect(dX,dY,32,32); 
                }
            }
        }
    }

    // --- RENDER JUGADOR ---
    let pVisX = State.player.x * CFG.TILE - camX;
    let pVisY = State.player.y * CFG.TILE - camY;
    
    if(State.player.isMoving) {
        const dist = State.player.moveProg * CFG.TILE;
        if(State.player.dir === 0) pVisY = (State.player.y-1)*CFG.TILE - camY + dist;
        if(State.player.dir === 1) pVisY = (State.player.y+1)*CFG.TILE - camY - dist;
        if(State.player.dir === 2) pVisX = (State.player.x+1)*CFG.TILE - camX - dist;
        if(State.player.dir === 3) pVisX = (State.player.x-1)*CFG.TILE - camX + dist;
    }

    drawPlayer(pVisX, pVisY, State.player.dir);
}

function renderBattle() {
    Ctx.fillStyle = '#111'; Ctx.fillRect(0,0,320,160);
    Ctx.fillStyle = '#444'; 
    Ctx.beginPath(); Ctx.ellipse(240, 100, 60, 20, 0, 0, Math.PI*2); Ctx.fill();
    Ctx.beginPath(); Ctx.ellipse(80, 150, 60, 20, 0, 0, Math.PI*2); Ctx.fill();
    // Sprites simples
    Ctx.fillStyle = '#ff0000'; Ctx.fillRect(210, 40, 60, 60); // Enemy
    Ctx.fillStyle = '#0000ff'; Ctx.fillRect(50, 90, 60, 60); // Player
}

// --- LÓGICA ---
const Game = {
    init: function() {
        if(State.started) return;
        State.started = true;
        
        document.getElementById('click-to-start').style.display = 'none';
        initGraphics();
        
        // Iniciar el loop INMEDIATAMENTE
        requestAnimationFrame(gameLoop);

        // Secuencia de Intro
        State.mode = 'DIALOG';
        UI.dialog("¡Despierta! Hoy recibes tu primer monstruo.");
        
        setTimeout(() => {
            UI.hideDialog();
            if(State.player.storyProgress === 0) {
                State.mode = 'MENU';
                document.getElementById('starter-selection').classList.remove('hidden');
            } else {
                State.mode = 'EXPLORE';
            }
        }, 2000);
    },

    chooseStarter: function(id) {
        const monData = DB.monsters[id];
        const newMon = {
            ...monData,
            level: 5,
            hp: monData.maxHp,
            maxHp: monData.maxHp,
            xp: 0, maxXp: 100
        };
        State.player.team.push(newMon);
        State.player.storyProgress = 1;
        document.getElementById('starter-selection').classList.add('hidden');
        
        State.mode = 'DIALOG';
        UI.dialog(`¡Has elegido a ${monData.name}!`);
        
        setTimeout(() => {
            UI.hideDialog();
            State.mode = 'EXPLORE';
        }, 1500);
    },

    update: function() {
        if(State.mode === 'EXPLORE') {
            if(State.player.isMoving) {
                State.player.moveProg += 0.1;
                if(State.player.moveProg >= 1) {
                    State.player.isMoving = false;
                    State.player.moveProg = 0;
                    this.checkTileEvents();
                }
            } else {
                // Input continuo
                if(State.input.up) this.move(0, -1, 1);
                else if(State.input.down) this.move(0, 1, 0);
                else if(State.input.left) this.move(-1, 0, 2);
                else if(State.input.right) this.move(1, 0, 3);
            }
        }
    },

    move: function(dx, dy, dir) {
        State.player.dir = dir;
        const nx = State.player.x + dx;
        const ny = State.player.y + dy;
        const map = MAPS[State.mapId];

        if(nx < 0 || nx >= map.w || ny < 0 || ny >= map.h) return;
        if(map.data[ny*map.w + nx] === 1) return; // Muro

        State.player.x = nx;
        State.player.y = ny;
        State.player.isMoving = true;
    },

    checkTileEvents: function() {
        const map = MAPS[State.mapId];
        const tile = map.data[State.player.y * map.w + State.player.x];
        
        // Warps
        if(tile === 9) {
            const key = `${State.player.x},${State.player.y}`;
            if(map.warps[key]) {
                const destId = map.warps[key];
                const destCoords = map.warpDest[destId];
                State.mapId = destId;
                State.player.x = destCoords.x;
                State.player.y = destCoords.y;
            }
        }
        // Batalla
        if(tile === 2 && Math.random() < 0.15) {
            Battle.start();
        }
    },

    togglePause: function() {
        const menu = document.getElementById('pause-menu');
        if(State.mode === 'EXPLORE') {
            State.mode = 'PAUSE';
            menu.classList.remove('hidden');
        } else if(State.mode === 'PAUSE') {
            State.mode = 'EXPLORE';
            menu.classList.add('hidden');
        }
    },

    saveGame: function() {
        localStorage.setItem('neosSave', JSON.stringify(State.player));
        alert('Guardado');
        this.togglePause();
    }
};

// --- BATALLA ---
const Battle = {
    start: function() {
        State.mode = 'BATTLE';
        document.getElementById('battle-ui').classList.remove('hidden');
        
        const enemyBase = DB.monsters[99]; // Rattabyte
        State.battle.enemy = { ...enemyBase, level: 3, hp: enemyBase.maxHp, maxHp: enemyBase.maxHp };
        
        this.updateUI();
        UI.dialog(`¡Un ${State.battle.enemy.name} salvaje!`);
    },

    updateUI: function() {
        const p = State.player.team[0];
        const e = State.battle.enemy;
        document.getElementById('enemy-name').innerText = e.name;
        document.getElementById('enemy-hp-bar').style.width = (e.hp/e.maxHp*100)+'%';
        document.getElementById('player-name').innerText = p.name;
        document.getElementById('player-hp-bar').style.width = (p.hp/p.maxHp*100)+'%';
        document.getElementById('hp-cur').innerText = Math.floor(p.hp);
        document.getElementById('hp-max').innerText = p.maxHp;
    },

    showMoves: function() {
        document.getElementById('battle-menu').classList.add('hidden');
        const menu = document.getElementById('move-menu');
        menu.classList.remove('hidden');
        
        const moves = State.player.team[0].moves;
        document.getElementById('move-btn-0').innerText = DB.moves[moves[0]].name;
        document.getElementById('move-btn-1').innerText = DB.moves[moves[1]].name;
    },

    showMain: function() {
        document.getElementById('move-menu').classList.add('hidden');
        document.getElementById('battle-menu').classList.remove('hidden');
    },

    useMove: function(idx) {
        if(State.battle.turn !== 'player') return;
        
        this.showMain();
        document.getElementById('battle-menu').classList.add('hidden');
        
        const moveId = State.player.team[0].moves[idx];
        const move = DB.moves[moveId];
        
        UI.dialog(`¡Usaste ${move.name}!`);
        
        // Daño
        const dmg = 10; // Simplificado
        setTimeout(() => {
            State.battle.enemy.hp -= dmg;
            if(State.battle.enemy.hp < 0) State.battle.enemy.hp = 0;
            this.updateUI();
            
            if(State.battle.enemy.hp <= 0) {
                setTimeout(this.win, 1000);
            } else {
                State.battle.turn = 'enemy';
                setTimeout(this.enemyTurn, 1000);
            }
        }, 1000);
    },

    enemyTurn: function() {
        UI.dialog(`¡Enemigo ataca!`);
        setTimeout(() => {
            State.player.team[0].hp -= 5;
            if(State.player.team[0].hp < 0) State.player.team[0].hp = 0;
            this.updateUI();
            
            if(State.player.team[0].hp <= 0) {
                UI.dialog("Perdiste...");
                setTimeout(this.end, 2000);
            } else {
                State.battle.turn = 'player';
                document.getElementById('battle-menu').classList.remove('hidden');
                UI.hideDialog();
            }
        }, 1000);
    },

    win: function() {
        UI.dialog("¡Ganaste! +50 XP");
        setTimeout(Battle.end, 2000);
    },

    run: function() {
        UI.dialog("Escapaste.");
        setTimeout(Battle.end, 1000);
    },

    end: function() {
        document.getElementById('battle-ui').classList.add('hidden');
        UI.hideDialog();
        State.mode = 'EXPLORE';
    }
};

// --- UI HELPERS ---
const UI = {
    dialog: function(text) {
        const box = document.getElementById('dialog-box');
        box.classList.remove('hidden');
        document.getElementById('dialog-text').innerText = text;
    },
    hideDialog: function() {
        document.getElementById('dialog-box').classList.add('hidden');
    }
};

// --- INPUT HANDLER ---
const Input = {
    press: function(key) {
        if(key === 'a') Game.interact(); // Placeholder A
        if(key === 'b') {}; 
        State.input[key] = true;
    },
    release: function(key) {
        State.input[key] = false;
    }
};

// --- LOOP ---
function gameLoop() {
    Game.update();
    render();
    requestAnimationFrame(gameLoop);
}
