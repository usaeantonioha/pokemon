/* =========================================
   NEOS ENGINE v12.0 - GOLD MASTER
   Architecture: MVC + State Machine
   ========================================= */

// --- CONFIGURACIÓN Y CONSTANTES ---
const CFG = {
    TILE: 16, // Tamaño base tile (se escala x2 en render)
    SCALE: 2,
    W: 320, H: 288,
    SPEED: 4, // Pixels por frame
    MAP_W: 20, MAP_H: 15
};

const TYPES = ['Normal', 'Fuego', 'Agua', 'Planta', 'Eléctrico', 'Acero', 'Ciber'];
const COLORS = {
    'Normal': '#A8A878', 'Fuego': '#F08030', 'Agua': '#6890F0',
    'Planta': '#78C850', 'Eléctrico': '#F8D030', 'Acero': '#B8B8D0', 'Ciber': '#FF00CC'
};

// --- BASE DE DATOS PROCEDURAL ---
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

// Generador de Monstruos Determinista
function generatePokedex() {
    // Definidos Manualmente
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
            // Generación Procedural
            const type = TYPES[Math.floor((i * 13) % TYPES.length)];
            mon = {
                id: i,
                name: `Unit-${i.toString().padStart(3,'0')}`,
                type: type,
                type2: Math.random() > 0.7 ? TYPES[Math.floor(Math.random()*TYPES.length)] : null,
                hp: 40 + (i % 20),
                atk: 40 + (i % 30),
                def: 40 + (i % 25)
            };
        }
        mon.maxHp = mon.hp * 2; // Stat de juego
        DB.monsters[i] = mon;
    }
}

// --- ESTADO DEL JUEGO ---
const State = {
    screen: 'START', // START, WORLD, BATTLE, MENU, PAUSE
    ctx: null,
    lastTime: 0,
    player: {
        x: 160, y: 144, // Pixeles
        gridX: 5, gridY: 4,
        dir: 'down',
        isMoving: false,
        movePercent: 0,
        team: [],
        bag: { potion: 5, ball: 10, scrap: 0 },
        money: 1000
    },
    map: {
        width: 20, height: 20,
        tiles: [], // 0:floor, 1:wall, 2:grass, 3:water
        events: []
    },
    battle: {
        enemy: null,
        myMon: null,
        turn: 0,
        phase: 'menu' // menu, anim, end
    },
    input: {
        keys: {},
        touchDir: null,
        action: false
    }
};

// --- AUDIO SYNTH (Procedural) ---
const AudioEngine = {
    ctx: null,
    init: function() {
        if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
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
        battleStart: () => {
            AudioEngine.playTone(400, 'square', 0.1);
            setTimeout(()=>AudioEngine.playTone(600, 'square', 0.1), 100);
            setTimeout(()=>AudioEngine.playTone(800, 'square', 0.2), 200);
        }
    }
};

// --- MOTOR GRÁFICO (Canvas + Sprite Gen) ---
const GFX = {
    cache: {},
    init: function(canvas) {
        State.ctx = canvas.getContext('2d');
        State.ctx.imageSmoothingEnabled = false;
    },
    // Dibuja un sprite procedural basado en ID y Tipo
    getMonsterSprite: function(mon) {
        if(this.cache[mon.id]) return this.cache[mon.id];
        
        const c = document.createElement('canvas');
        c.width = 64; c.height = 64;
        const ctx = c.getContext('2d');
        const color = COLORS[mon.type] || '#fff';
        
        // Algoritmo de espejo simple para pixel art
        ctx.fillStyle = color;
        const seed = mon.id * 12345;
        for(let y=10; y<54; y+=4) {
            for(let x=16; x<32; x+=4) {
                if(Math.sin(x*y*seed) > 0) {
                    ctx.fillRect(x, y, 4, 4);
                    ctx.fillRect(64-x-4, y, 4, 4); // Espejo
                }
            }
        }
        // Ojos
        ctx.fillStyle = '#000';
        ctx.fillRect(24, 24, 4, 4);
        ctx.fillRect(36, 24, 4, 4);
        
        this.cache[mon.id] = c;
        return c;
    },
    drawRect: function(x, y, w, h, color) {
        State.ctx.fillStyle = color;
        State.ctx.fillRect(x, y, w, h);
    },
    drawText: function(text, x, y, color='#fff', size=16) {
        State.ctx.fillStyle = color;
        State.ctx.font = `${size}px 'VT323', monospace`;
        State.ctx.fillText(text, x, y);
    }
};

// --- LÓGICA DE JUEGO ---
const Game = {
    start: function() {
        generatePokedex();
        this.generateMap();
        
        // Starter Team
        State.player.team.push({
            ...DB.monsters[7], // Hidrojet
            level: 5,
            currentHp: DB.monsters[7].maxHp,
            exp: 0, maxExp: 100,
            moves: [DB.moves[0], DB.moves[3]] // Placaje, Pistola Agua
        });

        // Loop
        requestAnimationFrame(this.loop);
        
        document.getElementById('start-overlay').style.display = 'none';
        AudioEngine.init();
    },

    generateMap: function() {
        // Generar pueblo simple: 0 suelo, 1 muro, 2 hierba
        for(let i=0; i<400; i++) State.map.tiles[i] = 0;
        
        // Bordes
        for(let x=0; x<20; x++) {
            State.map.tiles[x] = 1; // Top
            State.map.tiles[380+x] = 1; // Bottom
        }
        for(let y=0; y<20; y++) {
            State.map.tiles[y*20] = 1; // Left
            State.map.tiles[y*20+19] = 1; // Right
        }
        
        // Hierba alta (RNG)
        for(let i=0; i<50; i++) {
            const idx = Math.floor(Math.random() * 400);
            if(State.map.tiles[idx] === 0) State.map.tiles[idx] = 2;
        }
        
        // Centro Pokemon (Casa)
        State.map.tiles[85] = 1; State.map.tiles[86] = 1;
        State.map.events.push({x:5, y:4, type:'heal'});
    },

    loop: function(timestamp) {
        const dt = timestamp - State.lastTime;
        State.lastTime = timestamp;

        Game.update(dt);
        Game.render();
        requestAnimationFrame(Game.loop);
    },

    update: function(dt) {
        if(State.screen === 'WORLD') {
            this.handleMovement();
        }
    },

    handleMovement: function() {
        const p = State.player;
        if(p.isMoving) {
            p.movePercent += 0.1; // Velocidad animación
            if(p.movePercent >= 1) {
                p.movePercent = 0;
                p.isMoving = false;
                // Actualizar grid coords
                if(p.dir === 'up') p.gridY--;
                if(p.dir === 'down') p.gridY++;
                if(p.dir === 'left') p.gridX--;
                if(p.dir === 'right') p.gridX++;
                
                this.checkTileEvent();
            }
            return;
        }

        // Input
        let dx = 0, dy = 0;
        if(State.input.keys['ArrowUp']) { dy = -1; p.dir = 'up'; }
        else if(State.input.keys['ArrowDown']) { dy = 1; p.dir = 'down'; }
        else if(State.input.keys['ArrowLeft']) { dx = -1; p.dir = 'left'; }
        else if(State.input.keys['ArrowRight']) { dx = 1; p.dir = 'right'; }

        if(dx !== 0 || dy !== 0) {
            const targetIdx = (p.gridY + dy) * 20 + (p.gridX + dx);
            const tile = State.map.tiles[targetIdx];
            
            if(tile !== 1) { // 1 es muro
                p.isMoving = true;
            } else {
                AudioEngine.sfx.bump();
            }
        }
        
        if(State.input.keys['a']) {
            State.input.keys['a'] = false; // Trigger once
            Game.interact();
        }
        
        if(State.input.keys['start']) {
            State.input.keys['start'] = false;
            this.toggleMenu();
        }
    },

    checkTileEvent: function() {
        const p = State.player;
        const tile = State.map.tiles[p.gridY * 20 + p.gridX];
        
        // Hierba Alta = Batalla
        if(tile === 2) {
            if(Math.random() < 0.15) { // 15% chance
                this.initBattle();
            }
        }
        // Eventos
        const evt = State.map.events.find(e => e.x === p.gridX && e.y === p.gridY);
        if(evt && evt.type === 'heal') {
            this.showToast("¡Equipo curado!");
            p.team.forEach(m => m.currentHp = m.maxHp);
        }
    },
    
    interact: function() {
        // Lógica simple de interacción
        this.showToast("Nada aquí.");
    },

    initBattle: function() {
        AudioEngine.sfx.battleStart();
        State.screen = 'BATTLE';
        
        // Generar enemigo random
        const id = Math.floor(Math.random() * 20) + 1;
        const enemyMon = {
            ...DB.monsters[id],
            level: Math.max(1, State.player.team[0].level + Math.floor(Math.random()*3)-1),
            currentHp: DB.monsters[id].maxHp, // Simplificado
            maxHp: DB.monsters[id].maxHp // Simplificado
        };
        State.battle.enemy = enemyMon;
        State.battle.myMon = State.player.team[0];
        
        // UI Setup
        document.getElementById('battle-ui').classList.remove('hidden');
        document.getElementById('virtual-controls').style.display = 'none'; // Ocultar Dpad
        
        this.updateBattleHUD();
        this.dialog("¡Un " + enemyMon.name + " salvaje apareció!");
    },

    battleInput: function(action) {
        if(action === 'attack') {
            const moves = State.battle.myMon.moves;
            const menu = document.getElementById('move-menu');
            menu.innerHTML = '';
            moves.forEach(m => {
                const btn = document.createElement('button');
                btn.innerText = m.name;
                btn.onclick = () => Game.executeMove(m);
                menu.appendChild(btn);
            });
            const back = document.createElement('button');
            back.innerText = "VOLVER"; back.onclick = () => {
                document.getElementById('move-menu').classList.add('hidden');
                document.getElementById('battle-menu').classList.remove('hidden');
            };
            menu.appendChild(back);
            
            document.getElementById('battle-menu').classList.add('hidden');
            menu.classList.remove('hidden');
        } 
        else if (action === 'run') {
            State.screen = 'WORLD';
            this.endBattle();
        }
    },

    executeMove: function(move) {
        document.getElementById('move-menu').classList.add('hidden');
        this.dialog(State.battle.myMon.name + " usó " + move.name + "!");
        
        // Daño simple
        const dmg = Math.floor(move.pwr * (State.battle.myMon.atk / State.battle.enemy.def) * 0.5);
        State.battle.enemy.currentHp -= dmg;
        if(State.battle.enemy.currentHp < 0) State.battle.enemy.currentHp = 0;
        
        this.updateBattleHUD();
        
        // Turno enemigo (timeout)
        setTimeout(() => {
            if(State.battle.enemy.currentHp <= 0) {
                this.dialog("¡Ganaste! +50 XP");
                setTimeout(() => this.endBattle(), 1000);
            } else {
                this.enemyTurn();
            }
        }, 1000);
    },

    enemyTurn: function() {
        this.dialog("¡El enemigo ataca!");
        setTimeout(() => {
            State.battle.myMon.currentHp -= 5; // Daño fijo por demo
            this.updateBattleHUD();
            document.getElementById('battle-menu').classList.remove('hidden');
        }, 1000);
    },

    endBattle: function() {
        document.getElementById('battle-ui').classList.add('hidden');
        document.getElementById('virtual-controls').style.display = 'flex';
        document.getElementById('dialog-box').classList.add('hidden');
        State.screen = 'WORLD';
    },

    updateBattleHUD: function() {
        const enemy = State.battle.enemy;
        const player = State.battle.myMon;
        
        document.getElementById('enemy-name').innerText = enemy.name;
        document.getElementById('enemy-lvl').innerText = enemy.level;
        document.getElementById('enemy-hp-bar').style.width = (enemy.currentHp / enemy.maxHp * 100) + '%';
        
        document.getElementById('player-name').innerText = player.name;
        document.getElementById('player-lvl').innerText = player.level;
        document.getElementById('player-hp-bar').style.width = (player.currentHp / player.maxHp * 100) + '%';
        document.getElementById('hp-cur').innerText = player.currentHp;
        document.getElementById('hp-max').innerText = player.maxHp;
    },

    dialog: function(text) {
        const box = document.getElementById('dialog-box');
        const txt = document.getElementById('dialog-text');
        box.classList.remove('hidden');
        txt.innerText = text;
    },

    toggleMenu: function() {
        const menu = document.getElementById('pause-menu');
        menu.classList.toggle('hidden');
    },
    
    menuAction: function(act) {
        if(act === 'close') this.toggleMenu();
        if(act === 'save') {
            localStorage.setItem('neos_save', JSON.stringify(State.player));
            this.showToast("Partida Guardada");
            this.toggleMenu();
        }
        if(act === 'export') {
            const data = btoa(JSON.stringify(State.player));
            prompt("Copia tu código:", data);
        }
    },

    showToast: function(msg) {
        const area = document.getElementById('notification-area');
        const t = document.createElement('div');
        t.className = 'toast';
        t.innerText = msg;
        area.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    },

    render: function() {
        const ctx = State.ctx;
        ctx.fillStyle = '#081820';
        ctx.fillRect(0, 0, CFG.W, CFG.H);

        if(State.screen === 'WORLD') {
            this.renderWorld(ctx);
        } else if (State.screen === 'BATTLE') {
            this.renderBattle(ctx);
        }
        
        // Ciclo Día/Noche Overlay
        const hour = new Date().getHours();
        if(hour >= 19 || hour < 6) {
            ctx.fillStyle = 'rgba(0, 10, 40, 0.4)'; // Noche
            ctx.fillRect(0,0, CFG.W, CFG.H);
        }
    },

    renderWorld: function(ctx) {
        const p = State.player;
        // Calcular offset cámara
        const camX = Math.max(0, Math.min((p.gridX * 32) - 160 + 16, 20*32 - 320)); // Simplificado
        const camY = Math.max(0, Math.min((p.gridY * 32) - 144 + 16, 20*32 - 288));
        
        // Dibujar Tiles
        for(let y=0; y<20; y++) {
            for(let x=0; x<20; x++) {
                const t = State.map.tiles[y*20+x];
                const dx = x*32; const dy = y*32;
                
                // Texturas simples (Colores Base64 conceptuales)
                if(t === 0) ctx.fillStyle = '#2e2e2e'; // Suelo
                if(t === 1) ctx.fillStyle = '#555'; // Muro
                if(t === 2) { // Hierba
                    ctx.fillStyle = '#1e3a2a';
                    ctx.fillRect(dx, dy, 32, 32);
                    ctx.fillStyle = '#0f0';
                    ctx.fillRect(dx+8, dy+8, 4, 4); // Detalle
                    continue; 
                }
                ctx.fillRect(dx, dy, 32, 32);
                
                // Bordes tiles
                ctx.strokeStyle = '#111';
                ctx.strokeRect(dx, dy, 32, 32);
            }
        }

        // Dibujar Jugador
        let px = p.gridX * 32;
        let py = p.gridY * 32;
        
        // Interpolación movimiento
        if(p.isMoving) {
            if(p.dir === 'down') py -= 32 * (1 - p.movePercent);
            if(p.dir === 'up') py += 32 * (1 - p.movePercent);
            if(p.dir === 'right') px -= 32 * (1 - p.movePercent);
            if(p.dir === 'left') px += 32 * (1 - p.movePercent);
        }

        // Sprite Jugador (Círculo simple por ahora)
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 12, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    },

    renderBattle: function(ctx) {
        // Fondo
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 320, 160);
        
        // Base Jugador
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.ellipse(80, 140, 60, 20, 0, 0, Math.PI*2); ctx.fill();
        
        // Base Enemigo
        ctx.beginPath(); ctx.ellipse(240, 60, 50, 15, 0, 0, Math.PI*2); ctx.fill();

        // Sprites (Generados)
        if(State.battle.myMon) {
            const s1 = GFX.getMonsterSprite(State.battle.myMon);
            ctx.drawImage(s1, 48, 76, 64, 64);
        }
        if(State.battle.enemy) {
            const s2 = GFX.getMonsterSprite(State.battle.enemy);
            ctx.drawImage(s2, 208, 10, 64, 64);
        }
    }
};

// --- INPUT HANDLER ---
const handleInput = (key, pressed) => {
    // Mapas de teclas
    const map = {
        'ArrowUp': 'ArrowUp', 'w': 'ArrowUp',
        'ArrowDown': 'ArrowDown', 's': 'ArrowDown',
        'ArrowLeft': 'ArrowLeft', 'a': 'ArrowLeft',
        'ArrowRight': 'ArrowRight', 'd': 'ArrowRight',
        'z': 'b', 'x': 'a', 'Enter': 'start'
    };
    const k = map[key] || key;
    State.input.keys[k] = pressed;
};

window.addEventListener('keydown', e => handleInput(e.key, true));
window.addEventListener('keyup', e => handleInput(e.key, false));

// Touch
document.querySelectorAll('[data-key]').forEach(el => {
    el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleInput(el.dataset.key, true);
        el.classList.add('pressed');
    });
    el.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleInput(el.dataset.key, false);
        el.classList.remove('pressed');
    });
});

// START
document.getElementById('start-overlay').addEventListener('click', () => {
    State.screen = 'WORLD';
    Game.start();
});
