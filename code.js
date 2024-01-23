let currentPiece, currentLoc, rotationState, totalTimeSeconds, totalPieceCount, totalAttack, heldpiece, gameEnd, remainingpieces, lockcount, combonumber, BTBcount, isTspin, isMini, firstMove, isDialogOpen, spikeCounter;

let timeouts = { 'arr': 0, 'das': 0, 'sd': 0, 'lockdelay': 0, 'gravity': 0, 'stats': 0, 'lockingTimer': 0 }
let directionState = { 'RIGHT': false, 'LEFT': false, 'DOWN': false };
const disabledKeys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', ' ', 'Enter']

// default settings
let displaySettings = { bgcolour: '#080B0C', boardcolour: '#000000', gridopacity: 10, shadowOpacity: 20, BoardHeightPercent: 70, showGrid: true, colouredShadow: false, colouredQueues: true, lockBar: true }
let gameSettings = { arr: 33, das: 160, sdarr: 100, gravitySpeed: 950, lockDelay: 600, maxLockMovements: 15, nextPieces: 5, allowLockout: false, preserveARR: true, infiniteHold: false }
let controlSettings = { rightKey: 'ArrowRight', leftKey: 'ArrowLeft', cwKey: 'ArrowUp', ccwKey: 'z', hdKey: ' ', sdKey: 'ArrowDown', holdKey: 'c', resetKey: 'r', rotate180Key: 'a' }

function StartGame() {
    loadSettings();
    resetState();
    renderStyles();
    clearInterval(timeouts['stats']);
    totalTimeSeconds = -0.1; totalAttack = 0; totalPieceCount = 0; firstMove = true;
    renderStats();
    drawPiece(randomiser());
}

this.addEventListener('keydown', event => {
    if (event.key == 'Escape') isDialogOpen = false;
    if (event.repeat || isDialogOpen) return;
    if (disabledKeys.includes(event.key)) event.preventDefault();
    if (firstMove) firstMovement();
    if (event.key == controlSettings.resetKey) StartGame();
    if (gameEnd) return;
    if (event.key == controlSettings.cwKey) rotate("CW");
    if (event.key == controlSettings.ccwKey) rotate("CCW");
    if (event.key == controlSettings.rotate180Key) rotate("180");
    if (event.key == controlSettings.hdKey) movePieceDown(true, false);
    if (event.key == controlSettings.holdKey) holdPiece();
    if (event.key == controlSettings.rightKey) startDas("RIGHT");
    if (event.key == controlSettings.leftKey) startDas("LEFT");
    if (event.key == controlSettings.sdKey) startArrSD();
});

this.addEventListener('keyup', event => {
    if (event.key == controlSettings.rightKey) endDasArr('RIGHT');
    if (event.key == controlSettings.leftKey) endDasArr('LEFT');
    if (event.key == controlSettings.sdKey) endDasArr('DOWN');
});

function firstMovement() { // stats clock at 100ms
    startGravity();
    timeouts['stats'] = setInterval(() => renderStats(), 100);
    firstMove = false;
}

function startDas(direction) {
    movePieceSide(direction, false);
    directionState[direction] = 'das'
    stopTimeout('das'); stopInterval('arr');
    timeouts['das'] = setTimeout(() => startArr(direction), gameSettings.das);
}

function startArr(direction) {
    if (direction == 'current') {
        if (directionState['RIGHT'] == 'arr' && directionState['LEFT'] == 'arr') return;
        if (directionState['RIGHT'] == 'arr') startArr('RIGHT');
        if (directionState['LEFT'] == 'arr') startArr('LEFT');
        return;
    }
    directionState[direction] = 'arr';
    stopInterval('arr')
    if (gameSettings.arr == 0) { timeouts['arr'] = -1; movePieceSide(direction, true); return; }
    timeouts['arr'] = setInterval(() => movePieceSide(direction, false), gameSettings.arr);
}

function startArrSD() {
    directionState['DOWN'] = 'arr';
    clearInterval(timeouts['sd']);
    if (gameSettings.sdarr == 0) { timeouts['sd'] = -1; movePieceDown(false, true); return; }
    timeouts['sd'] = setInterval(() => movePieceDown(false, false), gameSettings.sdarr);
}

function endDasArr(direction) {
    if (direction == undefined) {
        if (gameSettings.preserveARR) return;
        directionState = { 'RIGHT': false, 'LEFT': false, 'DOWN': false }
        endDasArr('RIGHT'); endDasArr('LEFT'); endDasArr('DOWN');
        return;
    }
    directionState[direction] = false;
    if (direction == 'RIGHT' || direction == 'LEFT') {
        const oppositeDirection = direction == 'RIGHT' ? 'LEFT' : 'RIGHT'
        if (directionState[oppositeDirection] == 'das') return;
        if (directionState[oppositeDirection] == 'arr') { startArr(oppositeDirection); return }
        stopTimeout('das'); stopInterval('arr');
    }
    if (direction == 'DOWN') stopInterval('sd');
}

// movement
function checkCollision(coords, stoppedMinos, action) {
    for (let coord of coords) {
        const [x, y] = coord;
        switch (action) {
            case "RIGHT": if (x >= 10) return true; break;
            case "LEFT": if (x <= 1) return true; break;
            case "DOWN": if (y <= 1) return true; break;
            case "ROTATE": if (x < 1 || x > 10 || y < 1) return true; break;
            case "PLACE": if (y > 20) return true; break;
        }
        for (let stopped of stoppedMinos) {
            let gridarea2 = stopped.style.gridArea.split('/');
            const x2 = Number(gridarea2[1]), y2 = Number(gridarea2[0]);
            switch (action) {
                case "RIGHT": if (x + 1 == x2 && y == y2) return true; break;
                case "LEFT": if (x - 1 == x2 && y == y2) return true; break;
                case "DOWN": if (x == x2 && y - 1 == y2) return true; break;
                case "ROTATE": if (x == x2 && y == y2) return true; break;
                case "SPAWN": if (x == x2 && y == y2) return true; break;
            }
        }
    }
}

function checkTspin(rotation, location, stoppedMinos, transformation) {
    if (currentPiece.name != 't') return false;
    const [x, y] = location;
    const [dx, dy] = transformation;
    isMini = false;
    const backminos = spinChecks[(rotation + 1) % 4].map((coord) => [coord[0] + x, coord[1] + y]);
    const frontminos = spinChecks[rotation - 1].map((coord) => [coord[0] + x, coord[1] + y]);
    const back1 = checkCollision([backminos[0]], stoppedMinos, "ROTATE")
    const back2 = checkCollision([backminos[1]], stoppedMinos, "ROTATE")
    const front1 = checkCollision([frontminos[0]], stoppedMinos, "ROTATE")
    const front2 = checkCollision([frontminos[1]], stoppedMinos, "ROTATE")
    if ((front1 && front2) && (back1 || back2)) return true;
    if ((front1 || front2) && (back1 && back2)) {
        if ((dx == 1 || dx == -1) && dy == -2) return true;
        isMini = true; return true;
    }
}

function rotate(type) {
    if (currentPiece.name == 'o') return;
    const DOMstopped = document.querySelectorAll('.stopped');
    const newRotation = getNewRotationState(type);
    const kickdata = getKickData(currentPiece, type, newRotation);
    const rotatingCoords = pieceToCoords(currentPiece, 'shape' + newRotation, currentLoc, true);
    const posChange = kickdata.find((transformation) => {
        const [dx, dy] = transformation;
        const coords = rotatingCoords.map((coord) => [coord[0] + dx, coord[1] + dy]);
        return !checkCollision(coords, DOMstopped, 'ROTATE');
    });
    if (!posChange) return;
    removeMinos('.active')
    renderPieceFromCoords(document.getElementById('playingfield'), rotatingCoords, posChange[1],
        posChange[0], currentPiece, 'active');
    currentLoc = [currentLoc[0] + posChange[0], currentLoc[1] + posChange[1]]
    isTspin = checkTspin(newRotation, currentLoc, DOMstopped, posChange);
    rotationState = newRotation;
    incrementLock();
    displayShadow();
    if (gameSettings.gravitySpeed == 0) startGravity();
    startArr('current');
    if (directionState['DOWN'] == 'arr') startArrSD();
}

function getNewRotationState(type) {
    let newState = (rotationState + rmap[type] || 0) % 4;
    return newState == 0 ? 4 : newState;
}

function getKickData(piece, rotationType, shapeNo) {
    let isI = (piece.name == 'i') ? 1 : 0; // check if i piece
    let direction = (rotationType == "CCW") ? (shapeNo > 3) ? 0 : shapeNo : shapeNo - 1;
    return {
        "180": KickData180[isI][direction],
        "CW": KickDataCW[isI][direction],
        "CCW": KickDataCW[isI][direction].map(row => row.map(element => element * -1))
    }[rotationType]
}

function movePieceSide(direction, instant) {
    const DOMminos = document.querySelectorAll('.active');
    const DOMminostopped = document.querySelectorAll('.stopped');
    if (directionState['DOWN'] == 'arr') startArrSD();
    if (checkCollision(minoToCoords(DOMminos), DOMminostopped, direction)) {
        stopInterval('arr');
        if (gameSettings.gravitySpeed == 0) startGravity();
        return;
    };
    renderPieceMovement(direction, DOMminos);
    currentLoc[0] = direction == 'RIGHT' ? currentLoc[0] + 1 : currentLoc[0] - 1;
    displayShadow();
    incrementLock();
    isTspin = false; isMini = false;
    if (gameSettings.gravitySpeed == 0) startGravity();
    if (instant) movePieceSide(direction, true);
}

function movePieceDown(harddrop, softdrop) {
    if (gameEnd) return;
    const DOMminos = document.querySelectorAll('.active');
    const stopped = document.querySelectorAll('.stopped');
    if (timeouts['lockdelay'] != 0) {
        if (harddrop) scheduleLock(true);// if piece is locking and used harddrop
        return;
    };
    renderPieceMovement('DOWN', DOMminos);
    isTspin = false; isMini = false;
    currentLoc[1] -= 1;
    if (checkCollision(minoToCoords(DOMminos), stopped, 'DOWN')) { scheduleLock(harddrop); return; }
    startArr('current')
    if (harddrop) movePieceDown(true, false);
    if (softdrop) movePieceDown(false, true);
}


// mechanics
function clearLines() {
    const minoX = (mino) => Number(mino.style.gridArea.split('/')[0]);
    const rows = minoToCoords(document.querySelectorAll('.stopped')).map((coord) => coord[1])
        .reduce((prev, curr) => (prev[curr] = ++prev[curr] || 1, prev), {})         // count minos in row
    const clearRows = Object.keys(rows).filter((key) => rows[key] >= 10)            // get rows with 10 minos
        .map((row) => Number(row)).toReversed()                                     // convert rows to number and reverse
    for (let row of clearRows) {
        const DOMstopped = document.querySelectorAll('.stopped');
        [...DOMstopped].filter((mino) => minoX(mino) == row).forEach((mino) => mino.remove()) // remove minos on row
        renderPieceMovement('DOWN', [...DOMstopped].filter((mino) => minoX(mino) > row)) // move other minos down
    }
    renderActionText(clearRows.length, document.querySelectorAll('.stopped'))
}

function incrementLock() {
    const DOMminos = document.querySelectorAll('.active');
    const DOMminostopped = document.querySelectorAll('.stopped');
    if (timeouts['lockdelay'] != 0) {
        clearLockDelay(false); lockcount++;
        const amountToAdd = 100 / gameSettings.maxLockMovements;
        if (displaySettings.lockBar) document.getElementById('lockCounter').value += amountToAdd;
    }
    if (checkCollision(minoToCoords(DOMminos), DOMminostopped, 'DOWN')) scheduleLock(false);
}

function scheduleLock(harddrop) {
    if (gameSettings.maxLockMovements == 0) return;
    if (lockcount >= gameSettings.maxLockMovements || harddrop) { lockPiece(); return; }
    if (gameSettings.lockDelay == 0) { timeouts['lockdelay'] = -1; return; }
    timeouts['lockdelay'] = setTimeout(() => lockPiece(), gameSettings.lockDelay);
    timeouts['lockingTimer'] = setInterval(() => {
        const amountToAdd = 1000 / gameSettings.lockDelay
        if (displaySettings.lockBar) document.getElementById('lockTimer').value += amountToAdd;
    }, 10);
}

function lockPiece() {
    const active = document.querySelectorAll('.active');
    const coordsPlaced = minoToCoords(active);
    const stoppedMinos = document.querySelectorAll('.stopped');
    const collision = checkCollision(coordsPlaced, stoppedMinos, 'PLACE');
    if (collision && gameSettings.allowLockout) { endGame('lockout'); return; }
    clearLockDelay();
    active.forEach((mino) => { mino.classList.remove('active'); mino.classList.add('stopped'); });
    clearInterval(timeouts['gravity']);
    clearLines();
    totalPieceCount++;
    heldpiece.occured = false; isTspin = false; isMini = false;
    drawPiece(randomiser());
    startGravity();
}

function clearLockDelay(clearCount = true) {
    clearInterval(timeouts['lockingTimer'])
    document.getElementById('lockTimer').value = 0;
    stopTimeout('lockdelay');
    if (clearCount) {
        document.getElementById('lockCounter').value = 0;
        lockcount = 0; endDasArr();
    }
}

function endGame(type) {
    clearInterval(timeouts['gravity']);
    clearInterval(timeouts['stats']);
    gameEnd = true;
    console.log('END', type);
}

function resetState() {
    gameEnd = false; currentPiece = null; currentLoc = null; isTspin = false; isMini = false;
    BTBcount = -1; combonumber = -1;
    heldpiece = { piece: null, occured: false };
    remainingpieces = [[], []];
    spikeCounter = 0;
    clearInterval(timeouts['gravity']);
    for (let text of ['btbtext', 'cleartext', 'combotext', 'pctext', 'linessent']) {
        document.getElementById(text).style.opacity = 0;
    }
    clearLockDelay();
    removeElements(["#grid", "#next", "#hold", "#playingfield"]);
}

function randomiser() {
    if (remainingpieces[1].length == 0) shuffleRemainingPieces();
    if (remainingpieces[0].length == 0) {
        remainingpieces = [remainingpieces[1], []];
        shuffleRemainingPieces();
    }
    const piece = remainingpieces[0].splice(0, 1);
    return pieces.filter((element) => { return element.name == piece })[0];
}

function shuffleRemainingPieces() {
    pieces.forEach((piece) => remainingpieces[1].push(piece.name))
    remainingpieces[1] = remainingpieces[1].map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort).map(({ value }) => value);
}

function drawPiece(piece) {
    const DOMboard = document.getElementById('playingfield');
    const DOMstopped = document.querySelectorAll('.stopped');
    let offsetx = (piece.name == 'o') ? 5 : 4                   // o is smaller, set different pos
    let offsety = (piece.name == 'o') ? 21 : 20
    const coords = pieceToCoords(piece, 'shape1', undefined, true);
    const coordsmapped = coords.map((coord) => [coord[0] + offsetx, coord[1] + offsety]);
    if (checkCollision(coordsmapped, DOMstopped, 'SPAWN') == true) { endGame('blockout'); return; }
    renderPieceFromCoords(DOMboard, coords, offsety, offsetx, piece, 'active');
    currentLoc = [offsetx, offsety];
    rotationState = 1;
    currentPiece = piece;
    updateNext();
    displayShadow();
    if (gameSettings.preserveARR) startArr('current');
}

function updateNext() {
    const DOMNext = document.getElementById('next');
    removeMinos('.nextmino')
    let first5 = remainingpieces[0].concat(remainingpieces[1])
        .slice(0, (gameSettings.nextPieces > 5 ? 5 : gameSettings.nextPieces));
    for (let i = 0; i < first5.length; i++) {
        const piece = pieces.filter((element) => { return element.name == first5[i] })[0];
        renderPieceFromCoords(DOMNext, pieceToCoords(piece, 'shape1'),
            1 + (3 * i), ((piece.name == 'o') ? 2 : 1), piece, 'nextmino');
    }
    const pieceColour = pieces.filter((element) => { return element.name == first5[0] })[0].colour
    changeBorderColour('next', pieceColour)
}

function displayShadow() {
    removeMinos('.shadow')
    const DOMboard = document.getElementById('playingfield');
    const DOMminostopped = document.querySelectorAll('.stopped');
    const coords = pieceToCoords(currentPiece, 'shape' + rotationState, undefined, true);
    const colour = displaySettings.colouredShadow ? currentPiece.colour : "#ffffff";
    renderPieceFromCoords(DOMboard, coords, currentLoc[1], currentLoc[0], currentPiece, 'shadow',
        colour, displaySettings.shadowOpacity + "%");
    while (true) {
        const shadowMinos = document.querySelectorAll('.shadow');
        if (checkCollision(minoToCoords(shadowMinos), DOMminostopped, "DOWN")) break;
        renderPieceMovement("DOWN", shadowMinos);
    }
}

function holdPiece() {
    if (heldpiece.occured) return;
    clearLockDelay();
    isTspin = false; isMini = false;
    removeMinos('.active');
    if (heldpiece.piece == null) { // first time holding
        heldpiece.piece = currentPiece;
        drawPiece(randomiser());
    } else {
        [heldpiece.piece, currentPiece] = [currentPiece, heldpiece.piece]
        drawPiece(currentPiece);
    }
    const DOMheldpiece = document.getElementById('hold');
    DOMheldpiece.replaceChildren();
    renderPieceFromCoords(DOMheldpiece, pieceToCoords(heldpiece.piece, 'shape1'),
        1, ((heldpiece.piece.name == 'o') ? 2 : 1), heldpiece.piece)
    changeBorderColour('hold', heldpiece.piece.colour)
    if (!gameSettings.infiniteHold) heldpiece.occured = true;
}

// screen rendering
function drawGrid() {
    const DOMboard = document.getElementById('grid');
    for (let col = 0; col < 20; col++) {
        for (let row = 0; row < 10; row++) {
            let mino = document.createElement('div');
            mino.style.gridArea = `${col + 1} / ${row + 1} /span 1/span 1`
            mino.style.border = '1px solid white'
            mino.style.opacity = `${displaySettings.gridopacity}%`;
            mino.classList.add('gridLine');
            DOMboard.appendChild(mino);
        }
    }
}

function renderPieceFromCoords(parentDiv, coords, heightadjust = 0, rowadjust = 0, piece,
    classname = null, colour = piece.colour, opacity = "100%") {
    coords.forEach((coord) => {
        let mino = document.createElement('div');
        let newrow = coord[0] + rowadjust;
        let newcol = coord[1] + heightadjust;
        mino.style.gridArea = `${newcol} / ${newrow} /span 1/span 1`; // render new minos
        mino.style.backgroundColor = colour;
        mino.style.border = `2px solid ${colour}`
        mino.style.opacity = opacity;
        if (classname != null) mino.classList.add(classname)
        parentDiv.appendChild(mino);
    })
}

function renderPieceMovement(direction, minos) {
    for (let mino of minos) {
        const gridarea = mino.style.gridArea.split('/');
        let x = Number(gridarea[1]), y = Number(gridarea[0]);
        switch (direction) {
            case "RIGHT": x += 1; break;
            case "LEFT": x -= 1; break;
            case "DOWN": y -= 1; break;
        }
        mino.style.gridArea = `${y} / ${x} / span 1 / span 1`; // render moved minos
    }
}

function renderActionText(linecount, remainingMinos) {
    const isBTB = ((isTspin || isMini || linecount == 4) && linecount > 0);
    const isPC = remainingMinos.length == 0;
    const damagetype = (isTspin ? 'Tspin ' : '') + (isMini ? 'mini ' : '') + cleartypes[linecount];
    BTBcount = isBTB ? BTBcount + 1 : (linecount != 0) ? - 1 : BTBcount;
    combonumber = linecount == 0 ? -1 : combonumber + 1
    const damageDealt = calcDamage(combonumber, damagetype.toUpperCase().trim(), isPC, BTBcount, isBTB)
    totalAttack += damageDealt;

    if (damagetype != '') setText('cleartext', damagetype, 2000);
    if (combonumber > 0) setText('combotext', `Combo ${combonumber}`, 2000);
    if (isBTB && BTBcount > 0) setText('btbtext', `BTB ${BTBcount} `, 2000);
    if (isPC) setText('pctext', "Perfect Clear", 2000);
    if (damageDealt > 0) setText('linessent', `+${spikeCounter + damageDealt}`, 1500);
    spikeCounter += damageDealt
}

function calcDamage(combonumber, type, isPC, btb, isBTB) {
    let combo = combonumber > 20 ? 20 : combonumber < 0 ? 0 : combonumber;
    let damage = attackValues[type][combo] + (isPC ? attackValues['ALL_CLEAR'] : 0);
    if (btb > 0 && isBTB) {
        const x = Math.log1p((BTBcount) * 0.8);
        damage += ~~(Math.floor(x + 1) + (1 + (x % 1)) / 3)
    }
    return damage;
}

function setText(id, text, duration) {
    const textbox = document.getElementById(id);
    textbox.textContent = text;
    textbox.style.transform = 'translateX(-2%)'; textbox.style.opacity = 1;
    if (timeouts[id] != 0) stopTimeout(id);
    timeouts[id] = setTimeout(() => {
        textbox.style.opacity = 0; textbox.style.transform = 'translateX(2%)';
        spikeCounter = 0;
    }, duration);
}

function renderStyles() {
    document.getElementById('body').style.backgroundColor = displaySettings.bgcolour;
    document.getElementById('board').style.backgroundColor = displaySettings.boardcolour;
    document.getElementById('hold').style.backgroundColor = displaySettings.boardcolour;
    document.getElementById('next').style.backgroundColor = displaySettings.boardcolour;
    document.getElementById('board').style.height = `${displaySettings.BoardHeightPercent}vh`;
    changeBorderColour('hold', '#dbeaf3')
    removeElements(['#grid'])
    if (displaySettings.showGrid) drawGrid();
}

function renderStats() {
    totalTimeSeconds += 0.1;
    let displaytime = (Math.round(totalTimeSeconds * 10) / 10).toFixed(1)
    document.getElementById('stats1').textContent = `${totalAttack} sent`
    document.getElementById('stats2').textContent = `${totalPieceCount} pieces`
    document.getElementById('stats3').textContent = `${displaytime} s`
}

function changeBorderColour(id, colour) {
    if (!displaySettings.colouredQueues) colour = '#dbeaf3';
    document.getElementById(id).style.border = `2px solid ${colour}`;
}

// misc functions
function removeMinos(id) { document.querySelectorAll(id).forEach((mino) => mino.remove()); }
function stopTimeout(name) { clearTimeout(timeouts[name]); timeouts[name] = 0; }
function stopInterval(name) { clearInterval(timeouts[name]); timeouts[name] = 0; }
function toExpValue(x) { return Math.round(Math.pow(2, 0.1 * x) - 1) }
function toLogValue(y) { return Math.round(Math.log2(y + 1) * 10) }
function removeElements(names) {
    names.forEach((name) => { document.querySelectorAll(name)[0].replaceChildren(); })
}

function minoToCoords(minos) {
    return [...minos].map((mino) => {
        const gridarea = mino.style.gridArea.split('/');
        return [Number(gridarea[1]), Number(gridarea[0])];
    })
}

function pieceToCoords(piece, shape, change = [0, 0], reverseY = false) {
    const dx = change[0], dy = change[1]
    let coords = []
    for (let col = 0; col < piece[shape].length; col++) {
        for (let row = 0; row < piece[shape][col].length; row++) {
            if (piece[shape][col][row] == 1) {
                coords.push([row + dx, (reverseY ? (piece[shape].length - 1 - col) : col) + dy])
            }
        }
    }
    return coords;
}

function startGravity() {
    const DOMminostopped = document.querySelectorAll('.stopped');
    const coords = minoToCoords(document.querySelectorAll('.active'));
    if (checkCollision(coords, DOMminostopped, 'DOWN')) incrementLock();
    if (gameSettings.gravitySpeed > 1000) return;
    if (gameSettings.gravitySpeed == 0) { movePieceDown(false, true); return; }
    timeouts['gravity'] = setInterval(() => { movePieceDown(false, false) }, gameSettings.gravitySpeed);
}

// interactivity in settings
function openModal(id) {
    [...document.getElementsByClassName('option')]
        .filter((item) => item.parentElement.parentElement.id == id)
        .forEach((setting) => {
            let newValue = eval(id.replace('Dialog', ''))[setting.id]
            if (setting.classList[2] == 'exp') newValue = toLogValue(newValue);
            setting.value = newValue
            if (setting.classList[1] == 'keybind') setting.textContent = newValue;
            if (setting.classList[1] == 'check') setting.checked = (newValue);
            if (setting.classList[1] == 'range') sliderChange(setting);
        })
    document.getElementById(id).showModal();
    isDialogOpen = true;
}

function closeModal(id) {
    [...document.getElementsByClassName('option')]
        .filter((item) => item.parentElement.parentElement.id == id)
        .forEach((setting) => {
            const settingid = setting.id
            eval(id.replace('Dialog', ''))[settingid] =
                setting.classList[1] == 'check' ? setting.checked :
                    setting.classList[1] == 'keybind' ? setting.textContent :
                        setting.classList[2] == 'exp' ? toExpValue(setting.value) :
                            setting.value;
        })
    closeDialog(document.getElementById(id));
    isDialogOpen = false;
    saveSettings();
    if (id == 'displaySettingsDialog') renderStyles();
    if (id == 'gameSettingsDialog') StartGame();
}

function closeDialog(element) {
    const closingAnimation = () => {
        element.removeEventListener('animationend', closingAnimation);
        element.classList.remove('closingAnimation');
        element.close()
    }
    element.classList.add('closingAnimation');
    element.addEventListener('animationend', closingAnimation)
}

function sliderChange(el) {
    const text = el.parentElement.children[0].textContent.split(':')[0];
    let value = el.value;
    if (el.classList[2] == 'exp') value = toExpValue(value);
    if (el.classList[2] == 'exp' && value > 1000) value = "None";
    el.parentElement.children[0].textContent = `${text}: ${value}`
}

let currentKey = null;
function buttonInput(el) { document.getElementById('frontdrop').showModal(); currentKey = el.id; }

function setKeybind(key) {
    document.getElementById(currentKey).textContent = key;
    for (let i in controlSettings) { // duplicate keys prevention
        if (i == currentKey) continue;
        const otherKeys = document.getElementById(i);
        if (otherKeys.textContent == key) otherKeys.textContent = 'None';
    }
    closeDialog(document.getElementById('frontdrop'))
    currentKey = null;
}

function saveSettings() {
    const data = [displaySettings, gameSettings, controlSettings];
    localStorage.setItem('settings', JSON.stringify(data));
}

function loadSettings() {
    const data = localStorage.getItem('settings');
    if (data != null) [displaySettings, gameSettings, controlSettings] = JSON.parse(data);
}

// data
const pieces = [
    {
        name: "z",
        shape1: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        shape2: [
            [0, 0, 1],
            [0, 1, 1],
            [0, 1, 0]
        ],
        shape3: [
            [0, 0, 0],
            [1, 1, 0],
            [0, 1, 1]
        ],
        shape4: [
            [0, 1, 0],
            [1, 1, 0],
            [1, 0, 0]
        ],
        colour: "red"
    },
    {
        name: "s",
        shape1: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        shape2: [
            [0, 1, 0],
            [0, 1, 1],
            [0, 0, 1]
        ],
        shape3: [
            [0, 0, 0],
            [0, 1, 1],
            [1, 1, 0]
        ],
        shape4: [
            [1, 0, 0],
            [1, 1, 0],
            [0, 1, 0]
        ],
        colour: "LawnGreen"
    },
    {
        name: "o",
        shape1: [
            [1, 1],
            [1, 1]
        ],
        colour: "yellow"
    },
    {
        name: "t",
        shape1: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        shape2: [
            [0, 1, 0],
            [0, 1, 1],
            [0, 1, 0]
        ],
        shape3: [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0]
        ],
        shape4: [
            [0, 1, 0],
            [1, 1, 0],
            [0, 1, 0]
        ],
        colour: "DarkMagenta"
    },
    {
        name: "j",
        shape1: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        shape2: [
            [0, 1, 1],
            [0, 1, 0],
            [0, 1, 0]
        ],
        shape3: [
            [0, 0, 0],
            [1, 1, 1],
            [0, 0, 1]
        ],
        shape4: [
            [0, 1, 0],
            [0, 1, 0],
            [1, 1, 0]
        ],
        colour: "blue"
    },
    {
        name: "l",
        shape1: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        shape2: [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 1]
        ],
        shape3: [
            [0, 0, 0],
            [1, 1, 1],
            [1, 0, 0]
        ],
        shape4: [
            [1, 1, 0],
            [0, 1, 0],
            [0, 1, 0]
        ],
        colour: "darkorange"
    },
    {
        name: "i",
        shape1: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        shape2: [
            [0, 0, 1, 0],
            [0, 0, 1, 0],
            [0, 0, 1, 0],
            [0, 0, 1, 0]
        ],
        shape3: [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0]
        ],
        shape4: [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0]
        ],
        colour: "aqua"
    }
];

const KickDataCW = [[                           // CCW data is CW data * -1
    [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],   // 4 -> 1 -> 4
    [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],  // 1 -> 2 -> 1
    [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],      // 2 -> 3 -> 2
    [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]      // 3 -> 4 -> 3
], [                                            // I piece kicks
    [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],    // 4 -> 1      
    [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],    // 1 -> 2
    [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],    // 2 -> 3
    [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]]     // 3 -> 4
]];

const KickData180 = [[
    [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],    // 3 -> 1
    [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],    // 4 -> 2
    [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],    // 1 -> 3
    [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],    // 2 -> 4
], [                                            // I piece kicks
    [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],    // 3 -> 1      
    [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],    // 4 -> 2
    [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],    // 1 -> 3
    [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],    // 2 -> 4
]];

const spinChecks = [[[0, 2], [2, 2]], [[2, 2], [2, 0]], [[0, 0], [2, 0]], [[0, 0], [0, 2]]];
const cleartypes = { '0': '', '1': 'Single', '2': 'Double', '3': 'Triple', '4': 'Quad' };
const rmap = { "CW": 1, "CCW": -1, "180": 2 };
const attackValues = {
    '': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'TSPIN': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'TSPIN MINI': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'SINGLE': [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3],
    'DOUBLE': [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6],
    'TRIPLE': [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12],
    'QUAD': [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    'TSPIN SINGLE': [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12],
    'TSPIN DOUBLE': [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    'TSPIN TRIPLE': [6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 22, 24, 25, 27, 28, 30, 31, 33, 34, 36],
    'TSPIN MINI SINGLE': [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3],
    'TSPIN MINI DOUBLE': [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6],
    'ALL_CLEAR': 10,
};

StartGame();