/* =========================================
   NEOS ENGINE v18.0 - FINAL GOLD MASTER
   ========================================= */

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

// --- ESTADO ---
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

// --- MOTOR GRÁFICO ---
let Ctx = null;
const GFX = {
    textures: {},
    init: function() {
        const canvas = document.getElementById('game-canvas');
        if(!canvas) return;
        Ctx = canvas.getContext('2d');
        Ctx.imageSmoothingEnabled = false;
        this.generateTextures();
    },
    generateTextures: function() {
        if(!Ctx) return;
        // 0: Suelo
        this.textures[0] = this.createPattern(ctx => {
            ctx.fillStyle = '#2a2a35'; ctx.fillRect(0,0,32,32);
            ctx.strokeStyle = '#1a1a25'; ctx.strokeRect(0,0,32,32);
            ctx.fillStyle = '#3a3a45'; ctx.fillRect(4,4,2,2); ctx.fillRect(26,26,2,2);
        });
        // 1: Muro
        this.textures[1] = this.createPattern(ctx => {
            ctx.fillStyle = '#4a4a55'; ctx.fillRect(0,0,32,32);
            ctx.fillStyle = '#222'; ctx.fillRect(8,8,16,16);
            ctx.fillStyle = 'rgba(0,255,242,0.6)'; ctx.fillRect(10,10,4,12); ctx.fillRect(18,10,4,12);
        });
        // 2: Hierba
        this.textures[2] = this.createPattern(ctx => {
            ctx.fillStyle = '#0f380f'; ctx.fillRect(0,0,32,32);
            ctx.fillStyle = '#306230'; for(let i=0;i<15;i++) ctx.fillRect(Math.random()*30,Math.random()*30,3,3);
            ctx.fillStyle = '#00ffcc'; ctx.fillRect(5,5,2,2); ctx.fillRect(25,25,2,2);
        });
        // 9: Puerta
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

// --- AUDIO (Simplificado para estabilidad) ---
const AudioEngine = {
    ctx: null,
    init: function() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        } catch(e) {}
    },
    playTone: function(freq, type, duration) {
        if(!this.ctx) return;
        if(this.ctx.state === 'suspended') this.ctx.resume();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(); osc.stop(this.ctx.currentTime + duration);
        } catch(e){}
    },
    sfx: {
        select: ()=>AudioEngine.playTone(1200, 'square', 0.05),
        bump: ()=>AudioEngine.playTone(150, 'sawtooth', 0.1),
        battle: ()=>{ AudioEngine.playTone(600, 'square', 0.1); setTimeout(()=>AudioEngine.playTone(800, 'square', 0.2), 100); }
    }
};

// --- RENDERIZADO ---
function drawPlayerSprite(x, y, dir) {
    if(!Ctx) return;
    const pX = Math.floor(x); const pY = Math.floor(y);
    Ctx.fillStyle = '#00aaff'; Ctx.fillRect(pX+8, pY+6, 16, 20); // Cuerpo
    Ctx.fillStyle = '#ff00ff'; Ctx.fillRect(pX+8, pY+2, 16, 6); // Gorra
    Ctx.fillStyle = '#222'; Ctx.fillRect(pX+10, pY+26, 12, 4); // Pies
    Ctx.fillStyle = '#000'; // Ojos
    if(dir===0) { Ctx.fillRect(pX+10, pY+8, 2, 2); Ctx.fillRect(pX+20, pY+8, 2, 2); }
    else if(dir===2) { Ctx.fillRect(pX+8, pY+8, 2, 2); }
    else if(dir===3) { Ctx.fillRect(pX+22, pY+8, 2, 2); }
}

function render() {
    if(!Ctx) return;
    Ctx.fillStyle = '#0a0a10'; Ctx.fillRect(0,0,320,288);

    if(State.mode === 'BATTLE') { renderBattle(); return; }

    const map = MAPS[State.mapId];
    const camX = Math.floor(State.player.x * CFG.TILE - 160 + 16);
    const camY = Math.floor(State.player.y * CFG.TILE - 144 + 16);

    for(let y=0; y<map.h; y++) {
        for(let x=0; x<map.w; x++) {
            const t = map.data[y*map.w + x];
            const dX = x*CFG.TILE - camX; const dY = y*CFG.TILE - camY;
            if(dX > -32 && dX < 320 && dY > -32 && dY < 288) {
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
    if(!Ctx) return;
    const grd = Ctx.createLinearGradient(0,0,0,160);
    grd.addColorStop(0, '#1a1a24'); grd.addColorStop(1, '#0a0a12');
    Ctx.fillStyle = grd; Ctx.fillRect(0,0,320,160);
    
    Ctx.strokeStyle = '#00ffcc'; Ctx.lineWidth = 2; Ctx.fillStyle = 'rgba(0,255,204,0.2)';
    Ctx.beginPath(); Ctx.ellipse(240, 100, 60, 20, 0, 0, Math.PI*2); Ctx.fill(); Ctx.stroke();
    Ctx.beginPath(); Ctx.ellipse(80, 150, 60, 20, 0, 0, Math.PI*2); Ctx.fill(); Ctx.stroke();

    Ctx.fillStyle = '#ff0055'; Ctx.fillRect(210, 40, 60, 60); // Enemigo
    Ctx.fillStyle = '#0055ff'; Ctx.fillRect(50, 90, 60, 60); // Jugador
}

// --- LÓGICA PRINCIPAL ---
const Game = {
    init: function() {
        if(State.started) return;
        State.started = true;
        document.getElementById('click-to-start').style.display = 'none';
        GFX.init(); 
        AudioEngine.init();
        requestAnimationFrame(gameLoop); // Loop inicia aquí

        State.mode = 'DIALOG';
        UI.dialog("¡Despierta! Hoy es el día.");
        
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
        UI.dialog(`¡Has elegido a ${monData.name}!`);
        setTimeout(() => { UI.hideDialog(); State.mode = 'EXPLORE'; }, 1500);
    },
    update: function() {
        if(State.mode === 'EXPLORE') {
            if(State.player.isMoving) {
                State.player.moveProg += 0.15;
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
            if(destId && destCoords) { State.mapId = destId; State.player.x = destCoords.x; State.player.y = destCoords.y; }
        }
        if(tile === 2 && Math.random() < 0.15) Battle.start();
    },
    togglePause: function() {
        const menu = document.getElementById('pause-menu');
        if(State.mode === 'EXPLORE') { State.mode = 'PAUSE'; menu.classList.remove('hidden'); }
        else if(State.mode === 'PAUSE') { State.mode = 'EXPLORE'; menu.classList.add('hidden'); }
    },
    saveGame: function() { localStorage.setItem('neosSave', JSON.stringify(State.player)); alert('Guardado'); this.togglePause(); }
};

// --- SISTEMA DE BATALLA (CORREGIDO) ---
const Battle = {
    start: function() {
        State.mode = 'BATTLE';
        document.getElementById('battle-ui').classList.remove('hidden');
        const enemyBase = DB.monsters[99];
        State.battle.enemy = { ...enemyBase, level: 3, hp: enemyBase.maxHp, maxHp: enemyBase.maxHp };
        this.updateUI();
        UI.dialog(`¡${State.battle.enemy.name} salvaje!`);
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
        UI.dialog(`¡${move.name}!`);
        // Daño Jugador -> Enemigo (Con referencia Battle explícita)
        setTimeout(() => {
            State.battle.enemy.hp -= 10; if(State.battle.enemy.hp < 0) State.battle.enemy.hp = 0;
            Battle.updateUI();
            if(State.battle.enemy.hp <= 0) setTimeout(Battle.win, 1000);
            else { State.battle.turn = 'enemy'; setTimeout(Battle.enemyTurn, 1000); }
        }, 1000);
    },
    enemyTurn: function() {
        UI.dialog(`¡Enemigo ataca!`);
        setTimeout(() => {
            State.player.team[0].hp -= 5; if(State.player.team[0].hp < 0) State.player.team[0].hp = 0;
            Battle.updateUI();
            if(State.player.team[0].hp <= 0) { UI.dialog("Debilitado..."); setTimeout(Battle.end, 2000); }
            else { State.battle.turn = 'player'; document.getElementById('battle-menu').classList.remove('hidden'); UI.hideDialog(); }
        }, 1000);
    },
    win: function() { UI.dialog("¡Ganaste!"); setTimeout(Battle.end, 2000); },
    run: function() { UI.dialog("Huiste."); setTimeout(Battle.end, 1000); },
    end: function() {
        document.getElementById('battle-ui').classList.add('hidden');
        UI.hideDialog(); State.mode = 'EXPLORE';
    }
};

const UI = {
    dialog: function(text) { document.getElementById('dialog-box').classList.remove('hidden'); document.getElementById('dialog-text').innerText = text; },
    hideDialog: function() { document.getElementById('dialog-box').classList.add('hidden'); }
};

// --- INPUT HANDLER (Tactil) ---
function attachInput(id, key) {
    const btn = document.getElementById(id);
    if(btn) {
        btn.addEventListener('touchstart', e => { e.preventDefault(); State.input[key] = true; btn.classList.add('pressed'); }, {passive: false});
        btn.addEventListener('touchend', e => { e.preventDefault(); State.input[key] = false; btn.classList.remove('pressed'); }, {passive: false});
        // Mouse fallback
        btn.addEventListener('mousedown', e => { State.input[key] = true; btn.classList.add('pressed'); });
        btn.addEventListener('mouseup', e => { State.input[key] = false; btn.classList.remove('pressed'); });
    }
}

window.onload = function() {
    attachInput('btn-up', 'up'); attachInput('btn-down', 'down');
    attachInput('btn-left', 'left'); attachInput('btn-right', 'right');
    attachInput('btn-a', 'a'); attachInput('btn-b', 'b');
    
    // Inicio (Touch y Click)
    const start = document.getElementById('click-to-start');
    if(start) {
        start.addEventListener('touchstart', Game.init, {once:true});
        start.addEventListener('click', Game.init, {once:true});
    }
};

function gameLoop() { Game.update(); render(); requestAnimationFrame(gameLoop); }
