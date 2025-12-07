/* =========================================
   NEOS ENGINE v12.1 - FIX (Graphics Init)
   ========================================= */

// --- CONFIGURACIÓN ---
const CFG = {
    TILE: 32, // Tamaño visual
    W: 320, H: 288,
    MAP_W: 20, MAP_H: 20
};

const COLORS = {
    'Normal': '#A8A878', 'Fuego': '#F08030', 'Agua': '#6890F0',
    'Planta': '#78C850', 'Eléctrico': '#F8D030', 'Acero': '#B8B8D0', 'Ciber': '#FF00CC'
};

// --- BASE DE DATOS ---
const DB = {
    monsters: [],
    moves: [
        {name: "Placaje", type: "Normal", pwr: 40},
        {name: "Arañazo", type: "Normal", pwr: 40},
        {name: "Ascuas", type: "Fuego", pwr: 40},
        {name: "Pistola Agua", type: "Agua", pwr: 40},
        {name: "Látigo Cepa", type: "Planta", pwr: 45},
        {name: "Impactrueno", type: "Eléctrico", pwr: 40},
        {name: "Garra Metal", type: "Acero", pwr: 50},
        {name: "Hackeo", type: "Ciber", pwr: 60},
        {name: "Lanzallamas", type: "Fuego", pwr: 90},
        {name: "Hidrobomba", type: "Agua", pwr: 110},
        {name: "Rayo", type: "Eléctrico", pwr: 90}
    ]
};

function generatePokedex() {
    // Definidos Manualmente para evitar errores de inicio
    const manual = [
        {id: 1, name: "Solasaur", type: "Planta", type2: "Eléctrico", hp: 45, atk: 49, def: 49},
        {id: 4, name: "Calderón", type: "Fuego", type2: "Acero", hp: 39, atk: 52, def: 43},
        {id: 7, name: "Hidrojet", type: "Agua", type2: "Acero", hp: 44, atk: 48, def: 65},
        {id: 25, name: "Voltmouse", type: "Eléctrico", type2: null, hp: 35, atk: 55, def: 40},
        {id: 150, name: "Omegear", type: "Acero", type2: "Ciber", hp: 106, atk: 110, def: 90}
    ];

    for(let i=1; i<=151; i++) {
        let mon = manual.find(m => m.id === i);
        if(!mon) {
            const type = Object.keys(COLORS)[Math.floor((i * 13) % 7)]; // 7 tipos definidos
            mon = {
                id: i,
                name: `Unit-${i.toString().padStart(3,'0')}`,
                type: type,
                type2: null,
                hp: 40 + (i % 20),
                atk: 40 + (i % 30),
                def: 40 + (i % 25)
            };
        }
        mon.maxHp = mon.hp * 2;
        DB.monsters[i] = mon;
    }
}

// --- ESTADO ---
const State = {
    screen: 'START',
    ctx: null,
    lastTime: 0,
    player: {
        x: 160, y: 144, // Pixeles (Centro mapa aprox)
        gridX: 5, gridY: 5,
        dir: 'down',
        isMoving: false,
        movePercent: 0,
        team: [],
        bag: { potion: 5, ball: 10 },
        money: 1000
    },
    map: {
        width: 20, height: 20,
        tiles: [],
        events: []
    },
    battle: { enemy: null, myMon: null, turn: 0 },
    input: { keys: {} }
};

// --- AUDIO ---
const AudioEngine = {
    ctx: null,
    init: function() {
        if(!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if(this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    playTone: function(freq, type, duration) {
        if(!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    sfx: {
        select: () => AudioEngine.playTone(800, 'square', 0.1),
        bump: () => AudioEngine.playTone(150, 'sawtooth', 0.1),
        battle: () => {
            AudioEngine.playTone(400, 'square', 0.1);
            setTimeout(()=>AudioEngine.playTone(600, 'square', 0.1), 100);
        }
    }
};

// --- GRÁFICOS ---
const GFX = {
    cache: {},
    init: function(canvas) {
        State.ctx = canvas.getContext('2d');
        State.ctx.imageSmoothingEnabled = false;
    },
    getMonsterSprite: function(mon) {
        if(this.cache[mon.id]) return this.cache[mon.id];
        const c = document.createElement('canvas');
        c.width = 64; c.height = 64;
        const ctx = c.getContext('2d');
        const color = COLORS[mon.type] || '#fff';
        
        ctx.fillStyle = color;
        const seed = mon.id * 12345;
        // Generador procedural simple
        for(let y=10; y<54; y+=4) {
            for(let x=16; x<32; x+=4) {
                if(Math.sin(x*y*seed) > 0) {
                    ctx.fillRect(x, y, 4, 4);
                    ctx.fillRect(64-x-4, y, 4, 4);
                }
            }
        }
        // Borde y Ojos
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 10, 32, 44);
        ctx.fillStyle = '#000';
        ctx.fillRect(24, 24, 4, 4);
        ctx.fillRect(36, 24, 4, 4);
        
        this.cache[mon.id] = c;
        return c;
    }
};

// --- GAME LOOP ---
const Game = {
    start: function() {
        // 1. Inicializar Gráficos (CRÍTICO)
        const canvas = document.getElementById('game-canvas');
        GFX.init(canvas);
        
        // 2. Generar Datos
        generatePokedex();
        this.generateMap();
        
        // 3. Crear Equipo Inicial
        const starter = DB.monsters[7]; // Hidrojet
        if (starter) {
            State.player.team.push({
                ...starter,
                level: 5,
                currentHp: starter.maxHp,
                exp: 0, maxExp: 100,
                moves: [DB.moves[0], DB.moves[3]]
            });
        }

        // 4. Configurar Estado
        State.screen = 'WORLD';
        document.getElementById('start-overlay').style.display = 'none';
        AudioEngine.init();

        // 5. Iniciar Loop
        State.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    },

    generateMap: function() {
        for(let i=0; i<400; i++) State.map.tiles[i] = 0; // 0: Suelo
        // Muros Borde
        for(let x=0; x<20; x++) { State.map.tiles[x]=1; State.map.tiles[380+x]=1; }
        for(let y=0; y<20; y++) { State.map.tiles[y*20]=1; State.map.tiles[y*20+19]=1; }
        // Hierba
        for(let i=0; i<60; i++) {
            const idx = Math.floor(Math.random() * 400);
            if(State.map.tiles[idx] === 0) State.map.tiles[idx] = 2;
        }
    },

    loop: function(timestamp) {
        const dt = timestamp - State.lastTime;
        State.lastTime = timestamp;

        Game.update(dt);
        Game.render();
        requestAnimationFrame(Game.loop);
    },

    update: function(dt) {
        if(State.screen === 'WORLD') this.handleMovement();
    },

    handleMovement: function() {
        const p = State.player;
        if(p.isMoving) {
            p.movePercent += 0.1;
            if(p.movePercent >= 1) {
                p.movePercent = 0;
                p.isMoving = false;
                if(p.dir === 'up') p.gridY--;
                if(p.dir === 'down') p.gridY++;
                if(p.dir === 'left') p.gridX--;
                if(p.dir === 'right') p.gridX++;
                this.checkTile();
            }
            return;
        }

        let dx = 0, dy = 0;
        if(State.input.keys['ArrowUp']) { dy = -1; p.dir = 'up'; }
        else if(State.input.keys['ArrowDown']) { dy = 1; p.dir = 'down'; }
        else if(State.input.keys['ArrowLeft']) { dx = -1; p.dir = 'left'; }
        else if(State.input.keys['ArrowRight']) { dx = 1; p.dir = 'right'; }

        if(dx !== 0 || dy !== 0) {
            const target = (p.gridY + dy) * 20 + (p.gridX + dx);
            if(State.map.tiles[target] !== 1) {
                p.isMoving = true;
            } else {
                AudioEngine.sfx.bump();
            }
        }
    },

    checkTile: function() {
        const p = State.player;
        const tile = State.map.tiles[p.gridY * 20 + p.gridX];
        if(tile === 2 && Math.random() < 0.15) { // Hierba
            this.initBattle();
        }
    },

    initBattle: function() {
        AudioEngine.sfx.battle();
        State.screen = 'BATTLE';
        document.getElementById('ui-layer').style.pointerEvents = 'auto'; // Permitir clicks
        
        // Enemigo Random
        const id = Math.floor(Math.random() * 20) + 1;
        const base = DB.monsters[id] || DB.monsters[1];
        State.battle.enemy = {
            ...base,
            level: 3,
            currentHp: base.maxHp,
            maxHp: base.maxHp
        };
        State.battle.myMon = State.player.team[0];

        // Mostrar UI Batalla
        document.getElementById('battle-ui').classList.remove('hidden');
        document.getElementById('dialog-box').classList.remove('hidden');
        document.getElementById('dialog-text').innerText = `¡Un ${State.battle.enemy.name} salvaje apareció!`;
        this.updateBattleHUD();
    },

    battleInput: function(action) {
        if(action === 'run') {
            State.screen = 'WORLD';
            document.getElementById('battle-ui').classList.add('hidden');
            document.getElementById('dialog-box').classList.add('hidden');
            document.getElementById('ui-layer').style.pointerEvents = 'none';
        } else if (action === 'attack') {
            // Placeholder ataque
            const dmg = 10;
            State.battle.enemy.currentHp -= dmg;
            if(State.battle.enemy.currentHp < 0) State.battle.enemy.currentHp = 0;
            this.updateBattleHUD();
            if(State.battle.enemy.currentHp <= 0) {
                document.getElementById('dialog-text').innerText = "¡Ganaste!";
                setTimeout(() => this.battleInput('run'), 1500);
            }
        }
    },

    updateBattleHUD: function() {
        const en = State.battle.enemy;
        const pl = State.battle.myMon;
        document.getElementById('enemy-name').innerText = en.name;
        document.getElementById('enemy-hp-bar').style.width = (en.currentHp/en.maxHp*100)+'%';
        document.getElementById('player-name').innerText = pl.name;
        document.getElementById('player-hp-bar').style.width = (pl.currentHp/pl.maxHp*100)+'%';
        document.getElementById('hp-cur').innerText = pl.currentHp;
        document.getElementById('hp-max').innerText = pl.maxHp;
    },

    render: function() {
        const ctx = State.ctx;
        if(!ctx) return; // Seguridad

        // Limpiar
        ctx.fillStyle = '#081820';
        ctx.fillRect(0, 0, CFG.W, CFG.H);

        if(State.screen === 'WORLD') {
            this.renderWorld(ctx);
        } else if (State.screen === 'BATTLE') {
            this.renderBattle(ctx);
        }
    },

    renderWorld: function(ctx) {
        const p = State.player;
        // Cámara centrada
        const camX = Math.max(0, Math.min((p.gridX * 32) - 160 + 16, 20*32 - 320));
        const camY = Math.max(0, Math.min((p.gridY * 32) - 144 + 16, 20*32 - 288));

        // Tiles
        for(let y=0; y<20; y++) {
            for(let x=0; x<20; x++) {
                const t = State.map.tiles[y*20+x];
                const dx = x*32 - camX;
                const dy = y*32 - camY;
                
                // Optimización: Solo dibujar si está en pantalla
                if(dx < -32 || dx > 320 || dy < -32 || dy > 288) continue;

                if(t === 0) { // Suelo
                    ctx.fillStyle = '#222'; 
                    ctx.fillRect(dx, dy, 32, 32);
                    ctx.strokeStyle = '#333'; ctx.strokeRect(dx, dy, 32, 32);
                } else if(t === 1) { // Muro
                    ctx.fillStyle = '#555'; ctx.fillRect(dx, dy, 32, 32);
                    ctx.fillStyle = '#333'; ctx.fillRect(dx+4, dy+4, 24, 24);
                } else if(t === 2) { // Hierba
                    ctx.fillStyle = '#0f380f'; ctx.fillRect(dx, dy, 32, 32);
                    ctx.fillStyle = '#306230'; ctx.fillRect(dx+8, dy+8, 16, 16);
                }
            }
        }

        // Jugador
        let px = (p.gridX * 32) - camX;
        let py = (p.gridY * 32) - camY;
        if(p.isMoving) {
            if(p.dir === 'down') py -= 32 * (1 - p.movePercent);
            if(p.dir === 'up') py += 32 * (1 - p.movePercent);
            if(p.dir === 'right') px -= 32 * (1 - p.movePercent);
            if(p.dir === 'left') px += 32 * (1 - p.movePercent);
        }
        
        ctx.fillStyle = '#3498db';
        ctx.beginPath(); ctx.arc(px+16, py+16, 12, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    },

    renderBattle: function(ctx) {
        // Fondo
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, 320, 288);
        
        // Bases
        ctx.fillStyle = '#444';
        ctx.beginPath(); ctx.ellipse(240, 100, 60, 20, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(80, 220, 60, 20, 0, 0, Math.PI*2); ctx.fill();

        // Sprites
        if(State.battle.enemy) {
            const s = GFX.getMonsterSprite(State.battle.enemy);
            ctx.drawImage(s, 0, 0, 64, 64, 208, 40, 64, 64); // Enemigo arriba der
        }
        if(State.battle.myMon) {
            const s = GFX.getMonsterSprite(State.battle.myMon);
            ctx.drawImage(s, 0, 0, 64, 64, 48, 160, 64, 64); // Jugador abajo izq
        }
    }
};

// --- INPUTS ---
const handleKey = (key, pressed) => {
    State.input.keys[key] = pressed;
};
window.addEventListener('keydown', e => handleKey(e.key, true));
window.addEventListener('keyup', e => handleKey(e.key, false));

// Touch Virtual
document.querySelectorAll('[data-key]').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleKey(btn.dataset.key, true);
        btn.classList.add('active'); // Visual feedback
        AudioEngine.sfx.select();
    });
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleKey(btn.dataset.key, false);
        btn.classList.remove('active');
    });
});

// START EVENT
document.getElementById('start-overlay').addEventListener('click', () => {
    Game.start();
});
