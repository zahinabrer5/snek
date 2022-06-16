const screen = document.getElementById('screen');
const ctx = screen.getContext('2d', { alpha: false });
const gameOverCtx = document.getElementById('gameover').getContext('2d');
const wallLayer = document.getElementById('wall-layer').getContext('2d');
const w = screen.width;
const h = screen.height;
const cellW = 25;
const masterVolume = (localStorage.getItem('volume') || '100')/100;

const useWalls = localStorage.getItem('toggleWalls') === '1';
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
let isPaused = true;
addEventListener('keydown', e => {
    e.preventDefault();
    switch (e.key) {
        case 'p':
            if (!isPaused && !dead) {
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
            if (!isPaused) {
                let move;
                // check if an arrow key was pressed
                if (e.key.startsWith('Arrow'))
                    move = e.key.substring(5).toLowerCase();
                // otherwise check if a WASD key was pressed
                else if ('WASD'.includes(e.key.toUpperCase()))
                    switch (e.key.toUpperCase()) {
                        case 'W':
                            move = 'up';
                            break;
                        case 'A':
                            move = 'left';
                            break;
                        case 'S':
                            move = 'down';
                            break;
                        case 'D':
                            move = 'right';
                            break;
                        default:
                            break;
                    }
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
let dead = false;
hscore.innerHTML = localStorage.getItem('snekHighScore');
let oldHigh = hscore.innerHTML;

bgMusic.volume = 0.1*masterVolume;

// draw the 'start playing' screen before game starts
// draws when fonts are completely loaded
document.fonts.ready.then(() => {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Roboto Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PRESS R TO START PLAYING', w/2, h/2);
});

let firstPlay = true;
let playCounter = 0;
let counterSnapshot = 0;
let suicide = false;

let level = 0;

// main game interval
let mainLoop = function() {
    if (!isPaused) {
        ctx.drawImage(background, 0, 0);

        // 'real' coordinates used to draw snake
        realX = useWalls ? x : mod(x, w);
        realY = useWalls ? y : mod(y, h);

        // check if snake's head has bumped into body (game over)
        if (pairInArray(snake, realX, realY) || (useWalls && inWall(realX, realY)) || suicide) {
            dead = true;

            bgMusic.pause();

            // play bomb gif
            function onDrawFrame(ctx, frame) {
                ctx.drawImage(frame.buffer, realX-cellW, realY-cellW, cellW*3, cellW*3);
            }
            gifler('resources/img/bomb.gif').frames('canvas#bomb-gif', onDrawFrame);

            let death = new Audio('resources/sounds/vine-boom.mp3');
            death.volume = 0.5*masterVolume;
            death.play();

            // by now, fonts should have been completely loaded
            // so there's no need to wait for them to load again
            gameOverCtx.fillStyle = '#000000';
            gameOverCtx.font = 'bold 48px Roboto Mono';
            gameOverCtx.textAlign = 'center';
            gameOverCtx.textBaseline = 'middle';
            gameOverCtx.fillText(suicide ? 'YOU KILLED YOURSELF' : 'YOU DIED', w/2, h/2-72);
            gameOverCtx.font = 'bold 24px Roboto Mono';
            gameOverCtx.fillText(`Final Score: ${score.innerHTML}`, w/2, h/2+48);
            gameOverCtx.fillText('Press Q to restart', w/2, h/2+72);

            // congratulate user for hitting a high score
            if (Number(hscore.innerHTML) > Number(oldHigh)) {
                gameOverCtx.fillStyle = '#FFFF00';
                gameOverCtx.fillText('NEW HIGH SCORE!!!', w/2, h/2+120);
                // still congratulate, but add a snarky message for not
                // maintaining the high score before death
                if (Number(score.innerHTML) != Number(hscore.innerHTML)) {
                    gameOverCtx.fillStyle = '#000000';
                    gameOverCtx.font = 'bold 18px Roboto Mono';
                    gameOverCtx.fillText('(although it looks like you\'ve had spiders for your last meal :P)', w/2, h/2+156);
                }
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
                getTail(),
                snake[snake.length-1][0],
                snake[snake.length-1][1]
            );
        }

        // update and draw snake head
        snake[0] = [realX, realY, head];
        ctx.drawImage(head, realX, realY);

        // check if snake has eaten food
        if (realX == foodX && realY == foodY) {
            if (!firstPlay) {
                let sound = new Audio('resources/sounds/nom.mp3');
                sound.volume = masterVolume;
                sound.play();
            }

            respawnFood();
            snake.push([realX, realY]);
        }

        // spawn toxic foods
        for (current of toxicFoods)
            ctx.drawImage(toxicFood, current[0], current[1]);
        if (playCounter % 20 == 0 && Math.random() > 0.5)
            spawnToxicFood();
        if (playCounter % 45 == 0)
            toxicFoods.pop();

        // check if snake has eaten toxic food
        for (let i = 0; i < toxicFoods.length; i++) {
            if (realX == toxicFoods[i][0] && realY == toxicFoods[i][1]) {
                toxicFoods.splice(i, 1);
                // play sound effect for eating toxic food
                let sound = new Audio('resources/sounds/oof.m4a');
                sound.volume = masterVolume;
                sound.play();
                // the snake dies if it's 2 cells long (score
                // is 0) after it eats a toxic food
                if (snake.length == 2) suicide = true;
                else snake.pop();
            }
        }

        // update score & high score if necessary
        score.innerHTML = snake.length-2;
        if (Number(score.innerHTML) > Number(hscore.innerHTML)) {
            hscore.innerHTML = score.innerHTML;
            localStorage.setItem('snekHighScore', score.innerHTML);
        }

        // update level based on current score
        if (!dead) {
            let prevLevel = level;
            level = Math.floor(score.innerHTML/20);
            // console.log(level); // for debugging

            // show new level notification if necessary
            if (level != prevLevel)
                counterSnapshot = playCounter;
            if (playCounter <= counterSnapshot+30) {
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 36px Roboto Mono';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`LEVEL ${level+1}`, w/2, 72);
                ctx.font = 'bold 24px Roboto Mono';
                ctx.fillText(`(${Math.round(1000/(75-15*level))} FPS)`, w/2, 120);
            }

            clearInterval(run);
            run = setInterval(mainLoop, 75-15*level);
        }

        x += velX;
        y += velY;

        moveSnake();

        firstPlay = false;
        playCounter++;
    }
}
let run = setInterval(mainLoop, 75-15*level);

function moveSnake() {
    if (moveQueue.length == 0) return;
    let move = moveQueue[0];
    // console.log(moveQueue); // for debugging
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

function pairInArray(arr, x, y) {
    // ensures snake doesn't die if it hits the
    // cell the snake's tail used to be in
    if (arr == snake &&
        snake.length > 0 &&
        snake[snake.length-1][0] == x &&
        snake[snake.length-1][1] == y)
        return false;
    for (let i = 0; i < arr.length; i++)
        if (arr[i][0] == x && arr[i][1] == y)
            return true;
    return false;
}

function respawnFood() {
    let prevFoodX = foodX;
    let prevFoodY = foodY;
    do {
        foodX = Math.floor(w/cellW * Math.random()) * cellW;
        foodY = Math.floor(h/cellW * Math.random()) * cellW;
    } while (
        pairInArray(toxicFoods, foodX, foodY) ||
        pairInArray(snake, foodX, foodY) ||
        (useWalls && inWall(foodX, foodY)) ||
        (foodX == prevFoodX && foodY == prevFoodY)
    );
}

function spawnToxicFood() {
    let x;
    let y;
    do {
        x = Math.floor(w/cellW * Math.random()) * cellW;
        y = Math.floor(h/cellW * Math.random()) * cellW;
    } while (
        pairInArray(toxicFoods, x, y) ||
        pairInArray(snake, x, y) ||
        (useWalls && inWall(x, y)) ||
        (x == foodX && y == foodY)
    );
    toxicFoods.push([x, y]);
}

function inWall(searchX, searchY) {
    if (searchX == 0 || searchX == w-cellW || searchY == 0 || searchY == h-cellW)
        return true;
    return false;
}

function getTail() {
    // get corresponding image for tail
    // acording to the previous cell for the tail
    let dir = snake[snake.length-1][2].src.split('/').at(-1).split('.')[0];
    return document.getElementById(dir+'tail');
}

function playMoveSound() {
    // create new Audio object each time so sounds can overlap
    let sound = new Audio('resources/sounds/windows-xp-error.mp3');
    sound.volume = Number(localStorage.getItem('moveVolume'))*masterVolume;
    sound.play();
}

// used for the wall toggle and move sound toggles
function toggle(item, value) {
    let toggle = localStorage.getItem(item) !== value ? value : '';
    localStorage.setItem(item, toggle);
    window.location.reload();
}
