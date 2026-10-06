
const gameState = {
  sequence: [],         
  playerStep: 0,        
  isDisplaying: false,  
  isPlaying: false,     
  timeoutIds: []        
};

const levelDisplay = document.getElementById('level-count');
const messageDisplay = document.getElementById('message');
const startBtn = document.getElementById('start-btn');
const sectorBtns = document.querySelectorAll('.btn');


const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const FREQUENCIES = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

function playSound(index) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.value = FREQUENCIES[index] || 300;
  
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

function delay(ms) {
  return new Promise((resolve) => {
    const timerId = setTimeout(resolve, ms);
    gameState.timeoutIds.push(timerId);
  });
}

function clearAllTimeouts() {
  gameState.timeoutIds.forEach((id) => clearTimeout(id));
  gameState.timeoutIds = [];
}

async function flashSector(id, duration = 500) {
  const btn = document.querySelector(`.btn[data-id="${id}"]`);
  if (!btn) return;

  btn.classList.add('active');
  playSound(id);
  await delay(duration);
  btn.classList.remove('active');
}

async function playSequence() {
  gameState.isDisplaying = true;
  messageDisplay.textContent = 'Смотрите и запоминайте...';
  setButtonsState(false); 

  await delay(500);

  for (let i = 0; i < gameState.sequence.length; i++) {
    if (!gameState.isPlaying) return;

    await flashSector(gameState.sequence[i], 500);
    await delay(250); 
  }

  if (!gameState.isPlaying) return;

  gameState.isDisplaying = false;
  messageDisplay.textContent = 'Ваш ход!';
  setButtonsState(true); 
}

function nextRound() {
  gameState.playerStep = 0;
  const randomSector = Math.floor(Math.random() * 4);
  gameState.sequence.push(randomSector);
  levelDisplay.textContent = gameState.sequence.length;
  
  playSequence();
}

function startGame() {
  clearAllTimeouts();
  
  gameState.sequence = [];
  gameState.playerStep = 0;
  gameState.isPlaying = true;
  gameState.isDisplaying = false;

  startBtn.disabled = true;
  nextRound();
}

function gameOver() {
  clearAllTimeouts();
  
  const reachedLevel = gameState.sequence.length;
  gameState.isPlaying = false;
  gameState.isDisplaying = false;
  
  messageDisplay.textContent = `Игра окончена! Вы дошли до уровня ${reachedLevel}.`;
  startBtn.disabled = false;
  setButtonsState(false);
}

function handleSectorClick(e) {
  if (!gameState.isPlaying || gameState.isDisplaying) return;

  const clickedId = parseInt(e.target.dataset.id, 10);
  const expectedId = gameState.sequence[gameState.playerStep];

  flashSector(clickedId, 250);

  if (clickedId === expectedId) {
    gameState.playerStep++;

    if (gameState.playerStep === gameState.sequence.length) {
      messageDisplay.textContent = 'Отлично!';
      setButtonsState(false);
      const timerId = setTimeout(nextRound, 1000);
      gameState.timeoutIds.push(timerId);
    }
  } else {
    gameOver();
  }
}

function setButtonsState(enabled) {
  sectorBtns.forEach((btn) => {
    btn.disabled = !enabled;
  });
}

startBtn.addEventListener('click', startGame);

sectorBtns.forEach((btn) => {
  btn.addEventListener('click', handleSectorClick);
});
setButtonsState(false);