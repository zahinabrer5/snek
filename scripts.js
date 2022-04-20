const screen = document.getElementById('screen');
const ctx = screen.getContext('2d', { alpha: false });
const gameOverCtx = document.getElementById('game-over').getContext('2d');
const pausedCtx = document.getElementById('paused').getContext('2d');
const w = screen.width;
const h = screen.height;
const cellW = 25;

let moveQueue = [];
addEventListener('keydown', e => {
    e.preventDefault();

    switch (e.key) {
        case 'p':
            paused = true;
            pausedCtx.fillStyle = '#000000';
            pausedCtx.font = 'bold 48px monospace';
            pausedCtx.textAlign = 'center';
            pausedCtx.textBaseLine = 'middle';
            pausedCtx.fillText('Paused', w/2, h/2);
            pausedCtx.font = 'bold 24px monospace';
            pausedCtx.fillText('Press R to resume', w/2, h/2+48);
            break;

        case 'r':
            paused = false;
            pausedCtx.clearRect(0, 0, w, h);
            break;

        case 'q':
            window.location.reload();
            break;

        default:
            break;
    }

    moveQueue.push(e.key);
}, false);

// use modulus instead of remainder
const mod = (a, b) => ((a % b) + b) % b;

let x = 0;
let y = 0;
let velX = cellW;
let velY = 0;
let foodX;
let foodY;
let realX;
let realY;
let snake = [];
let lastMove = 'right';
respawnFood();
let head = rhead;
let paused = false;
hscore.innerHTML = localStorage.getItem('snekHighScore');
let oldHigh = hscore.innerHTML;

// main game interval
let run = setInterval(() => {
    if (!paused) {
        // fill background
        ctx.drawImage(background, 0, 0);

        // 'real' coordinates used to draw snake
        realX = mod(x, w);
        realY = mod(y, h);

        // check if snake's head has bumped into body (game over)
        if (inSnake(realX, realY)) {
            gameOverCtx.fillStyle = '#000000';
            gameOverCtx.font = 'bold 48px monospace';
            gameOverCtx.textAlign = 'center';
            gameOverCtx.textBaseline = 'middle';
            gameOverCtx.fillText('GAME OVER', w/2, h/2-72);
            gameOverCtx.font = 'bold 24px monospace';
            gameOverCtx.fillText(`Final Score: ${snake.length}`, w/2, h/2+48);
            gameOverCtx.fillText('Press Q to restart', w/2, h/2+72);

            if (Number(hscore.innerHTML) > Number(oldHigh)) {
                gameOverCtx.fillStyle = '#FFFF00';
                gameOverCtx.fillText('NEW HIGH SCORE!!!', w/2, h/2+120);
            }

            clearInterval(run);
        }

        // draw food
        ctx.drawImage(food, foodX, foodY);

        let oldSnake = [...snake];

        // update and draw snake body
        ctx.fillStyle = '#0e660e';
        for (let i = 1; i < snake.length-1; i++) {
            snake[i] = oldSnake[i-1];
            ctx.fillRect(snake[i][0], snake[i][1], cellW, cellW);
        }

        // update and draw snake tail
        if (snake.length > 1) {
            snake[snake.length-1] = oldSnake[snake.length-2];
            ctx.drawImage(
                getTail(snake[snake.length-1][2]),
                snake[snake.length-1][0],
                snake[snake.length-1][1]
            );
        }

        // update and draw snake head
        snake[0] = [realX, realY, head];
        ctx.drawImage(head, realX, realY);

        // check if snake has eaten food
        if (realX == foodX && realY == foodY) {
            respawnFood();
            snake.push([realX, realY]);
            score.innerHTML = snake.length;

            if (Number(score.innerHTML) > Number(hscore.innerHTML)) {
                hscore.innerHTML = score.innerHTML;
                localStorage.setItem('snekHighScore', snake.length);
            }
        }

        x += velX;
        y += velY;
    }
    moveSnake();
}, 75);

function moveSnake() {
    if (moveQueue.length == 0) return;
    let move = moveQueue[0].length > 1 ? moveQueue[0].substring(5) : moveQueue[0];
    move = move.toLowerCase();
    switch (move) {
        case 'left':
            // make it so you can't go 'backwards'
            // or change controls while game paused
            if (lastMove != 'right' && !paused) {
                velX = -cellW;
                velY = 0;
                lastMove = move;
                head = lhead;
            }
            break;

        case 'up':
            if (lastMove != 'down' && !paused) {
                velX = 0;
                velY = -cellW;
                lastMove = move;
                head = uhead;
            }
            break;

        case 'right':
            if (lastMove != 'left' && !paused) {
                velX = cellW;
                velY = 0;
                lastMove = move;
                head = rhead;
            }
            break;

        case 'down':
            if (lastMove != 'up' && !paused) {
                velX = 0;
                velY = cellW;
                lastMove = move;
                head = dhead;
            }
            break;

        default:
            break;
    }
    moveQueue.shift();
}

function respawnFood() {
    foodX = Math.floor(w/cellW * Math.random()) * cellW;
    foodY = Math.floor(h/cellW * Math.random()) * cellW;
    while (inSnake(foodX, foodY)) {
        foodX = Math.floor(w/cellW * Math.random()) * cellW;
        foodY = Math.floor(h/cellW * Math.random()) * cellW;
    }
}

function inSnake(searchX, searchY) {
    for (let cell of snake)
        if (cell[0] == searchX && cell[1] == searchY)
            return true;
    return false;
}

function getTail(headImg) {
    let dir = headImg.src.split('/').at(-1).split('.')[0];
    return document.getElementById(dir+'tail');
}
