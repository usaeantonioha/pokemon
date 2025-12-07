// --- BATALLA ---
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
        
        // Daño Jugador -> Enemigo
        setTimeout(() => {
            State.battle.enemy.hp -= 10; 
            if(State.battle.enemy.hp < 0) State.battle.enemy.hp = 0;
            
            // Usamos 'Battle' explícitamente en lugar de 'this' para evitar errores
            Battle.updateUI(); 
            
            if(State.battle.enemy.hp <= 0) {
                setTimeout(Battle.win, 1000);
            } else {
                State.battle.turn = 'enemy';
                setTimeout(Battle.enemyTurn, 1000); // Llamada corregida
            }
        }, 1000);
    },
    enemyTurn: function() {
        UI.dialog(`¡Enemigo ataca!`);
        
        // Daño Enemigo -> Jugador
        setTimeout(() => {
            State.player.team[0].hp -= 5; 
            if(State.player.team[0].hp < 0) State.player.team[0].hp = 0;
            
            Battle.updateUI(); // Llamada segura
            
            if(State.player.team[0].hp <= 0) { 
                UI.dialog("Debilitado..."); 
                setTimeout(Battle.end, 2000); 
            } else { 
                State.battle.turn = 'player'; 
                document.getElementById('battle-menu').classList.remove('hidden'); 
                UI.hideDialog(); 
            }
        }, 1000);
    },
    win: function() { 
        UI.dialog("¡Ganaste!"); 
        setTimeout(Battle.end, 2000); 
    },
    run: function() { 
        UI.dialog("Huiste."); 
        setTimeout(Battle.end, 1000); 
    },
    end: function() {
        document.getElementById('battle-ui').classList.add('hidden');
        UI.hideDialog(); 
        State.mode = 'EXPLORE';
    }
};
