/* === MOTOR NEOS v17 - TEXTURAS & INPUT FIX === */

// --- CONFIGURACIÓN ---
const CFG = { W: 320, H: 288, TILE: 32 };
const DB = {
    monsters: {
        1: { name: "SOLASAUR", type: "Planta", maxHp: 45, atk: 12, def: 10, moves: [0, 4] },
        4: { name: "CALDERÓN", type: "Fuego", maxHp: 39, atk: 14, def: 9, moves: [1, 5] },
        7: { name: "HIDROJET", type: "Agua", maxHp: 44, atk: 11, def: 13, moves: [0, 6] },
        99: { name: "RATTABYTE", type: "Ciber", maxHp: 30, atk: 10, def: 8, moves: [0, 8] }
    },
    moves: [
        {name: "PLACAJE", pwr: 40, type: "Normal"}, {name: "ASCUAS", pwr: 40, type: "Fuego"},
        {name: "BURBUJA", pwr: 40, type: "Agua"}, {name: "HOJA", pwr: 45, type: "Planta"},
        {name: "LATIGO", pwr: 0, type: "Normal"}, {name: "PIROTECNIA", pwr: 50, type: "Fuego"},
        {name: "CHORRO", pwr: 50, type: "Agua"}, {name: "CHISPA", pwr: 45, type: "Eléctrico"},
        {name: "HACKEO", pwr: 30, type: "Ciber"}
    ]
};

// --- ESTADO GLOBAL ---
const State = {
    started: false, mode: 'START', mapId: 'room',
    player: { x: 3, y: 3, dir: 0, isMoving: false, moveProg: 0, team: [], storyProgress: 0 },
    battle: { enemy: null, turn: 'player' },
    input: { up:false, down:false, left:false, right:false }
};

// --- MAPAS ---
const MAPS = {
    'room': { w: 8, h: 8, data: [1,1,1,1,1,1,1,1, 1,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,1, 1,0,0,9,9,0,0,1, 1,1,1,1,1,1,1,1], warps: {'3,6':'town','4,6':'town'}, warpDest: {'town':{x:5,y:5}} },
    'town': { w: 12, h: 12, data: [1,1,1,1,1,1,1,1,1,1,1,1, 1,0,0,0,1,9,1,0,0,0,0,1, 1,0,0,0,1,1,1,0,0,0,0,1, 1,0,0,0,0,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,0,0,0,0,1, 1,2,2,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,2,2,1, 1,1,1,1,1,1,1,1,1,1,1,1], warps: {'5,1':'room'}, warpDest: {'room':{x:3,y:5}} }
};

// --- MOTOR GRÁFICO Y TEXTURAS ---
let Ctx = null;
const GFX = {
    textures: {},
    init: function() {
        const canvas = document.getElementById('game-canvas');
        Ctx = canvas.getContext('2d');
        Ctx.imageSmoothingEnabled = false;
        this.generateTextures();
    },
    // Genera patrones de 32x32 en memoria
    generateTextures: function() {
        // 0: Suelo Metálico
        this.textures[0] = this.createPattern(ctx => {
            ctx.fillStyle = '#2a2a35'; ctx.fillRect(0,0,32,32);
            ctx.strokeStyle = '#1a1a25'; ctx.strokeRect(0,0,32,32);
            ctx.fillStyle = '#3a3a45'; ctx.fillRect(4,4,2,2); ctx.fillRect(26,26,2,2);
        });
        // 1: Muro Ladrillo Ciber
        this.textures[1] = this.createPattern(ctx => {
            ctx.fillStyle = '#4a4a55'; ctx.fillRect(0,0,32,32);
            ctx.fillStyle = '#3a3a45'; ctx.fillRect(0,28,32,4); // Base
            ctx.fillStyle = '#222'; ctx.fillRect(8,8,16,16); // Ventana
            ctx.fillStyle = 'rgba(0,255,242,0.6)'; ctx.fillRect(10,10,4,12); ctx.fillRect(18,10,4,12);
        });
        // 2: Hierba Digital
        this.textures[2] = this.createPattern(ctx => {
            ctx.fillStyle = '#0f380f'; ctx.fillRect(0,0,32,32);
            ctx.fillStyle = '#306230'; for(let i=0;i<15;i++) ctx.fillRect(Math.random()*30,Math.random()*30,3,3);
            ctx.fillStyle = '#00ffcc'; ctx.fillRect(5,5,2,2); ctx.fillRect(25,25,2,2); // Circuitos
        });
        // 9: Puerta Oscura
        this.textures[9] = this.createPattern(ctx => {
            ctx.fillStyle = '#111'; ctx.fillRect(0,0,32,32);
            ctx.strokeStyle = '#333'; ctx.strokeRect(2,2,28,28);
        });
    },
    createPattern: function(drawFn) {
        const c = document.createElement('canvas'); c.width = 32; c.height = 32;
        drawFn(c.getContext('2d'));
        return Ctx.createPattern(c, 'repeat');
    }
};

// Dibuja un sprite de jugador más detallado
function drawPlayerSprite(x, y, dir) {
    const pX = Math.floor(x); const pY = Math.floor(y);
    // Sombra
    Ctx.fillStyle = 'rgba(0,0,0,0.3)'; Ctx.fillRect(pX+4, pY+26, 24, 6);
    // Cuerpo/Chaqueta
    Ctx.fillStyle = '#00aaff'; Ctx.fillRect(pX+8, pY+6, 16, 20);
    // Pantalones
    Ctx.fillStyle = '#222'; Ctx.fillRect(pX+10, pY+26, 12, 4);
    // Gorra
    Ctx.fillStyle = '#ff00ff'; Ctx.fillRect(pX+8, pY+2, 16, 6); Ctx.fillRect(pX+8, pY+6, 18, 2);
    // Mochila (si mira de lado/arriba)
    if(dir !== 0) { Ctx.fillStyle = '#666'; Ctx.fillRect(pX+6, pY+8, 4, 14); }
    // Cara/Ojos
    if(dir === 0) { // Abajo
        Ctx.fillStyle = '#ffccaa'; Ctx.fillRect(pX+10, pY+8, 12, 8);
        Ctx.fillStyle = '#000'; Ctx.fillRect(pX+12, pY+12, 2, 2); Ctx.fillRect(pX+18, pY+12, 2, 2);
    } else if(dir === 2) { // Izq
        Ctx.fillStyle = '#ffccaa'; Ctx.fillRect(pX+8, pY+8, 8, 8);
        Ctx.fillStyle = '#000'; Ctx.fillRect(pX+8, pY+12, 2, 2);
    } else if(dir === 3) { // Der
        Ctx.fillStyle = '#ffccaa'; Ctx.fillRect(pX+16, pY+8, 8, 8);
        Ctx.fillStyle = '#000'; Ctx.fillRect(pX+22, pY+12, 2, 2);
    }
}

function render() {
    if (!Ctx) return;
    Ctx.fillStyle = '#0a0a10'; Ctx.fillRect(0,0,320,288); // Fondo limpio

    if(State.mode === 'BATTLE') { renderBattle(); return; }

    const map = MAPS[State.mapId];
    const camX = Math.floor(State.player.x * CFG.TILE - 160 + 16);
    const camY = Math.floor(State.player.y * CFG.TILE - 144 + 16);

    for(let y=0; y<map.h; y++) {
        for(let x=0; x<map.w; x++) {
            const t = map.data[y*map.w + x];
            const dX = x*CFG.TILE - camX; const dY = y*CFG.TILE - camY;
            if(dX > -32 && dX < 320 && dY > -32 && dY < 288) {
                // Usar texturas generadas
                Ctx.fillStyle = GFX.textures[t] || '#000';
                Ctx.fillRect(dX, dY, 32, 32);
            }
        }
    }

    let pVisX = State.player.x * CFG.TILE - camX;
    let pVisY = State.player.y * CFG.TILE - camY;
    if(State.player.isMoving) {
        const dist = State.player.moveProg * CFG.TILE;
        if(State.player.dir === 0) pVisY = (State.player.y-1)*CFG.TILE - camY + dist;
        if(State.player.dir === 1) pVisY = (State.player.y+1)*CFG.TILE - camY - dist;
        if(State.player.dir === 2) pVisX = (State.player.x+1)*CFG.TILE - camX - dist;
        if(State.player.dir === 3) pVisX = (State.player.x-1)*CFG.TILE - camX + dist;
    }
    drawPlayerSprite(pVisX, pVisY, State.player.dir);
}

function renderBattle() {
    // Fondo de batalla con gradiente
    const grd = Ctx.createLinearGradient(0,0,0,160);
    grd.addColorStop(0, '#1a1a24'); grd.addColorStop(1, '#0a0a12');
    Ctx.fillStyle = grd; Ctx.fillRect(0,0,320,160);
    
    // Bases de neón
    Ctx.strokeStyle = '#00ffcc'; Ctx.lineWidth = 2; Ctx.fillStyle = 'rgba(0,255,204,0.2)';
    Ctx.beginPath(); Ctx.ellipse(240, 100, 60, 20, 0, 0, Math.PI*2); Ctx.fill(); Ctx.stroke();
    Ctx.beginPath(); Ctx.ellipse(80, 150, 60, 20, 0, 0, Math.PI*2); Ctx.fill(); Ctx.stroke();

    // Placeholders para monstruos (Se podrían texturizar también)
    Ctx.fillStyle = '#ff0055'; Ctx.fillRect(210, 40, 60, 60); // Enemy
    Ctx.fillStyle = '#0055ff'; Ctx.fillRect(50, 90, 60, 60); // Player
}

// --- LÓGICA PRINCIPAL ---
const Game = {
    init: function() {
        if(State.started) return;
        State.started = true;
        document.getElementById('click-to-start').style.display = 'none';
        GFX.init(); // Inicializar gráficos y texturas
        requestAnimationFrame(gameLoop); // Arrancar loop

        State.mode = 'DIALOG';
        UI.dialog("Sistema iniciado. Bienvenido a Neos.");
        setTimeout(() => {
            UI.hideDialog();
            if(State.player.storyProgress === 0) {
                State.mode = 'MENU';
                document.getElementById('starter-selection').classList.remove('hidden');
            } else { State.mode = 'EXPLORE'; }
        }, 2000);
    },
    chooseStarter: function(id) {
        const monData = DB.monsters[id];
        State.player.team.push({ ...monData, level: 5, hp: monData.maxHp, maxHp: monData.maxHp });
        State.player.storyProgress = 1;
        document.getElementById('starter-selection').classList.add('hidden');
        State.mode = 'DIALOG';
        UI.dialog(`¡Has sincronizado con ${monData.name}!`);
        setTimeout(() => { UI.hideDialog(); State.mode = 'EXPLORE'; }, 1500);
    },
    update: function() {
        if(State.mode === 'EXPLORE') {
            if(State.player.isMoving) {
                State.player.moveProg += 0.15; // Más rápido
                if(State.player.moveProg >= 1) {
                    State.player.isMoving = false; State.player.moveProg = 0;
                    this.checkTileEvents();
                }
            } else {
                if(State.input.up) this.move(0, -1, 1);
                else if(State.input.down) this.move(0, 1, 0);
                else if(State.input.left) this.move(-1, 0, 2);
                else if(State.input.right) this.move(1, 0, 3);
            }
        }
    },
    move: function(dx, dy, dir) {
        State.player.dir = dir;
        const nx = State.player.x + dx; const ny = State.player.y + dy;
        const map = MAPS[State.mapId];
        if(nx < 0 || nx >= map.w || ny < 0 || ny >= map.h) return;
        if(map.data[ny*map.w + nx] === 1) return;
        State.player.x = nx; State.player.y = ny; State.player.isMoving = true;
    },
    checkTileEvents: function() {
        const map = MAPS[State.mapId]; const tile = map.data[State.player.y * map.w + State.player.x];
        if(tile === 9) {
            const destId = map.warps[`${State.player.x},${State.player.y}`];
            const destCoords = map.warpDest[destId];
            State.mapId = destId; State.player.x = destCoords.x; State.player.y = destCoords.y;
        }
        if(tile === 2 && Math.random() < 0.15) Battle.start();
    }
};

// --- BATALLA ---
const Battle = {
    start: function() {
        State.mode = 'BATTLE';
        document.getElementById('battle-ui').classList.remove('hidden');
        const enemyBase = DB.monsters[99];
        State.battle.enemy = { ...enemyBase, level: 3, hp: enemyBase.maxHp, maxHp: enemyBase.maxHp };
        this.updateUI();
        UI.dialog(`¡ALERTA! ${State.battle.enemy.name} hostil detectado.`);
    },
    updateUI: function() {
        const p = State.player.team[0]; const e = State.battle.enemy;
        document.getElementById('enemy-name').innerText = e.name;
        document.getElementById('enemy-hp-bar').style.width = (e.hp/e.maxHp*100)+'%';
        document.getElementById('player-name').innerText = p.name;
        document.getElementById('player-hp-bar').style.width = (p.hp/p.maxHp*100)+'%';
        document.getElementById('hp-cur').innerText = Math.floor(p.hp);
        document.getElementById('hp-max').innerText = p.maxHp;
    },
    showMoves: function() {
        document.getElementById('battle-menu').classList.add('hidden');
        document.getElementById('move-menu').classList.remove('hidden');
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
        this.showMain(); document.getElementById('battle-menu').classList.add('hidden');
        const move = DB.moves[State.player.team[0].moves[idx]];
        UI.dialog(`Ejecutando ${move.name}...`);
        setTimeout(() => {
            State.battle.enemy.hp -= 10; if(State.battle.enemy.hp < 0) State.battle.enemy.hp = 0;
            this.updateUI();
            if(State.battle.enemy.hp <= 0) setTimeout(this.win, 1000);
            else { State.battle.turn = 'enemy'; setTimeout(this.enemyTurn, 1000); }
        }, 1000);
    },
    enemyTurn: function() {
        UI.dialog(`El enemigo contraataca.`);
        setTimeout(() => {
            State.player.team[0].hp -= 5; if(State.player.team[0].hp < 0) State.player.team[0].hp = 0;
            this.updateUI();
            if(State.player.team[0].hp <= 0) { UI.dialog("Unidad crítica..."); setTimeout(this.end, 2000); }
            else { State.battle.turn = 'player'; document.getElementById('battle-menu').classList.remove('hidden'); UI.hideDialog(); }
        }, 1000);
    },
    win: function() { UI.dialog("Amenaza neutralizada. +XP"); setTimeout(Battle.end, 2000); },
    run: function() { UI.dialog("Retirada táctica."); setTimeout(Battle.end, 1000); },
    end: function() {
        document.getElementById('battle-ui').classList.add('hidden');
        UI.hideDialog(); State.mode = 'EXPLORE';
    }
};

const UI = {
    dialog: function(text) { document.getElementById('dialog-box').classList.remove('hidden'); document.getElementById('dialog-text').innerText = text; },
    hideDialog: function() { document.getElementById('dialog-box').classList.add('hidden'); }
};

// --- INPUTS CORREGIDOS ---
// Función auxiliar para añadir listeners táctiles y evitar scroll
function attachInput(id, key) {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', e => { e.preventDefault(); State.input[key] = true; btn.classList.add('pressed'); }, {passive: false});
    btn.addEventListener('touchend', e => { e.preventDefault(); State.input[key] = false; btn.classList.remove('pressed'); }, {passive: false});
}
// Asignar eventos a los IDs del HTML
attachInput('btn-up', 'up'); attachInput('btn-down', 'down');
attachInput('btn-left', 'left'); attachInput('btn-right', 'right');
document.getElementById('btn-a').addEventListener('touchstart', e=>{ e.preventDefault(); document.getElementById('btn-a').classList.add('pressed'); });
document.getElementById('btn-a').addEventListener('touchend', e=>{ e.preventDefault(); document.getElementById('btn-a').classList.remove('pressed'); });

// Inicio
document.getElementById('click-to-start').addEventListener('touchstart', Game.init, {once:true});
document.getElementById('click-to-start').addEventListener('click', Game.init, {once:true});

function gameLoop() { Game.update(); render(); requestAnimationFrame(gameLoop); }
