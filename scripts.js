const screen = document.getElementById('screen');
const ctx = screen.getContext('2d', { alpha: false });
const gameOverCtx = document.getElementById('gameover').getContext('2d');
const wallLayer = document.getElementById('wall-layer').getContext('2d');
const w = screen.width;
const h = screen.height;
const cellW = 25;

const useWalls = localStorage.getItem('toggleWalls') == '1';
if (useWalls) {
    // draw walls
    for (let i = 0; i < w/cellW; i++) {
        wallLayer.drawImage(wallCell, i*cellW, 0);
        wallLayer.drawImage(wallCell, i*cellW, h-cellW);
    }
    for (let i = 0; i < h/cellW; i++) {
        wallLayer.drawImage(wallCell, 0, i*cellW);
        wallLayer.drawImage(wallCell, w-cellW, i*cellW);
    }
}

let moveQueue = []; // keyboard buffer
let isPaused = false;
addEventListener('keydown', e => {
    e.preventDefault();
    switch (e.key) {
        case 'p':
            if (!isPaused && playing) {
                ctx.drawImage(paused, 0, 0);
                isPaused = true;
                bgMusic.pause();
            }
            break;

        case 'r':
            if (isPaused) {
                isPaused = false;
                bgMusic.play();
            }
            break;

        default:
            if (e.key.startsWith('Arrow') && !isPaused) {
                let move = e.key.substring(5).toLowerCase();
                // add to buffer if not already in buffer
                if (moveQueue[moveQueue.length-1] != move)
                    moveQueue.push(move);
            }
            break;
    }
}, false);

// 'keyup' prevents users from spamming reload by holding Q
addEventListener('keyup', e => {
    e.preventDefault();
    if (e.key.toLowerCase() == 'q')
        window.location.reload();
}, false);

// use mathematical mod instead of remainder
const mod = (a, b) => ((a % b) + b) % b;

let x = cellW;
let y = cellW;
let velX = cellW;
let velY = 0;
let foodX = cellW;
let foodY = cellW;
let toxicFoods = [];
let realX;
let realY;
let snake = [];
let lastMove = 'right';
let head = rhead;
let playing = true;
hscore.innerHTML = localStorage.getItem('snekHighScore');
let oldHigh = hscore.innerHTML;

bgMusic.volume = 0.1;
bgMusic.play();

let firstPlay = true;
let playCounter = 0;
let suicide = false;

// main game interval
let run = setInterval(() => {
    if (!isPaused) {
        ctx.drawImage(background, 0, 0);

        // 'real' coordinates used to draw snake
        realX = useWalls ? x : mod(x, w);
        realY = useWalls ? y : mod(y, h);

        // check if snake's head has bumped into body (game over)
        if (inSnake(realX, realY) || (useWalls && inWall(realX, realY)) || suicide) {
            playing = false;

            bgMusic.pause();

            // play bomb gif
            function onDrawFrame(ctx, frame) {
                ctx.drawImage(frame.buffer, realX-cellW, realY-cellW, cellW*3, cellW*3);
            }
            gifler('resources/img/death.gif').frames('canvas#bomb-gif', onDrawFrame);

            let death = new Audio('resources/sounds/death.mp3');
            death.volume = 0.5;
            death.play();

            gameOverCtx.fillStyle = '#000000';
            gameOverCtx.font = 'bold 48px Roboto Mono';
            gameOverCtx.textAlign = 'center';
            gameOverCtx.textBaseline = 'middle';
            gameOverCtx.fillText('YOU DIED', w/2, h/2-72);
            gameOverCtx.font = 'bold 24px Roboto Mono';
            gameOverCtx.fillText(`Final Score: ${snake.length}`, w/2, h/2+48);
            gameOverCtx.fillText('Press Q to restart', w/2, h/2+72);

            if (Number(hscore.innerHTML) > Number(oldHigh)) {
                gameOverCtx.fillStyle = '#FFFF00';
                gameOverCtx.fillText('NEW HIGH SCORE!!!', w/2, h/2+120);
            }

            clearInterval(run);
        }

        // draw food
        if (!firstPlay)
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
            if (!firstPlay)
                new Audio('resources/sounds/bruh.mp3').play();

            respawnFood();
            snake.push([realX, realY]);
        }

        // spawn toxic foods
        for (current of toxicFoods)
            ctx.drawImage(toxicFood, current[0], current[1], cellW, cellW);
        if (playCounter % 20 == 0 && Math.random() > 0.5)
            spawnToxicFood();
        if (playCounter % 45 == 0)
            toxicFoods.pop();
        // check if snake has eaten toxic food
        for (let i = 0; i < toxicFoods.length; i++) {
            if (realX == toxicFoods[i][0] && realY == toxicFoods[i][1]) {
                toxicFoods.splice(i, 1);
                if (snake.length == 2) suicide = true;
                else snake.pop();
            }
        }

        score.innerHTML = snake.length-2;
        if (Number(score.innerHTML) > Number(hscore.innerHTML)) {
            hscore.innerHTML = score.innerHTML;
            localStorage.setItem('snekHighScore', snake.length);
        }

        x += velX;
        y += velY;

        moveSnake();

        firstPlay = false;
        playCounter++;
    }
}, 75);

function moveSnake() {
    if (moveQueue.length == 0) return;
    let move = moveQueue[0];
    console.log(moveQueue); // for debugging
    switch (move) {
        case 'left':
            // make it so you can't go 'backwards'
            if (lastMove != 'right') {
                velX = -cellW;
                velY = 0;
                if (lastMove != 'left')
                    playMoveSound();
                lastMove = move;
                head = lhead;
            }
            break;

        case 'up':
            if (lastMove != 'down') {
                velX = 0;
                velY = -cellW;
                if (lastMove != 'up')
                    playMoveSound();
                lastMove = move;
                head = uhead;
            }
            break;

        case 'right':
            if (lastMove != 'left') {
                velX = cellW;
                velY = 0;
                if (lastMove != 'right')
                    playMoveSound();
                lastMove = move;
                head = rhead;
            }
            break;

        case 'down':
            if (lastMove != 'up') {
                velX = 0;
                velY = cellW;
                if (lastMove != 'down')
                    playMoveSound();
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
    do {
        foodX = Math.floor(w/cellW * Math.random()) * cellW;
        foodY = Math.floor(h/cellW * Math.random()) * cellW;
    } while (inSnake(foodX, foodY) || (useWalls && inWall(foodX, foodY)));
}

function spawnToxicFood() {
    let x;
    let y;
    do {
        x = Math.floor(w/cellW * Math.random()) * cellW;
        y = Math.floor(h/cellW * Math.random()) * cellW;
    } while (
        toxicFoods.includes([x, y]) ||
        inSnake(x, y) ||
        (useWalls && inWall(x, y)) ||
        (x == foodX && y == foodY)
    );
    toxicFoods.push([x, y]);
}

function inSnake(searchX, searchY) {
    for (let cell of snake)
        if (cell[0] == searchX && cell[1] == searchY)
            return true;
    return false;
}

function inWall(searchX, searchY) {
    if (searchX == 0 || searchX == w-cellW || searchY == 0 || searchY == h-cellW)
        return true;
    return false;
}

function getTail(headImg) {
    let dir = headImg.src.split('/').at(-1).split('.')[0];
    return document.getElementById(dir+'tail');
}

function playMoveSound() {
    // create new Audio object each time so sounds can overlap
    let sound = new Audio('resources/sounds/vine-boom.mp3');
    sound.volume = 0.1;
    sound.play();
}

function toggleWalls() {
    let toggle = localStorage.getItem('toggleWalls') !== '1' ? '1' : '';
    localStorage.setItem('toggleWalls', toggle);
    window.location.reload();
}
