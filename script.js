/* =========================================
   NEOS ENGINE v14.0 - TEXTURED FINAL
   ========================================= */

// --- CONFIGURACIÓN ---
const CFG = { TILE: 32, W: 320, H: 288, MAP_W: 20, MAP_H: 20 };
const COLORS = { 'Normal':'#A8A878', 'Fuego':'#F08030', 'Agua':'#6890F0', 'Planta':'#78C850', 'Eléctrico':'#F8D030', 'Acero':'#B8B8D0', 'Ciber':'#FF00CC' };

// --- SPRITE DEL JUGADOR (BASE64) ---
// Un simple sprite de 16x16 estilo 8-bits de un personaje con gorra
const PLAYER_SPRITE_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAE5JREFUOE9jZKAQcAEPxv///zOQgwmHjBglYBogFhOgmfH///8M5GDCIQZIMwE9TUA2GyQGUz1B+QnI4n9YgHqagGz2////GcgBAJmLHwH8s5O8AAAAAElFTkSuQmCC';
const playerImg = new Image(); playerImg.src = PLAYER_SPRITE_DATA;

// --- BASE DE DATOS ---
const DB = {
    monsters: [],
    moves: [
        {name: "Placaje", type: "Normal", pwr: 40}, {name: "Ascuas", type: "Fuego", pwr: 40},
        {name: "Pistola Agua", type: "Agua", pwr: 40}, {name: "Látigo Cepa", type: "Planta", pwr: 45},
        {name: "Impactrueno", type: "Eléctrico", pwr: 40}, {name: "Garra Metal", type: "Acero", pwr: 50},
        {name: "Hackeo", type: "Ciber", pwr: 60}, {name: "Lanzallamas", type: "Fuego", pwr: 90},
        {name: "Hidrobomba", type: "Agua", pwr: 110}, {name: "Rayo", type: "Eléctrico", pwr: 90}
    ]
};

function generatePokedex() {
    const manual = [
        {id: 1, name: "Solasaur", type: "Planta", type2: "Eléctrico", hp: 45, atk: 49, def: 49},
        {id: 4, name: "Calderón", type: "Fuego", type2: "Acero", hp: 39, atk: 52, def: 43},
        {id: 7, name: "Hidrojet", type: "Agua", type2: "Acero", hp: 44, atk: 48, def: 65},
        {id: 25, name: "Voltmouse", type: "Eléctrico", type2: null, hp: 35, atk: 55, def: 40},
        {id: 150, name: "Omegear", type: "Acero", type2: "Ciber", hp: 106, atk: 110, def: 90}
    ];
    const prefixes = ['Cyber', 'Mecha', 'Neo', 'Volt', 'Iron', 'Data', 'Nano'];
    const suffixes = ['bot', 'droid', 'gear', 'tron', 'byte', 'rex', 'wing'];

    for(let i=1; i<=151; i++) {
        let mon = manual.find(m => m.id === i);
        if(!mon) {
            const type = Object.keys(COLORS)[i % 7];
            const pre = prefixes[i % prefixes.length];
            const suf = suffixes[(i*3) % suffixes.length];
            mon = {
                id: i, name: `${pre}${suf}`, type: type, type2: null,
                hp: 40 + (i % 40), atk: 40 + (i % 50), def: 40 + (i % 45)
            };
        }
        mon.maxHp = mon.hp * 2;
        DB.monsters[i] = mon;
    }
}

// --- ESTADO ---
const State = {
    screen: 'START', ctx: null, lastTime: 0,
    player: { x:160, y:144, gridX:5, gridY:5, dir:'down', isMoving:false, movePercent:0, team:[], bag:{potion:5, ball:10}, money:1000 },
    map: { width:20, height:20, tiles:[], events:[] },
    battle: { enemy:null, myMon:null, turn:0 },
    input: { keys:{}, touchDir:null },
    dialog: { active:false, text:'', charIndex:0 }
};

// --- AUDIO ---
const AudioEngine = {
    ctx: null,
    init: function() {
        if(!this.ctx) this.ctx = new (window.AudioContext||window.webkitAudioContext)();
        if(this.ctx.state === 'suspended') this.ctx.resume();
    },
    playTone: function(freq, type, duration, vol=0.1) {
        if(!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + duration);
    },
    sfx: {
        select: ()=>AudioEngine.playTone(1200, 'square', 0.05),
        bump: ()=>AudioEngine.playTone(150, 'sawtooth', 0.1, 0.2),
        battle: ()=>{
            AudioEngine.playTone(600, 'square', 0.1); setTimeout(()=>AudioEngine.playTone(800, 'square', 0.2), 100);
        }
    }
};

// --- GRÁFICOS (TEXTURAS Y SPRITES) ---
const GFX = {
    cache: {},
    textures: {},
    init: function(canvas) {
        State.ctx = canvas.getContext('2d');
        State.ctx.imageSmoothingEnabled = false;
        this.generateTextures();
    },
    // Genera texturas procedurales para el mapa
    generateTextures: function() {
        // Suelo Metálico
        const floor = this.createCanvasPattern(32, (ctx)=>{
            ctx.fillStyle = '#2a2a35'; ctx.fillRect(0,0,32,32);
            ctx.strokeStyle = '#1a1a25'; ctx.strokeRect(0,0,32,32); // Bordes placa
            ctx.fillStyle = '#3a3a45'; ctx.fillRect(4,4,2,2); ctx.fillRect(26,26,2,2); // Remaches
            ctx.fillStyle = '#222'; ctx.fillRect(10,10,12,12); // Panel central oscuro
        });
        this.textures[0] = floor;

        // Muro de Edificio
        const wall = this.createCanvasPattern(32, (ctx)=>{
            ctx.fillStyle = '#4a4a55'; ctx.fillRect(0,0,32,32);
            ctx.fillStyle = '#3a3a45'; ctx.fillRect(0,30,32,2); // Sombra base
            ctx.fillStyle = '#6a6a75'; ctx.fillRect(0,0,32,2); // Brillo superior
            // Ventana Ciberpunk
            ctx.fillStyle = '#000'; ctx.fillRect(8,8,16,16);
            ctx.fillStyle = 'rgba(0,255,242,0.5)'; ctx.fillRect(10,10,4,14); ctx.fillRect(18,10,4,14);
        });
        this.textures[1] = wall;

        // Hierba Digital
        const grass = this.createCanvasPattern(32, (ctx)=>{
            ctx.fillStyle = '#0f380f'; ctx.fillRect(0,0,32,32); // Base oscura
            ctx.fillStyle = '#306230';
            for(let i=0; i<20; i++) { // Briznas
                ctx.fillRect(Math.random()*30, Math.random()*30, 2, 4);
            }
            ctx.fillStyle = '#00ffcc'; // Circuito brillante
            ctx.fillRect(5,5,2,2); ctx.fillRect(25,25,2,2);
        });
        this.textures[2] = grass;
    },
    createCanvasPattern: function(size, drawFn) {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        drawFn(c.getContext('2d'));
        return State.ctx.createPattern(c, 'repeat');
    },
    // Generador de Monstruos con Sombreado
    getMonsterSprite: function(mon) {
        if(this.cache[mon.id]) return this.cache[mon.id];
        const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        const ctx = c.getContext('2d');
        const baseColor = COLORS[mon.type] || '#fff';
        const shadeColor = this.adjustColor(baseColor, -40);
        
        const seed = mon.id * 997;
        // Base y Sombra procedural
        for(let y=12; y<52; y+=4) {
            for(let x=16; x<32; x+=4) {
                if(Math.sin(x*y*seed) > 0.1) {
                    // Color base
                    ctx.fillStyle = baseColor;
                    ctx.fillRect(x, y, 4, 4); ctx.fillRect(64-x-4, y, 4, 4);
                    // Sombra en bordes inferiores/derechos
                    if(Math.sin((x+4)*y*seed) <= 0.1 || Math.sin(x*(y+4)*seed) <= 0.1) {
                        ctx.fillStyle = shadeColor;
                        ctx.fillRect(x+2, y+2, 2, 2); ctx.fillRect(64-x-2, y+2, 2, 2);
                    }
                }
            }
        }
        // Ojos brillantes
        ctx.fillStyle = '#000'; ctx.fillRect(24, 24, 4, 4); ctx.fillRect(36, 24, 4, 4);
        ctx.fillStyle = '#00ffcc'; ctx.fillRect(25, 25, 2, 2); ctx.fillRect(37, 25, 2, 2);
        // Borde exterior
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(14, 10, 36, 44);

        this.cache[mon.id] = c; return c;
    },
    adjustColor: function(color, amount) {
        let hex = color.replace('#','');
        let r = parseInt(hex.substring(0,2), 16);
        let g = parseInt(hex.substring(2,4), 16);
        let b = parseInt(hex.substring(4,6), 16);
        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
};

// --- GAME LOOP & LÓGICA ---
const Game = {
    start: function() {
        GFX.init(document.getElementById('game-canvas'));
        generatePokedex(); this.generateMap();
        
        // Historia Inicial
        State.screen = 'DIALOGUE';
        this.typeDialog("Despiertas en Pueblo Engranaje. Tu primer día como Hacker comienza hoy...");
        
        setTimeout(() => {
            // Starter (Hidrojet)
            State.player.team.push({ ...DB.monsters[7], level:5, currentHp:DB.monsters[7].maxHp, moves:[DB.moves[0], DB.moves[3]] });
            State.screen = 'WORLD';
        }, 3000);

        State.lastTime = performance.now();
        document.getElementById('start-overlay').style.display = 'none';
        AudioEngine.init();
        requestAnimationFrame(this.loop);
    },
    generateMap: function() {
        for(let i=0; i<400; i++) State.map.tiles[i] = 0; // Suelo
        for(let x=0; x<20; x++) { State.map.tiles[x]=1; State.map.tiles[380+x]=1; } // Muros norte/sur
        for(let y=0; y<20; y++) { State.map.tiles[y*20]=1; State.map.tiles[y*20+19]=1; } // Muros este/oeste
        for(let i=0; i<80; i++) { // Hierba
            const idx = Math.floor(Math.random()*360)+20;
            if(State.map.tiles[idx]===0) State.map.tiles[idx]=2;
        }
        State.map.tiles[85]=1; State.map.tiles[86]=1; // Casa ejemplo
    },
    loop: function(timestamp) {
        const dt = timestamp - State.lastTime; State.lastTime = timestamp;
        Game.update(dt); Game.render();
        requestAnimationFrame(Game.loop);
    },
    update: function(dt) {
        if(State.screen === 'WORLD') this.handleMovement();
        if(State.dialog.active) this.updateDialog(dt);
    },
    handleMovement: function() {
        const p = State.player;
        if(p.isMoving) {
            p.movePercent += 0.1;
            if(p.movePercent >= 1) {
                p.movePercent = 0; p.isMoving = false;
                if(p.dir==='up') p.gridY--; if(p.dir==='down') p.gridY++;
                if(p.dir==='left') p.gridX--; if(p.dir==='right') p.gridX++;
                this.checkTile();
            }
            return;
        }
        let dx=0, dy=0;
        if(State.input.keys['ArrowUp']) { dy=-1; p.dir='up'; }
        else if(State.input.keys['ArrowDown']) { dy=1; p.dir='down'; }
        else if(State.input.keys['ArrowLeft']) { dx=-1; p.dir='left'; }
        else if(State.input.keys['ArrowRight']) { dx=1; p.dir='right'; }

        if(dx!==0 || dy!==0) {
            const target = (p.gridY+dy)*20 + (p.gridX+dx);
            if(State.map.tiles[target] !== 1) p.isMoving = true;
            else AudioEngine.sfx.bump();
        }
    },
    checkTile: function() {
        const tile = State.map.tiles[State.player.gridY*20 + State.player.gridX];
        if(tile === 2 && Math.random() < 0.15) this.initBattle();
    },
    initBattle: function() {
        AudioEngine.sfx.battle(); State.screen = 'BATTLE';
        document.getElementById('ui-layer').style.pointerEvents = 'auto';
        const id = Math.floor(Math.random()*151)+1;
        const base = DB.monsters[id] || DB.monsters[1];
        State.battle.enemy = { ...base, level:Math.floor(Math.random()*3)+2, currentHp:base.maxHp, maxHp:base.maxHp };
        State.battle.myMon = State.player.team[0];
        document.getElementById('battle-ui').classList.remove('hidden');
        this.typeDialog(`¡Un ${State.battle.enemy.name} salvaje ha aparecido!`);
        this.updateBattleHUD();
    },
    battleInput: function(action) {
        if(action === 'run') {
            State.screen = 'WORLD';
            document.getElementById('battle-ui').classList.add('hidden');
            document.getElementById('dialog-box').classList.add('hidden');
            document.getElementById('ui-layer').style.pointerEvents = 'none';
        } else if(action === 'attack') {
            const dmg = Math.floor(State.battle.myMon.atk / State.battle.enemy.def * 15);
            State.battle.enemy.currentHp -= dmg;
            this.typeDialog(`${State.battle.myMon.name} atacó. ¡Causó ${dmg} daño!`);
            this.updateBattleHUD();
            if(State.battle.enemy.currentHp <= 0) {
                setTimeout(()=>{ this.typeDialog("¡Enemigo derrotado! +XP"); }, 1000);
                setTimeout(()=>this.battleInput('run'), 2500);
            }
        }
    },
    updateBattleHUD: function() {
        const en=State.battle.enemy, pl=State.battle.myMon;
        document.getElementById('enemy-name').innerText = en.name;
        document.getElementById('enemy-hp-bar').style.width = Math.max(0,(en.currentHp/en.maxHp*100))+'%';
        document.getElementById('player-name').innerText = pl.name;
        document.getElementById('player-hp-bar').style.width = Math.max(0,(pl.currentHp/pl.maxHp*100))+'%';
        document.getElementById('hp-cur').innerText = Math.max(0, pl.currentHp);
        document.getElementById('hp-max').innerText = pl.maxHp;
    },
    typeDialog: function(text) {
        const box = document.getElementById('dialog-box');
        const txtEl = document.getElementById('dialog-text');
        box.classList.remove('hidden');
        State.dialog.text = text;
        State.dialog.charIndex = 0;
        State.dialog.active = true;
        txtEl.innerText = '';
    },
    updateDialog: function(dt) {
        if(State.dialog.charIndex < State.dialog.text.length) {
            document.getElementById('dialog-text').innerText += State.dialog.text.charAt(State.dialog.charIndex);
            State.dialog.charIndex++;
            if(State.dialog.charIndex % 3 === 0) AudioEngine.sfx.select(); // Sonido al escribir
        } else {
            State.dialog.active = false;
            setTimeout(()=>{ if(State.screen==='DIALOGUE') State.screen='WORLD'; document.getElementById('dialog-box').classList.add('hidden'); }, 2000);
        }
    },
    toggleMenu: function() { document.getElementById('pause-menu').classList.toggle('hidden'); },
    menuAction: function(act) {
        if(act==='close') this.toggleMenu();
        if(act==='save') { localStorage.setItem('neos_save', JSON.stringify(State.player)); this.typeDialog("Partida guardada en el disco local."); this.toggleMenu(); }
    },
    render: function() {
        const ctx = State.ctx; if(!ctx) return;
        ctx.fillStyle = '#0a0a12'; ctx.fillRect(0,0,CFG.W,CFG.H);
        if(State.screen === 'WORLD' || State.screen === 'DIALOGUE') this.renderWorld(ctx);
        else if(State.screen === 'BATTLE') this.renderBattle(ctx);
    },
    renderWorld: function(ctx) {
        const p = State.player;
        const camX = Math.max(0, Math.min((p.gridX*32)-160+16, 20*32-320));
        const camY = Math.max(0, Math.min((p.gridY*32)-144+16, 20*32-288));
        for(let y=0; y<20; y++) {
            for(let x=0; x<20; x++) {
                const t = State.map.tiles[y*20+x];
                const dx = x*32-camX; const dy = y*32-camY;
                if(dx<-32||dx>320||dy<-32||dy>288) continue;
                // Usar texturas en lugar de colores planos
                ctx.fillStyle = GFX.textures[t] || '#000';
                ctx.fillRect(dx, dy, 32, 32);
            }
        }
        let px = (p.gridX*32)-camX; let py = (p.gridY*32)-camY;
        if(p.isMoving) {
            if(p.dir==='down') py-=32*(1-p.movePercent); if(p.dir==='up') py+=32*(1-p.movePercent);
            if(p.dir==='right') px-=32*(1-p.movePercent); if(p.dir==='left') px+=32*(1-p.movePercent);
        }
        // Dibujar Sprite del Jugador (Base64 Image)
        ctx.drawImage(playerImg, px, py, 32, 32);
    },
    renderBattle: function(ctx) {
        // Fondo de batalla con gradiente cyberpunk
        const grd = ctx.createLinearGradient(0,0,0,288);
        grd.addColorStop(0, '#1a1a24'); grd.addColorStop(1, '#0a0a12');
        ctx.fillStyle = grd; ctx.fillRect(0,0,320,288);
        // Bases de neón
        ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(0,255,204,0.2)';
        ctx.beginPath(); ctx.ellipse(240,110,70,20,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(80,230,70,20,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        // Sprites
        if(State.battle.enemy) ctx.drawImage(GFX.getMonsterSprite(State.battle.enemy), 208, 50, 64, 64);
        if(State.battle.myMon) ctx.drawImage(GFX.getMonsterSprite(State.battle.myMon), 48, 170, 64, 64);
    }
};

// --- INPUTS ---
const handleKey=(k,p)=>{ State.input.keys[k]=p; };
window.addEventListener('keydown',e=>handleKey(e.key,true)); window.addEventListener('keyup',e=>handleKey(e.key,false));
document.querySelectorAll('[data-key]').forEach(b=>{
    b.addEventListener('touchstart',e=>{e.preventDefault();handleKey(b.dataset.key,true);b.classList.add('active');AudioEngine.sfx.select();});
    b.addEventListener('touchend',e=>{e.preventDefault();handleKey(b.dataset.key,false);b.classList.remove('active');});
});
document.getElementById('start-overlay').addEventListener('click',()=>Game.start());
