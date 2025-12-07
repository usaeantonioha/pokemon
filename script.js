/* =========================================
   NEOS ENGINE v23.0 - PLATINUM EDITION
   ========================================= */

// --- DATOS Y CONFIGURACIÓN ---
const CFG = { W: 320, H: 288, TILE: 32 };
const DB = {
    // 151 Monstruos generados proceduralmente (solo definimos los claves)
    monsters: {
        1: { name: "SOLASAUR", type: "Planta", maxHp: 45, atk: 12, def: 10, moves: [0, 3] },
        4: { name: "CALDERÓN", type: "Fuego", maxHp: 39, atk: 14, def: 9, moves: [1, 5] },
        7: { name: "HIDROJET", type: "Agua", maxHp: 44, atk: 11, def: 13, moves: [2, 6] },
        25: { name: "VOLTMOUSE", type: "Eléctrico", maxHp: 35, atk: 15, def: 8, moves: [0, 7] },
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

// Generador de nombres para el resto
const PREFIX = ["NEO", "CYBER", "MECHA", "IRON", "DATA", "VOLT"];
const SUFFIX = ["BOT", "DROID", "REX", "WING", "BYTE", "SOUL"];
function getMonster(id) {
    if(DB.monsters[id]) return JSON.parse(JSON.stringify(DB.monsters[id]));
    // Procedural
    const seed = id * 1337;
    const name = PREFIX[id % PREFIX.length] + SUFFIX[(id*3) % SUFFIX.length];
    return { name: name, type: "Normal", maxHp: 40 + (id%20), atk: 10+(id%5), def: 10+(id%5), moves:[0,4] };
}

// --- ESTADO ---
const State = {
    started: false, mode: 'START', mapId: 'room', lastTime: 0,
    player: { x: 3, y: 3, dir: 0, isMoving: false, moveProg: 0, team: [], story: 0 },
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
    patterns: {},
    init: function() {
        const c = document.getElementById('game-canvas');
        if(!c) return;
        Ctx = c.getContext('2d');
        Ctx.imageSmoothingEnabled = false;
        this.genPatterns();
    },
    genPatterns: function() {
        if(!Ctx) return;
        // Texturas Procedurales
        const mkPat = (fn) => { const c=document.createElement('canvas');c.width=32;c.height=32;fn(c.getContext('2d'));return Ctx.createPattern(c,'repeat'); };
        
        this.patterns[0] = mkPat(c=>{ // Suelo Metal
            c.fillStyle='#222';c.fillRect(0,0,32,32);c.strokeStyle='#333';c.strokeRect(0,0,32,32);
            c.fillStyle='#444';c.fillRect(2,2,2,2);c.fillRect(28,28,2,2);
        });
        this.patterns[1] = mkPat(c=>{ // Muro
            c.fillStyle='#555';c.fillRect(0,0,32,32);c.fillStyle='#333';c.fillRect(0,24,32,8);
            c.fillStyle='#222';c.fillRect(8,8,16,16);c.fillStyle='rgba(0,255,255,0.2)';c.fillRect(10,10,4,12);
        });
        this.patterns[2] = mkPat(c=>{ // Hierba
            c.fillStyle='#0f380f';c.fillRect(0,0,32,32);c.fillStyle='#2ecc71';
            for(let i=0;i<10;i++) c.fillRect(Math.random()*28,Math.random()*28,4,4);
        });
        this.patterns[9] = mkPat(c=>{ c.fillStyle='#000';c.fillRect(0,0,32,32); }); // Puerta
    },
    drawPlayer: function(x, y, dir) {
        if(!Ctx) return;
        const px = Math.floor(x); const py = Math.floor(y);
        Ctx.fillStyle = 'rgba(0,0,0,0.5)'; Ctx.fillRect(px+6, py+26, 20, 4); // Sombra
        Ctx.fillStyle = '#00aaff'; Ctx.fillRect(px+8, py+10, 16, 12); // Cuerpo
        Ctx.fillStyle = '#222'; Ctx.fillRect(px+10, py+22, 12, 6); // Pies
        Ctx.fillStyle = '#ffccaa'; Ctx.fillRect(px+8, py+2, 16, 10); // Cara
        Ctx.fillStyle = '#ff0055'; Ctx.fillRect(px+8, py+0, 16, 4); Ctx.fillRect(px+8, py+4, 18, 2); // Gorra
        Ctx.fillStyle = '#000';
        if(dir===0){ Ctx.fillRect(px+12,py+8,2,2); Ctx.fillRect(px+18,py+8,2,2); } // Abajo
        else if(dir===2){ Ctx.fillRect(px+8,py+8,2,2); } // Izq
        else if(dir===3){ Ctx.fillRect(px+22,py+8,2,2); } // Der
    },
    getMonster: function(id) {
        const c = document.createElement('canvas'); c.width=64; c.height=64;
        const ctx = c.getContext('2d');
        const seed = id * 937;
        const hue = (id*40)%360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        for(let y=12; y<52; y+=4) {
            for(let x=16; x<48; x+=4) {
                if(Math.sin(x*y*seed) > 0.1) {
                    ctx.fillRect(x,y,4,4); ctx.fillRect(64-x-4,y,4,4);
                }
            }
        }
        // Ojos
        ctx.fillStyle = '#fff'; ctx.fillRect(24,24,6,6); ctx.fillRect(34,24,6,6);
        ctx.fillStyle = '#000'; ctx.fillRect(26,26,2,2); ctx.fillRect(36,26,2,2);
        return c;
    }
};

// --- AUDIO SYSTEM (Web Audio API) ---
const Audio = {
    ctx: null,
    init: function() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        } catch(e){}
    },
    resume: function() {
        if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    playTone: function(freq, type, len) {
        if(!this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.value = 0.1; g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + len);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(); o.stop(this.ctx.currentTime + len);
    },
    sfx: {
        select: ()=>Audio.playTone(1200, 'square', 0.1),
        bump: ()=>Audio.playTone(100, 'sawtooth', 0.1),
        battle: ()=>{ Audio.playTone(400,'square',0.1); setTimeout(()=>Audio.playTone(600,'square',0.2),100); }
    }
};

// --- CORE LOGIC ---
const Game = {
    init: function() {
        if(State.started) return;
        State.started = true;
        
        document.getElementById('click-to-start').style.display = 'none';
        GFX.init(); Audio.init();
        
        // Anti-Quantum Jump (Reset Time)
        State.lastTime = performance.now();
        requestAnimationFrame(Game.loop);

        // Intro
        State.mode = 'DIALOG';
        UI.dialog("¡Despierta! Hoy es el día.");
        setTimeout(() => {
            UI.hideDialog();
            if(State.player.story === 0) {
                State.mode = 'MENU';
                document.getElementById('starter-selection').classList.remove('hidden');
            } else { State.mode = 'EXPLORE'; }
        }, 1500);
        
        // Trap Back Button
        window.history.pushState({page:1}, "", "");
        window.onpopstate = function(e) {
            window.history.pushState({page:1}, "", "");
            Game.togglePause();
        };
    },

    chooseStarter: function(id) {
        Audio.sfx.select();
        const mon = getMonster(id);
        const starter = { ...mon, level: 5, hp: mon.maxHp, maxHp: mon.maxHp, xp: 0, maxXp: 50 };
        State.player.team.push(starter);
        State.player.story = 1;
        document.getElementById('starter-selection').classList.add('hidden');
        State.mode = 'DIALOG';
        UI.dialog(`¡Recibiste a ${mon.name}!`);
        setTimeout(() => { UI.hideDialog(); State.mode = 'EXPLORE'; }, 1500);
    },

    loop: function(timestamp) {
        const dt = (timestamp - State.lastTime) / 1000;
        State.lastTime = timestamp;
        
        // Safety Cap (Si dt es muy grande, el usuario minimizó)
        if(dt < 0.1) {
            Game.update(dt);
            Game.render();
        }
        requestAnimationFrame(Game.loop);
    },

    update: function(dt) {
        if(State.mode === 'EXPLORE') {
            const p = State.player;
            if(p.isMoving) {
                p.moveProg += 4 * dt; // Velocidad independiente de FPS
                if(p.moveProg >= 1) {
                    p.moveProg = 0; p.isMoving = false;
                    this.checkTile();
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
        if(nx<0||nx>=map.w||ny<0||ny>=map.h) return;
        if(map.data[ny*map.w + nx] === 1) { Audio.sfx.bump(); return; }
        State.player.x = nx; State.player.y = ny; State.player.isMoving = true;
    },

    checkTile: function() {
        const map = MAPS[State.mapId]; const tile = map.data[State.player.y*map.w + State.player.x];
        // Warps
        if(tile === 9) {
            const destId = map.warps[`${State.player.x},${State.player.y}`];
            const dest = map.warpDest[destId];
            if(dest) { State.mapId = destId; State.player.x = dest.x; State.player.y = dest.y; }
        }
        // Battle RNG
        if(tile === 2 && Math.random() < 0.15) Battle.start();
    },

    render: function() {
        if(!Ctx) return;
        Ctx.fillStyle = '#000'; Ctx.fillRect(0,0,CFG.W,CFG.H);

        if(State.mode === 'BATTLE') { Battle.render(); return; }

        const map = MAPS[State.mapId];
        const p = State.player;
        const camX = Math.floor(p.x * CFG.TILE - 160 + 16);
        const camY = Math.floor(p.y * CFG.TILE - 144 + 16);

        // Render Map
        for(let y=0; y<map.h; y++) {
            for(let x=0; x<map.w; x++) {
                const t = map.data[y*map.w+x];
                const dx = x*CFG.TILE - camX; const dy = y*CFG.TILE - camY;
                if(dx>-32 && dx<320 && dy>-32 && dy<288) {
                    Ctx.fillStyle = GFX.patterns[t] || '#000';
                    Ctx.fillRect(dx, dy, 32, 32);
                }
            }
        }
        // Render Player
        let pVisX = (p.x * CFG.TILE) - camX;
        let pVisY = (p.y * CFG.TILE) - camY;
        if(p.isMoving) {
            const dist = p.moveProg * CFG.TILE;
            if(p.dir===0) pVisY = ((p.y-1)*CFG.TILE)-camY + dist;
            if(p.dir===1) pVisY = ((p.y+1)*CFG.TILE)-camY - dist;
            if(p.dir===2) pVisX = ((p.x+1)*CFG.TILE)-camX - dist;
            if(p.dir===3) pVisX = ((p.x-1)*CFG.TILE)-camX + dist;
        }
        GFX.drawPlayer(pVisX, pVisY, p.dir);
    },

    togglePause: function() {
        Audio.sfx.select();
        const m = document.getElementById('pause-menu');
        if(State.mode === 'EXPLORE') { State.mode = 'PAUSE'; m.classList.remove('hidden'); }
        else if(State.mode === 'PAUSE') { State.mode = 'EXPLORE'; m.classList.add('hidden'); }
    },
    saveGame: function() {
        localStorage.setItem('neosSave', JSON.stringify(State.player));
        UI.toast("¡Partida Guardada!");
        Game.togglePause();
    }
};

// --- BATTLE SYSTEM FIXED ---
const Battle = {
    start: function() {
        Audio.sfx.battle();
        State.mode = 'BATTLE';
        document.getElementById('battle-ui').classList.remove('hidden');
        
        // Create Enemy
        const id = Math.floor(Math.random()*20)+1;
        const base = getMonster(id);
        State.battle.enemy = { ...base, level: 3, hp: base.maxHp, maxHp: base.maxHp };
        State.battle.turn = 'player';
        
        this.updateUI();
        UI.dialog(`¡${base.name} apareció!`);
        setTimeout(() => UI.hideDialog(), 1500);
    },
    updateUI: function() {
        const p = State.player.team[0]; const e = State.battle.enemy;
        document.getElementById('enemy-name').innerText = e.name;
        document.getElementById('enemy-hp-bar').style.width = Math.max(0,(e.hp/e.maxHp*100))+'%';
        document.getElementById('player-name').innerText = p.name;
        document.getElementById('player-hp-bar').style.width = Math.max(0,(p.hp/p.maxHp*100))+'%';
        document.getElementById('player-xp-bar').style.width = Math.max(0,(p.xp/p.maxXp*100))+'%';
        document.getElementById('hp-cur').innerText = Math.floor(p.hp);
        document.getElementById('hp-max').innerText = p.maxHp;
    },
    showMoves: function() {
        document.getElementById('battle-menu').classList.add('hidden');
        document.getElementById('move-menu').classList.remove('hidden');
        const m = State.player.team[0].moves;
        document.getElementById('move-btn-0').innerText = DB.moves[m[0]].name;
        document.getElementById('move-btn-1').innerText = DB.moves[m[1]].name;
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
        
        setTimeout(() => {
            const dmg = 10;
            State.battle.enemy.hp -= dmg;
            Battle.updateUI();
            
            if(State.battle.enemy.hp <= 0) setTimeout(Battle.win, 1000);
            else { State.battle.turn = 'enemy'; setTimeout(Battle.enemyTurn, 1000); }
        }, 1000);
    },
    enemyTurn: function() {
        UI.dialog("¡Enemigo ataca!");
        setTimeout(() => {
            State.player.team[0].hp -= 5;
            if(State.player.team[0].hp < 0) State.player.team[0].hp = 0;
            Battle.updateUI();
            
            if(State.player.team[0].hp <= 0) {
                UI.dialog("Perdiste...");
                setTimeout(Battle.end, 2000);
            } else {
                State.battle.turn = 'player';
                document.getElementById('battle-menu').classList.remove('hidden');
                UI.hideDialog();
            }
        }, 1000);
    },
    win: function() {
        const p = State.player.team[0];
        p.xp += 20;
        if(p.xp >= p.maxXp) {
            p.level++; p.xp=0; p.maxXp=Math.floor(p.maxXp*1.2); p.maxHp+=5; p.hp=p.maxHp;
            UI.dialog(`¡Ganaste! Nivel ${p.level}!`);
        } else {
            UI.dialog("¡Ganaste! +20 XP");
        }
        setTimeout(Battle.end, 2000);
    },
    run: function() { UI.dialog("Huiste."); setTimeout(Battle.end, 1000); },
    end: function() {
        document.getElementById('battle-ui').classList.add('hidden');
        UI.hideDialog(); State.mode = 'EXPLORE';
    },
    render: function() {
        // Battle Render
        const grd = Ctx.createLinearGradient(0,0,0,160);
        grd.addColorStop(0, '#1a1a24'); grd.addColorStop(1, '#0a0a12');
        Ctx.fillStyle = grd; Ctx.fillRect(0,0,320,160);
        
        Ctx.strokeStyle = '#00ffcc'; Ctx.lineWidth = 2; Ctx.fillStyle = 'rgba(0,255,204,0.2)';
        Ctx.beginPath(); Ctx.ellipse(240, 100, 60, 20, 0, 0, Math.PI*2); Ctx.fill(); Ctx.stroke();
        Ctx.beginPath(); Ctx.ellipse(80, 150, 60, 20, 0, 0, Math.PI*2); Ctx.fill(); Ctx.stroke();

        if(State.battle.enemy) Ctx.drawImage(GFX.getMonster(99), 208, 68);
        if(State.player.team[0]) Ctx.drawImage(GFX.getMonster(State.player.team[0].id), 48, 118);
    }
};

const UI = {
    dialog: function(txt) {
        const d = document.getElementById('dialog-box');
        d.classList.remove('hidden');
        document.getElementById('dialog-text').innerText = txt;
    },
    hideDialog: function() { document.getElementById('dialog-box').classList.add('hidden'); },
    toast: function(txt) {
        const t = document.getElementById('toast-area');
        t.innerText = txt; setTimeout(()=>t.innerText='', 2000);
    }
};

// --- SYSTEM ---
function attachInput(id, key) {
    const el = document.getElementById(id);
    if(!el) return;
    const press = (e)=>{e.preventDefault(); State.input[key]=true; el.classList.add('pressed'); Audio.resume();};
    const release = (e)=>{e.preventDefault(); State.input[key]=false; el.classList.remove('pressed');};
    el.addEventListener('touchstart', press, {passive:false});
    el.addEventListener('touchend', release, {passive:false});
    el.addEventListener('mousedown', press); el.addEventListener('mouseup', release);
}

window.onload = function() {
    attachInput('btn-up','up'); attachInput('btn-down','down');
    attachInput('btn-left','left'); attachInput('btn-right','right');
    attachInput('btn-a','a'); attachInput('btn-b','b');
    
    const start = document.getElementById('click-to-start');
    const boot = (e)=>{ e.preventDefault(); Audio.init(); Game.init(); };
    start.addEventListener('touchstart', boot, {once:true});
    start.addEventListener('click', boot, {once:true});
    
    // Resume audio on visibility change
    document.addEventListener('visibilitychange', () => {
        if(!document.hidden) {
            Audio.resume();
            State.lastTime = performance.now(); // Fix time jump
        }
    });
};
