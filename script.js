/* =========================================
   POKÉMON RED/BLUE STYLE ENGINE
   ========================================= */

// --- CONFIGURACIÓN ---
const CFG = { W: 320, H: 288, TILE: 32 };

// Tabla de efectividad de tipos (estilo Pokémon)
const TYPE_CHART = {
    'Normal': {'Normal': 1, 'Fuego': 1, 'Agua': 1, 'Planta': 1, 'Eléctrico': 1},
    'Fuego': {'Normal': 1, 'Fuego': 0.5, 'Agua': 0.5, 'Planta': 2, 'Eléctrico': 1},
    'Agua': {'Normal': 1, 'Fuego': 2, 'Agua': 0.5, 'Planta': 0.5, 'Eléctrico': 1},
    'Planta': {'Normal': 1, 'Fuego': 0.5, 'Agua': 2, 'Planta': 0.5, 'Eléctrico': 1},
    'Eléctrico': {'Normal': 1, 'Fuego': 1, 'Agua': 2, 'Planta': 0.5, 'Eléctrico': 0.5}
};

function getTypeEffectiveness(moveType, defenderType) {
    if (!TYPE_CHART[moveType]) return 1;
    return TYPE_CHART[moveType][defenderType] || 1;
}

const DB = {
    // 151 Monstruos + Omegear - IDs corregidos
    monsters: {
        1: { name: "BULBASAUR", type: "Planta", maxHp: 45, atk: 12, def: 10, moves: [0, 3], id: 1 },
        4: { name: "CHARMANDER", type: "Fuego", maxHp: 39, atk: 14, def: 9, moves: [1, 5], id: 4 },
        7: { name: "SQUIRTLE", type: "Agua", maxHp: 44, atk: 11, def: 13, moves: [2, 6], id: 7 },
        25: { name: "PIKACHU", type: "Eléctrico", maxHp: 35, atk: 15, def: 8, moves: [0, 7], id: 25 },
        99: { name: "RATTATA", type: "Normal", maxHp: 30, atk: 10, def: 8, moves: [0, 4], id: 99 },
        150: { name: "MEWTWO", type: "Normal", maxHp: 150, atk: 25, def: 20, moves: [8, 5], id: 150 }
    },
    moves: [
        {name: "PLACAJE", pwr: 40, type: "Normal"},
        {name: "ASCUAS", pwr: 40, type: "Fuego"},
        {name: "BURBUJA", pwr: 40, type: "Agua"},
        {name: "HOJA", pwr: 45, type: "Planta"},
        {name: "LÁTIGO", pwr: 0, type: "Normal"},
        {name: "LLAMARADA", pwr: 50, type: "Fuego"},
        {name: "CHORRO", pwr: 50, type: "Agua"},
        {name: "CHISPA", pwr: 45, type: "Eléctrico"},
        {name: "PSÍQUICO", pwr: 60, type: "Normal"}
    ],
    items: {
        'potion': { name: "Poción", heal: 20 },
        'cube': { name: "Poké Ball", type: "ball", rate: 1.5 },
        'key_alpha': { name: "Chip Alpha", key: true }
    }
};

const PREFIX = ["BULBA", "CHAR", "SQUIRT", "PIKA", "RATTA", "MEW"];
const SUFFIX = ["SAUR", "MANDER", "TLE", "CHU", "TATA", "TWO"];
function getMonster(id) {
    if(DB.monsters[id]) {
        const mon = DB.monsters[id];
        return JSON.parse(JSON.stringify(mon));
    }
    // Generar monstruo aleatorio con ID correcto
    const seed = id * 1337;
    const name = PREFIX[id % PREFIX.length] + SUFFIX[(id*3) % SUFFIX.length];
    return { 
        name: name, 
        type: "Normal", 
        maxHp: 40 + (id%20), 
        atk: 10+(id%5), 
        def: 10+(id%5), 
        moves:[0,4],
        id: id  // FIX: Añadir ID al monstruo generado
    };
}

// --- ESTADO ---
const State = {
    started: false, mode: 'START', mapId: 'room', lastTime: 0,
    player: { 
        x: 3, y: 3, dir: 0, isMoving: false, moveProg: 0, 
        team: [], bag: { 'potion': 5, 'cube': 3 }, 
        story: 0, badges: [] 
    },
    battle: { enemy: null, turn: 'player', isTrainer: false },
    input: { up:false, down:false, left:false, right:false }
};

// --- MAPAS (MUNDO EXPANDIDO) ---
// 9:Warp, 8:Cura, 4:Jefe Final
const MAPS = {
    'room': { 
        w: 8, h: 8, data: [1,1,1,1,1,1,1,1, 1,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,1, 1,0,0,9,9,0,0,1, 1,1,1,1,1,1,1,1], warps: {'3,6':'town','4,6':'town'}, warpDest: {'town':{x:5,y:5}} 
    },
    'town': { 
        w: 12, h: 12, data: [1,1,1,1,9,9,1,1,1,1,1,1, 1,0,0,0,0,0,0,0,0,0,0,1, 1,0,0,0,1,9,1,0,0,0,0,1, 1,0,0,0,1,1,1,0,0,0,0,1, 1,0,0,0,0,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,0,0,0,0,1, 1,2,2,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,2,2,1, 1,1,1,1,1,1,1,1,1,1,1,1], warps: {'5,2':'room', '4,0':'route1', '5,0':'route1'}, warpDest: {'room':{x:3,y:5}, 'route1':{x:4,y:10}} 
    },
    'route1': {
        w: 10, h: 12, data: [1,1,1,1,9,9,1,1,1,1, 1,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,1, 1,0,0,0,0,0,0,0,0,1, 1,0,0,0,8,0,0,0,0,1, 1,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,1, 1,2,2,2,2,2,2,2,2,1, 1,1,1,1,9,9,1,1,1,1, 1,1,1,1,1,1,1,1,1,1], warps: {'4,10':'town', '5,10':'town', '4,0':'boss_room', '5,0':'boss_room'}, warpDest: {'town':{x:4,y:1}, 'boss_room':{x:5,y:8}}
    },
    'boss_room': {
        w: 10, h: 10, data: [1,1,1,1,1,1,1,1,1,1, 1,0,0,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,0,0,1, 1,0,0,0,4,0,0,0,0,1, 1,0,0,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,0,0,1, 1,0,0,0,0,0,0,0,0,1, 1,1,1,1,9,9,1,1,1,1, 1,1,1,1,1,1,1,1,1,1], warps: {'4,8':'route1', '5,8':'route1'}, warpDest: {'route1':{x:4,y:1}}
    }
};

// Paleta GameBoy original (4 tonos verde)
const GB_COLORS = {
    darkest: '#0f380f',  // Negro
    dark: '#306230',     // Verde oscuro
    light: '#8bac0f',    // Verde claro
    lightest: '#9bbc0f'  // Verde muy claro
};

// --- MOTOR GRÁFICO (Estilo GameBoy) ---
let Ctx = null;
const GFX = {
    textures: {},
    init: function() {
        const c = document.getElementById('game-canvas');
        if(!c) return;
        Ctx = c.getContext('2d');
        Ctx.imageSmoothingEnabled = false;
        this.genPatterns();
    },
    genPatterns: function() {
        const mkPat = (fn) => { const c=document.createElement('canvas');c.width=32;c.height=32;fn(c.getContext('2d'));return Ctx.createPattern(c,'repeat'); };
        // 0-9: Básicos - Paleta GameBoy
        this.textures[0] = mkPat(c=>{ c.fillStyle=GB_COLORS.lightest;c.fillRect(0,0,32,32);c.strokeStyle=GB_COLORS.light;c.strokeRect(0,0,32,32); }); // Suelo
        this.textures[1] = mkPat(c=>{ c.fillStyle=GB_COLORS.dark;c.fillRect(0,0,32,32);c.fillStyle=GB_COLORS.darkest;c.fillRect(8,8,16,16); }); // Muro
        // 10-19: Naturaleza
        this.textures[2] = mkPat(c=>{ c.fillStyle=GB_COLORS.lightest;c.fillRect(0,0,32,32);c.fillStyle=GB_COLORS.light; for(let i=0;i<8;i++)c.fillRect(4+Math.floor(i/2)*8,(i%4)*8,4,4); }); // Hierba
        this.textures[4] = mkPat(c=>{ c.fillStyle=GB_COLORS.darkest;c.fillRect(0,0,32,32);c.strokeStyle=GB_COLORS.light;c.lineWidth=2;c.strokeRect(4,4,24,24);c.fillStyle=GB_COLORS.light;c.fillText("BOSS",8,20); }); // Boss Tile
        // 20-29: Urbano
        this.textures[9] = mkPat(c=>{ c.fillStyle=GB_COLORS.darkest;c.fillRect(0,0,32,32); }); // Puerta
        this.textures[8] = mkPat(c=>{ c.fillStyle=GB_COLORS.lightest;c.fillRect(0,0,32,32);c.fillStyle='#f00';c.fillRect(12,4,8,24);c.fillRect(4,12,24,8); }); // Centro Pokémon
    },
    drawPlayer: function(x, y, dir, frame) {
        if(!Ctx) return;
        const px = Math.floor(x); const py = Math.floor(y);
        // Sombra
        Ctx.fillStyle = GB_COLORS.dark; Ctx.fillRect(px+6, py+26, 20, 4);
        // Cuerpo (estilo pixel art simple)
        Ctx.fillStyle = GB_COLORS.darkest; Ctx.fillRect(px+8, py+10, 16, 14);
        // Pantalones
        Ctx.fillStyle = GB_COLORS.dark; Ctx.fillRect(px+10, py+22, 12, 6);
        // Cabeza
        Ctx.fillStyle = GB_COLORS.lightest; Ctx.fillRect(px+8, py+2, 16, 10);
        // Gorra
        Ctx.fillStyle = GB_COLORS.darkest; Ctx.fillRect(px+8, py+0, 16, 4);
        Ctx.fillRect(px+8, py+4, 18, 2);
        // Ojos (dirección)
        Ctx.fillStyle = GB_COLORS.darkest;
        if(dir===0){ // Arriba - no se ven ojos
            Ctx.fillRect(px+10,py+6,4,2); Ctx.fillRect(px+18,py+6,4,2);
        } else if(dir===1){ // Abajo
            Ctx.fillRect(px+12,py+8,2,2); Ctx.fillRect(px+18,py+8,2,2);
        } else if(dir===2){ // Izquierda
            Ctx.fillRect(px+10,py+8,2,2);
        } else if(dir===3){ // Derecha
            Ctx.fillRect(px+20,py+8,2,2);
        }
        // Animación de caminar (brazos)
        if(frame > 0) {
            Ctx.fillStyle = GB_COLORS.dark;
            if(frame % 2 === 0) {
                Ctx.fillRect(px+6, py+14, 4, 6);
            } else {
                Ctx.fillRect(px+22, py+14, 4, 6);
            }
        }
    },
    getMonster: function(id) {
        const c = document.createElement('canvas'); c.width=64; c.height=64;
        const ctx = c.getContext('2d');
        
        // Limpiar con transparencia
        ctx.clearRect(0, 0, 64, 64);
        
        // Colores basados en tipo para sprites más reconocibles
        let color1 = GB_COLORS.darkest;
        let color2 = GB_COLORS.dark;
        
        const monData = DB.monsters[id];
        if(monData) {
            switch(monData.type) {
                case 'Planta': color1 = '#2d5a27'; color2 = '#4a7c3f'; break;
                case 'Fuego': color1 = '#8b4513'; color2 = '#cd5c5c'; break;
                case 'Agua': color1 = '#4169e1'; color2 = '#6495ed'; break;
                case 'Eléctrico': color1 = '#daa520'; color2 = '#ffd700'; break;
                default: color1 = GB_COLORS.darkest; color2 = GB_COLORS.dark;
            }
        }
        
        // Dibujar sprite estilo pixel art 8-bit
        const seed = id * 937;
        
        // Cuerpo base (elipse pixelada)
        ctx.fillStyle = color2;
        for(let y=20; y<50; y+=4) {
            for(let x=20; x<44; x+=4) {
                const dist = Math.sqrt((x-32)*(x-32) + (y-35)*(y-35));
                if(dist < 14) {
                    ctx.fillRect(x, y, 4, 4);
                }
            }
        }
        
        // Detalles (ojos)
        ctx.fillStyle = '#fff';
        ctx.fillRect(26, 28, 6, 6);
        ctx.fillRect(36, 28, 6, 6);
        ctx.fillStyle = '#000';
        ctx.fillRect(28, 30, 3, 3);
        ctx.fillRect(38, 30, 3, 3);
        
        // Boca
        ctx.fillStyle = '#000';
        ctx.fillRect(30, 38, 8, 2);
        
        return c;
    }
};

// --- AUDIO ---
const Audio = {
    ctx: null,
    init: function() { try { window.AudioContext = window.AudioContext || window.webkitAudioContext; this.ctx = new AudioContext(); } catch(e){} },
    resume: function() { if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    playTone: function(freq, type, len) {
        if(!this.ctx) return;
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.value = 0.1; g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + len);
        o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + len);
    },
    sfx: {
        select: ()=>Audio.playTone(1200, 'square', 0.1),
        bump: ()=>Audio.playTone(100, 'sawtooth', 0.1),
        battle: ()=>{ Audio.playTone(400,'square',0.1); setTimeout(()=>Audio.playTone(600,'square',0.2),100); },
        heal: ()=>{ Audio.playTone(600,'sine',0.1); setTimeout(()=>Audio.playTone(800,'sine',0.3),200); }
    }
};

// --- CORE ---
const Game = {
    init: function() {
        if(State.started) return;
        State.started = true;
        document.getElementById('click-to-start').style.display = 'none';
        GFX.init(); Audio.init();
        State.lastTime = performance.now();
        requestAnimationFrame(Game.loop);

        State.mode = 'DIALOG';
        UI.dialog("¡Despierta! Hoy recibes tu primer monstruo.");
        setTimeout(() => {
            UI.hideDialog();
            if(State.player.story === 0) {
                State.mode = 'MENU';
                document.getElementById('starter-selection').classList.remove('hidden');
            } else { State.mode = 'EXPLORE'; }
        }, 1500);
        
        window.history.pushState({page:1}, "", "");
        window.onpopstate = function(e) { window.history.pushState({page:1}, "", ""); Game.togglePause(); };
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
        if(dt < 0.1) { Game.update(dt); Game.render(); }
        requestAnimationFrame(Game.loop);
    },
    update: function(dt) {
        if(State.mode === 'EXPLORE') {
            const p = State.player;
            if(p.isMoving) {
                p.moveProg += 4 * dt;
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
        // Heal
        if(tile === 8) {
            Audio.sfx.heal();
            State.player.team.forEach(m => m.hp = m.maxHp);
            UI.toast("¡Equipo Curado!");
        }
        // Boss
        if(tile === 4) {
            Battle.start(true); // true = Boss
        }
        // Wild Battle - 10% probability (Pokémon style)
        if(tile === 2 && Math.random() < 0.10) Battle.start(false);
    },
    render: function() {
        if(!Ctx) return;
        Ctx.fillStyle = GB_COLORS.lightest; Ctx.fillRect(0,0,CFG.W,CFG.H);
        if(State.mode === 'BATTLE') { Battle.render(); return; }
        
        const map = MAPS[State.mapId];
        const p = State.player;
        const camX = Math.floor(p.x * CFG.TILE - 160 + 16);
        const camY = Math.floor(p.y * CFG.TILE - 144 + 16);

        for(let y=0; y<map.h; y++) {
            for(let x=0; x<map.w; x++) {
                const t = map.data[y*map.w+x];
                const dx = x*CFG.TILE - camX; const dy = y*CFG.TILE - camY;
                if(dx>-32 && dx<320 && dy>-32 && dy<288) {
                    Ctx.fillStyle = GFX.textures[t] || GB_COLORS.lightest;
                    Ctx.fillRect(dx, dy, 32, 32);
                }
            }
        }
        let pVisX = (p.x * CFG.TILE) - camX; let pVisY = (p.y * CFG.TILE) - camY;
        // Animation frame for walking
        let frame = 0;
        if(p.isMoving) {
            const dist = p.moveProg * CFG.TILE;
            if(p.dir===0) pVisY = ((p.y-1)*CFG.TILE)-camY + dist;
            if(p.dir===1) pVisY = ((p.y+1)*CFG.TILE)-camY - dist;
            if(p.dir===2) pVisX = ((p.x+1)*CFG.TILE)-camX - dist;
            if(p.dir===3) pVisX = ((p.x-1)*CFG.TILE)-camX + dist;
            frame = Math.floor(p.moveProg * 4) + 1;
        }
        GFX.drawPlayer(pVisX, pVisY, p.dir, frame);
    },
    // Menús
    togglePause: function() {
        Audio.sfx.select();
        const m = document.getElementById('pause-menu');
        const b = document.getElementById('bag-menu');
        if(State.mode === 'EXPLORE') { State.mode = 'PAUSE'; m.classList.remove('hidden'); }
        else if(State.mode === 'PAUSE') { State.mode = 'EXPLORE'; m.classList.add('hidden'); b.classList.add('hidden'); }
    },
    showBag: function() {
        document.getElementById('pause-menu').classList.add('hidden');
        const b = document.getElementById('bag-menu');
        b.classList.remove('hidden');
        const list = document.getElementById('bag-list');
        list.innerHTML = '';
        for(let k in State.player.bag) {
            const item = DB.items[k];
            const count = State.player.bag[k];
            if(count > 0) {
                const btn = document.createElement('button');
                btn.className = 'cyber-btn-menu';
                btn.innerText = `${item.name} x${count}`;
                list.appendChild(btn);
            }
        }
    },
    closeBag: function() {
        document.getElementById('bag-menu').classList.add('hidden');
        document.getElementById('pause-menu').classList.remove('hidden');
    },
    saveGame: function() { localStorage.setItem('neosSave', JSON.stringify(State.player)); UI.toast("¡Guardado!"); Game.togglePause(); },
    exportSave: function() { const s = btoa(JSON.stringify(State.player)); prompt("Código:", s); }
};

// --- BATTLE ---
const Battle = {
    start: function(isBoss) {
        Audio.sfx.battle();
        State.mode = 'BATTLE';
        document.getElementById('battle-ui').classList.remove('hidden');
        document.getElementById('battle-menu').classList.remove('hidden');
        document.getElementById('move-menu').classList.add('hidden');
        
        State.battle.isTrainer = isBoss;
        
        const id = isBoss ? 150 : Math.floor(Math.random()*20)+1;
        const base = getMonster(id);
        const lvl = isBoss ? 10 : 3;
        State.battle.enemy = { ...base, level: lvl, hp: base.maxHp*lvl/5, maxHp: base.maxHp*lvl/5 };
        State.battle.turn = 'player';
        
        this.updateUI();
        UI.dialog(`¡${base.name} ${isBoss ? 'JEFE' : 'salvaje'}!`);
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
        const menu = document.getElementById('move-menu');
        const list = document.getElementById('move-list-dynamic');
        list.innerHTML = '';
        State.player.team[0].moves.forEach((mid, i) => {
            const m = DB.moves[mid];
            const btn = document.createElement('button');
            btn.className = 'cyber-btn-menu';
            btn.innerText = m.name;
            btn.onclick = () => Battle.useMove(i);
            list.appendChild(btn);
        });
        menu.classList.remove('hidden');
    },
    showMain: function() {
        document.getElementById('move-menu').classList.add('hidden');
        document.getElementById('battle-menu').classList.remove('hidden');
    },
    inputBag: function() {
        // Simple implementación de uso de poción
        if(State.player.bag['potion'] > 0) {
            State.player.bag['potion']--;
            State.player.team[0].hp += 20;
            if(State.player.team[0].hp > State.player.team[0].maxHp) State.player.team[0].hp = State.player.team[0].maxHp;
            Battle.updateUI();
            UI.dialog("¡Usaste Poción!");
            setTimeout(() => { State.battle.turn='enemy'; Battle.enemyTurn(); }, 1000);
        } else UI.dialog("¡No tienes pociones!");
    },
    tryCatch: function() {
        if(State.battle.isTrainer) { UI.dialog("¡No puedes robar!"); return; }
        if(State.player.bag['cube'] > 0) {
            State.player.bag['cube']--;
            UI.dialog("¡Lanzaste Neo-Cube!");
            setTimeout(() => {
                if(Math.random() > 0.5) {
                    UI.dialog("¡Capturado!");
                    State.player.team.push(JSON.parse(JSON.stringify(State.battle.enemy)));
                    setTimeout(Battle.end, 2000);
                } else {
                    UI.dialog("¡Escapó!");
                    setTimeout(() => { State.battle.turn='enemy'; Battle.enemyTurn(); }, 1000);
                }
            }, 1000);
        } else UI.dialog("¡Sin Cubes!");
    },
    useMove: function(idx) {
        if(State.battle.turn !== 'player') return;
        this.showMain(); document.getElementById('battle-menu').classList.add('hidden');
        const move = DB.moves[State.player.team[0].moves[idx]];
        UI.dialog(`¡${move.name}!`);
        setTimeout(() => {
            const dmg = 10; // Simplificado
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
            Battle.updateUI();
            if(State.player.team[0].hp <= 0) { UI.dialog("Debilitado..."); setTimeout(Battle.end, 2000); }
            else { State.battle.turn = 'player'; document.getElementById('battle-menu').classList.remove('hidden'); UI.hideDialog(); }
        }, 1000);
    },
    win: function() {
        const p = State.player.team[0];
        p.xp += 20;
        if(p.xp >= p.maxXp) { p.level++; p.xp=0; p.maxHp+=5; p.hp=p.maxHp; UI.dialog(`¡Nivel ${p.level}!`); } 
        else { UI.dialog("¡Ganaste! +20 XP"); }
        
        if(State.battle.isTrainer) {
            setTimeout(() => {
                UI.dialog("¡JUEGO COMPLETADO!"); // Fin de la demo
                setTimeout(Battle.end, 3000);
            }, 2000);
        } else {
            setTimeout(Battle.end, 2000);
        }
    },
    run: function() { 
        if(State.battle.isTrainer) { UI.dialog("¡No puedes huir!"); return; }
        UI.dialog("Huiste."); setTimeout(Battle.end, 1000); 
    },
    end: function() {
        document.getElementById('battle-ui').classList.add('hidden');
        UI.hideDialog(); State.mode = 'EXPLORE';
    },
    render: function() {
        const grd = Ctx.createLinearGradient(0,0,0,160);
        grd.addColorStop(0, GB_COLORS.lightest); grd.addColorStop(1, GB_COLORS.light);
        Ctx.fillStyle = grd; Ctx.fillRect(0,0,320,160);
        // Plataforma enemiga
        Ctx.fillStyle = GB_COLORS.dark;
        Ctx.beginPath(); Ctx.ellipse(240, 100, 60, 20, 0, 0, Math.PI*2); Ctx.fill();
        // Plataforma jugador
        Ctx.fillStyle = GB_COLORS.dark;
        Ctx.beginPath(); Ctx.ellipse(80, 150, 60, 20, 0, 0, Math.PI*2); Ctx.fill();
        if(State.battle.enemy) Ctx.drawImage(GFX.getMonster(State.battle.enemy.id || 99), 208, 68);
        if(State.player.team[0]) Ctx.drawImage(GFX.getMonster(State.player.team[0].id || 1), 48, 118);
    }
};

// FIX: Eliminar función gameLoop duplicada (código muerto línea 451)

const UI = {
    dialog: function(text) { document.getElementById('dialog-box').classList.remove('hidden'); document.getElementById('dialog-text').innerText = text; },
    hideDialog: function() { document.getElementById('dialog-box').classList.add('hidden'); },
    toast: function(t) { const el=document.getElementById('toast-area'); el.innerText=t; setTimeout(()=>el.innerText='',2000); }
};

// --- INPUT HANDLER ---
function attachInput(id, key) {
    const btn = document.getElementById(id);
    if(btn) {
        const press = (e) => { e.preventDefault(); State.input[key] = true; btn.classList.add('pressed'); Audio.resume(); };
        const release = (e) => { e.preventDefault(); State.input[key] = false; btn.classList.remove('pressed'); };
        btn.addEventListener('touchstart', press, {passive: false});
        btn.addEventListener('touchend', release, {passive: false});
        btn.addEventListener('mousedown', press); btn.addEventListener('mouseup', release);
    }
}

window.onload = function() {
    attachInput('btn-up','up'); attachInput('btn-down','down'); attachInput('btn-left','left'); attachInput('btn-right','right');
    attachInput('btn-a','a'); attachInput('btn-b','b');
    const start = document.getElementById('click-to-start');
    if(start) { start.addEventListener('touchstart', Game.init, {once:true}); start.addEventListener('click', Game.init, {once:true}); }
    document.addEventListener('visibilitychange', () => { if(!document.hidden) { Audio.resume(); State.lastTime = performance.now(); } });
};

// FIX: Eliminar función gameLoop duplicada - ya usamos requestAnimationFrame en Game.loop
