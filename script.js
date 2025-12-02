// Estadísticas Iniciales
const player = {
    name: "Hidrojet",
    maxHp: 25,
    currentHp: 25,
    sprite: document.getElementById('player-sprite'),
    bar: document.getElementById('player-hp'),
    text: document.getElementById('current-hp')
};

const enemy = {
    name: "Avidrón",
    maxHp: 20,
    currentHp: 20,
    sprite: document.getElementById('enemy-sprite'),
    bar: document.getElementById('enemy-hp')
};

let isPlayerTurn = true;
let isBattleOver = false;

// Elementos UI
const dialogBox = document.getElementById('dialog-box');
const actionMenu = document.getElementById('action-menu');
const moveMenu = document.getElementById('move-menu');

// Iniciar
setTimeout(() => {
    dialogBox.innerText = "¿Qué hará " + player.name + "?";
    actionMenu.classList.remove('hidden');
}, 1500);

// Funciones de Menú
function showMoves() {
    actionMenu.classList.add('hidden');
    moveMenu.classList.remove('hidden');
}

function showActions() {
    moveMenu.classList.add('hidden');
    actionMenu.classList.remove('hidden');
    dialogBox.innerText = "¿Qué hará " + player.name + "?";
}

function addLog(text) {
    // Efecto de escribir texto letra por letra (simplificado aquí)
    dialogBox.innerText = text;
}

// Lógica de Ataque del Jugador
function playerAttack(move) {
    if (!isPlayerTurn || isBattleOver) return;

    moveMenu.classList.add('hidden');
    
    let moveName = "";
    let damage = 0;
    let type = "normal";

    if (move === 'pistón') {
        moveName = "Golpe Pistón";
        damage = Math.floor(Math.random() * 4) + 4; // 4-7 daño
    } else if (move === 'chorro') {
        moveName = "Chorro Presión";
        damage = Math.floor(Math.random() * 5) + 5; // 5-9 daño
        type = "water";
    }

    addLog(player.name + " usó " + moveName + "!");

    // Animación visual
    player.sprite.classList.add('attack-anim');
    setTimeout(() => player.sprite.classList.remove('attack-anim'), 300);

    setTimeout(() => {
        applyDamage(enemy, damage);
        
        if (enemy.currentHp <= 0) {
            endBattle(true);
        } else {
            isPlayerTurn = false;
            setTimeout(enemyTurn, 1500);
        }
    }, 1000);
}

// Turno del Enemigo (IA Simple)
function enemyTurn() {
    if (isBattleOver) return;

    const moves = ["Picotazo", "Ataque Ala"];
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    const damage = Math.floor(Math.random() * 4) + 3; // 3-6 daño

    addLog("¡" + enemy.name + " enemigo usó " + randomMove + "!");

    // Animación visual
    enemy.sprite.classList.add('attack-anim-enemy');
    setTimeout(() => enemy.sprite.classList.remove('attack-anim-enemy'), 300);

    setTimeout(() => {
        applyDamage(player, damage);
        
        if (player.currentHp <= 0) {
            endBattle(false);
        } else {
            isPlayerTurn = true;
            setTimeout(() => {
                showActions();
            }, 1500);
        }
    }, 1000);
}

// Aplicar Daño y Actualizar Barras
function applyDamage(target, amount) {
    target.currentHp -= amount;
    if (target.currentHp < 0) target.currentHp = 0;

    // Animación de recibir daño
    target.sprite.classList.add('shake');
    setTimeout(() => target.sprite.classList.remove('shake'), 500);

    // Actualizar barra visual
    const percent = (target.currentHp / target.maxHp) * 100;
    target.bar.style.width = percent + "%";

    // Cambiar color de barra
    if (percent < 20) target.bar.style.backgroundColor = "var(--hp-red)";
    else if (percent < 50) target.bar.style.backgroundColor = "var(--hp-yellow)";

    // Actualizar texto si es jugador
    if (target === player) {
        target.text.innerText = target.currentHp;
    }
}

// Fin de la Batalla
function endBattle(playerWon) {
    isBattleOver = true;
    if (playerWon) {
        addLog("¡" + enemy.name + " enemigo se debilitó! ¡" + player.name + " ganó!");
        enemy.sprite.style.opacity = "0"; // Desaparece
    } else {
        addLog("¡" + player.name + " se debilitó! ¡Has perdido!");
        player.sprite.style.opacity = "0";
    }
}