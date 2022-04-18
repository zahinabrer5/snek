const screen = document.getElementById('screen');
const ctx = screen.getContext('2d');
const info = document.getElementById('info');
const infoCtx = info.getContext('2d');
const w = screen.width;
const h = screen.height;
const cellW = 25;

addEventListener('keydown', checkControls, false);

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
let lastCode = 39;
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
            infoCtx.fillStyle = '#000000';
            infoCtx.font = 'bold 48px monospace';
            infoCtx.textAlign = 'center';
            infoCtx.textBaseline = 'middle';
            infoCtx.fillText('GAME OVER', w/2, h/2-72);
            infoCtx.font = 'bold 24px monospace';
            infoCtx.fillText(`Final Score: ${snake.length}`, w/2, h/2+48);
            infoCtx.fillText('Press Q to restart', w/2, h/2+72);

            if (Number(hscore.innerHTML) > Number(oldHigh)) {
                infoCtx.fillStyle = '#FFFF00';
                infoCtx.fillText('NEW HIGH SCORE!!!', w/2, h/2+120);
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
}, 100);

function checkControls(e) {
    let code = e.keyCode;
    switch (code) {
        case 37: // left arrow key
            // make it so you can't go 'backwards'
            // or change controls while game paused
            e.preventDefault();
            if (lastCode != 39 && !paused) {
                velX = -25;
                velY = 0;
                lastCode = code;
                head = lhead;
            }
            break;
        case 38: // up arrow key
            e.preventDefault();
            if (lastCode != 40 && !paused) {
                velX = 0;
                velY = -25;
                lastCode = code;
                head = uhead;
            }
            break;
        case 39: // right arrow key
            e.preventDefault();
            if (lastCode != 37 && !paused) {
                velX = 25;
                velY = 0;
                lastCode = code;
                head = rhead;
            }
            break;
        case 40: // down arrow key
            e.preventDefault();
            if (lastCode != 38 && !paused) {
                velX = 0;
                velY = 25;
                lastCode = code;
                head = dhead;
            }
            break;
        case 80: // P key (pause)
            paused = true;
            break;
        case 82: // R key (resume)
            paused = false;
            break;
        case 81: // Q key (restart)
            window.location.reload();
            break;
        default:
            break;
    }
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
