// Retro OS & Pixel Game Core Logic

// ----------------------------------------------------
// 1. CLOCK & INTERFACE SYSTEMS
// ----------------------------------------------------
const clockEl = document.getElementById('os-clock');
function updateClock() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
setInterval(updateClock, 1000);
updateClock();

// Bezel Buttons Toggles
const screenViewport = document.getElementById('screen-viewport');
const flickerLayer = document.getElementById('flicker-layer');

document.getElementById('btn-theme-green').addEventListener('click', () => {
  document.body.classList.remove('amber-theme');
});

document.getElementById('btn-theme-amber').addEventListener('click', () => {
  document.body.classList.add('amber-theme');
});

let flickerOn = true;
document.getElementById('btn-toggle-flicker').addEventListener('click', () => {
  flickerOn = !flickerOn;
  flickerLayer.className = flickerOn ? "flicker" : "";
});

let systemOn = true;
document.getElementById('btn-power-off').addEventListener('click', () => {
  systemOn = !systemOn;
  if (!systemOn) {
    screenViewport.style.background = '#000';
    screenViewport.style.opacity = '0.05';
    flickerLayer.style.display = 'none';
  } else {
    screenViewport.style.background = 'var(--bg-darker)';
    screenViewport.style.opacity = '1';
    flickerLayer.style.display = 'block';
  }
});


// ----------------------------------------------------
// 2. 2D RETRO TILE GAME ENGINE (OFFICE RUNNER)
// ----------------------------------------------------
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let gameActive = true;
const TILE_SIZE = 16;
const COLS = 40; // 40 * 16 = 640
const ROWS = 26; // 26 * 16 = 416

// Map tile types:
// 0: floor, 1: wall, 2: boundary (collision but invisible/drawn as carpet)
const mapGrid = [];
for (let r = 0; r < ROWS; r++) {
  mapGrid[r] = [];
  for (let c = 0; c < COLS; c++) {
    // Outer walls
    if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
      mapGrid[r][c] = 1;
    } else {
      mapGrid[r][c] = 0; // Empty floor
    }
  }
}

// Draw boundary walls inside the office
// Left wall section
for (let r = 1; r < 12; r++) mapGrid[r][1] = 1;
// Database room separator (right section)
for (let r = 1; r < 14; r++) mapGrid[r][26] = 1;
for (let c = 26; c < COLS - 1; c++) mapGrid[13][c] = 1;

// Define interactable furniture objects
// Coordinates are grid indices (column, row) and width/height in tiles
const interactables = [
  {
    id: 'projects',
    name: 'Workstation Laptop',
    gx: 8, gy: 6,
    w: 3, h: 2,
    color: '#3b82f6',
    modal: 'modal-projects',
    draw: (ctx, x, y) => {
      // Desk
      ctx.fillStyle = '#654321';
      ctx.fillRect(x, y + 8, 48, 24);
      // Laptop screen (glowing blue-cyan)
      ctx.fillStyle = 'var(--primary)';
      ctx.fillRect(x + 16, y, 16, 10);
      // Keyboard base
      ctx.fillStyle = '#444';
      ctx.fillRect(x + 12, y + 10, 24, 2);
    }
  },
  {
    id: 'skills',
    name: 'Database Mainframe',
    gx: 32, gy: 5,
    w: 3, h: 3,
    color: '#ef4444',
    modal: 'modal-skills',
    draw: (ctx, x, y) => {
      // Server Cabinet
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y, 48, 48);
      ctx.strokeStyle = 'var(--primary)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 48, 48);
      
      // Horizontal drive trays
      ctx.fillStyle = '#0f172a';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + 4, y + 6 + (i * 10), 40, 6);
        
        // Animated LEDs
        const isBlinking = Math.floor(Date.now() / 250) % 2 === 0;
        ctx.fillStyle = isBlinking ? 'var(--primary)' : '#475569';
        ctx.fillRect(x + 8, y + 8 + (i * 10), 3, 3);
        ctx.fillStyle = !isBlinking ? 'var(--primary)' : '#ef4444';
        ctx.fillRect(x + 14, y + 8 + (i * 10), 3, 3);
      }
    }
  },
  {
    id: 'about',
    name: 'Whiteboard Note',
    gx: 17, gy: 3,
    w: 4, h: 2,
    color: '#eab308',
    modal: 'modal-about',
    draw: (ctx, x, y) => {
      // Metal stand
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(x + 4, y + 24, 4, 8);
      ctx.fillRect(x + 56, y + 24, 4, 8);
      // Whiteboard board
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x, y, 64, 24);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, 64, 24);
      // Marker scribbles (8-bit details)
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x + 8, y + 6, 12, 3);
      ctx.fillRect(x + 12, y + 10, 8, 3);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x + 36, y + 8, 16, 4);
    }
  },
  {
    id: 'contact',
    name: 'Mailbox',
    gx: 36, gy: 20,
    w: 2, h: 2,
    color: '#10b981',
    modal: 'modal-contact',
    draw: (ctx, x, y) => {
      // Post stand
      ctx.fillStyle = '#654321';
      ctx.fillRect(x + 12, y + 16, 8, 16);
      // Box body
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x + 4, y, 24, 16);
      // Flag (glowing cyan indicator)
      ctx.fillStyle = 'var(--primary)';
      ctx.fillRect(x + 20, y + 4, 4, 8);
    }
  },
  {
    id: 'scanner',
    name: 'ATS CV Scanner',
    gx: 12, gy: 15,
    w: 3, h: 2,
    color: '#84cc16',
    modal: 'modal-scanner',
    draw: (ctx, x, y) => {
      // Scanner base
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y + 8, 48, 24);
      // Glass scanning plate
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + 8, y + 12, 32, 16);
      // Running scanning line animation
      const scanOffset = Math.floor(Date.now() / 40) % 24;
      ctx.fillStyle = 'var(--primary)';
      ctx.fillRect(x + 8 + (scanOffset % 24), y + 12, 2, 16);
    }
  },
  {
    id: 'arcade',
    name: 'Space Duel Arcade',
    gx: 22, gy: 19,
    w: 3, h: 3,
    color: '#a855f7',
    modal: 'modal-arcade',
    draw: (ctx, x, y) => {
      // Cabinet wood sides
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(x, y, 48, 48);
      // Bezel
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(x + 6, y + 4, 36, 24);
      // Mini-arcade screen (animated stars)
      ctx.fillStyle = '#020617';
      ctx.fillRect(x + 10, y + 8, 28, 16);
      const isBlinking = Math.floor(Date.now() / 150) % 2 === 0;
      ctx.fillStyle = isBlinking ? 'var(--primary)' : '#c084fc';
      ctx.fillRect(x + 14, y + 12, 4, 4);
      ctx.fillRect(x + 28, y + 14, 4, 4);
      // Joystick panel
      ctx.fillStyle = '#334155';
      ctx.fillRect(x + 4, y + 28, 40, 6);
      // Glowing bottom neon
      ctx.fillStyle = 'var(--primary)';
      ctx.fillRect(x, y + 44, 48, 4);
    }
  }
];

// Set interactable collision grid boundaries in mapGrid
interactables.forEach(obj => {
  for (let r = 0; r < obj.h; r++) {
    for (let c = 0; c < obj.w; c++) {
      mapGrid[obj.gy + r][obj.gx + c] = 2; // Collision state
    }
  }
});

// Player Setup
const player = {
  x: 200,
  y: 160,
  speed: 2.2,
  w: 12,
  h: 15,
  dir: 'down',
  walking: false,
  animTimer: 0
};

// Input handling mapping
const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
  e: false
};

window.addEventListener('keydown', (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = false;
  }
});

// Touch Click/Tap destination movement
let touchDestX = null;
let touchDestY = null;
canvas.addEventListener('click', (e) => {
  if (!gameActive) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  touchDestX = (e.clientX - rect.left) * scaleX;
  touchDestY = (e.clientY - rect.top) * scaleY;
});

// Mobile D-Pad listeners
const setDpad = (dir, active) => {
  if (dir === 'up') keys.w = active;
  if (dir === 'down') keys.s = active;
  if (dir === 'left') keys.a = active;
  if (dir === 'right') keys.d = active;
};

document.getElementById('dpad-up').addEventListener('pointerdown', () => setDpad('up', true));
document.getElementById('dpad-up').addEventListener('pointerup', () => setDpad('up', false));
document.getElementById('dpad-down').addEventListener('pointerdown', () => setDpad('down', true));
document.getElementById('dpad-down').addEventListener('pointerup', () => setDpad('down', false));
document.getElementById('dpad-left').addEventListener('pointerdown', () => setDpad('left', true));
document.getElementById('dpad-left').addEventListener('pointerup', () => setDpad('left', false));
document.getElementById('dpad-right').addEventListener('pointerdown', () => setDpad('right', true));
document.getElementById('dpad-right').addEventListener('pointerup', () => setDpad('right', false));
document.getElementById('dpad-interact').addEventListener('click', () => {
  keys.e = true;
});

// Collision detection bounds check
function checkCollision(x, y) {
  // Check bounds
  if (x < 0 || x + player.w > canvas.width || y < 0 || y + player.h > canvas.height) return true;

  // Grid check (checking bounding corners)
  const corners = [
    { x: x, y: y },
    { x: x + player.w, y: y },
    { x: x, y: y + player.h },
    { x: x + player.w, y: y + player.h }
  ];

  for (let c of corners) {
    const colIdx = Math.floor(c.x / TILE_SIZE);
    const rowIdx = Math.floor(c.y / TILE_SIZE);
    
    if (rowIdx >= 0 && rowIdx < ROWS && colIdx >= 0 && colIdx < COLS) {
      if (mapGrid[rowIdx][colIdx] > 0) return true;
    }
  }
  return false;
}

// Distance checking helper
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Update game physics & states
function updateGame() {
  if (!gameActive) return;

  player.walking = false;
  let dx = 0;
  let dy = 0;

  // Keyboard controls
  if (keys.w || keys.ArrowUp) { dy = -player.speed; player.dir = 'up'; player.walking = true; }
  else if (keys.s || keys.ArrowDown) { dy = player.speed; player.dir = 'down'; player.walking = true; }
  
  if (keys.a || keys.ArrowLeft) { dx = -player.speed; player.dir = 'left'; player.walking = true; }
  else if (keys.d || keys.ArrowRight) { dx = player.speed; player.dir = 'right'; player.walking = true; }

  // Overriding movement with touch screen tap navigation
  if (touchDestX !== null && touchDestY !== null) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const dist = distance(px, py, touchDestX, touchDestY);
    if (dist > 6) {
      const angle = Math.atan2(touchDestY - py, touchDestX - px);
      dx = Math.cos(angle) * player.speed;
      dy = Math.sin(angle) * player.speed;
      player.walking = true;

      // Update direction states
      if (Math.abs(dx) > Math.abs(dy)) {
        player.dir = dx > 0 ? 'right' : 'left';
      } else {
        player.dir = dy > 0 ? 'down' : 'up';
      }
    } else {
      touchDestX = null;
      touchDestY = null;
    }
  }

  // Clear touch if keyboard input overrides
  if (dx !== 0 && dy !== 0 && (keys.w || keys.s || keys.a || keys.d)) {
    touchDestX = null;
    touchDestY = null;
  }

  // Collision horizontal movement
  if (dx !== 0) {
    if (!checkCollision(player.x + dx, player.y)) {
      player.x += dx;
    }
  }
  // Collision vertical movement
  if (dy !== 0) {
    if (!checkCollision(player.x, player.y + dy)) {
      player.y += dy;
    }
  }

  // Animation ticks
  if (player.walking) {
    player.animTimer += 0.15;
  } else {
    player.animTimer = 0;
  }

  // Check proximity to interactables
  let nearItem = null;
  const px = player.x + player.w / 2;
  const py = player.y + player.h / 2;

  interactables.forEach(item => {
    const itemCenterX = (item.gx + item.w / 2) * TILE_SIZE;
    const itemCenterY = (item.gy + item.h / 2) * TILE_SIZE;
    const dist = distance(px, py, itemCenterX, itemCenterY);
    
    // Within 2.5 tiles limit
    if (dist < 40) {
      nearItem = item;
    }
  });

  const instBar = document.getElementById('inst-bar');
  if (nearItem) {
    instBar.innerHTML = `NEAR: <span style="color:#fff;">${nearItem.name}</span> • [E] or CLICK DPAD "E" to INTERACT`;
    
    // Check interaction button
    if (keys.e) {
      keys.e = false;
      openModal(nearItem.modal);
    }
  } else {
    instBar.innerHTML = `[WASD / ARROWS] TO WALK • CLICK TILES TO GO • INTERACT TO RUN OBJECTS`;
    keys.e = false;
  }
}

// Draw Sercan OS 2D pixel-art map
function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw floor (Wood plank style)
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (mapGrid[r][c] === 1) continue;
      
      // Alternate tile colors to simulate wood texture
      ctx.fillStyle = (r + c) % 2 === 0 ? '#1e293b' : '#0f172a';
      ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      
      // Draw grid dots or subtle lines
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // Draw a digital workspace carpet/rug border in main center area
  ctx.strokeStyle = 'var(--primary)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(4 * TILE_SIZE, 4 * TILE_SIZE, 20 * TILE_SIZE, 10 * TILE_SIZE);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(57, 255, 20, 0.03)';
  ctx.fillRect(4 * TILE_SIZE, 4 * TILE_SIZE, 20 * TILE_SIZE, 10 * TILE_SIZE);

  // 2. Draw outer walls
  ctx.fillStyle = '#0f172a';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (mapGrid[r][c] === 1) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // 3. Draw interactable objects
  interactables.forEach(item => {
    item.draw(ctx, item.gx * TILE_SIZE, item.gy * TILE_SIZE);
  });

  // 4. Draw Player avatar
  ctx.save();
  ctx.translate(player.x, player.y);

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(player.w / 2, player.h - 1, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Character body & face direction
  ctx.fillStyle = '#3b82f6'; // Blue shirt
  ctx.fillRect(2, 6, player.w - 4, 7);

  // Animated legs (walking cycling frames)
  const walkingOffset = Math.floor(player.animTimer) % 2 === 0 ? 0 : 2;
  ctx.fillStyle = '#475569'; // Pants
  ctx.fillRect(2, 13, 3, 2 + (walkingOffset === 0 ? 0 : 1));
  ctx.fillRect(player.w - 5, 13, 3, 2 + (walkingOffset === 2 ? 0 : 1));

  // Head/Hair
  ctx.fillStyle = '#ffd27f'; // Skin
  ctx.fillRect(3, 1, player.w - 6, 5);
  ctx.fillStyle = '#222'; // Black hair
  ctx.fillRect(2, 0, player.w - 4, 2);
  ctx.fillRect(2, 2, 2, 2);

  // Eyes based on looking direction
  ctx.fillStyle = 'var(--primary)';
  if (player.dir === 'down') {
    ctx.fillRect(4, 3, 2, 2);
    ctx.fillRect(8, 3, 2, 2);
  } else if (player.dir === 'left') {
    ctx.fillRect(3, 3, 2, 2);
  } else if (player.dir === 'right') {
    ctx.fillRect(9, 3, 2, 2);
  } else {
    // Up: Hair covers back of head
    ctx.fillStyle = '#222';
    ctx.fillRect(3, 2, player.w - 6, 4);
  }

  ctx.restore();
}

// Core Loop
function gameLoop() {
  updateGame();
  drawGame();
  requestAnimationFrame(gameLoop);
}
gameLoop();


// ----------------------------------------------------
// 3. DIALOG MODALS MANAGEMENT
// ----------------------------------------------------
const overlays = document.querySelectorAll('.dialog-overlay');
const closeButtons = document.querySelectorAll('.dialog-close');

function openModal(id) {
  gameActive = false;
  document.getElementById(id).style.display = 'flex';
  
  // Custom modal triggers (e.g., Skills animation)
  if (id === 'modal-skills') {
    setTimeout(() => {
      document.getElementById('fill-ai').style.width = '90%';
      document.getElementById('fill-backend').style.width = '85%';
      document.getElementById('fill-db').style.width = '78%';
      document.getElementById('fill-desktop').style.width = '70%';
    }, 150);
  }
  
  if (id === 'modal-arcade') {
    startArcadeGame();
  }
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  gameActive = true;
  touchDestX = null;
  touchDestY = null;
  
  if (id === 'modal-skills') {
    document.getElementById('fill-ai').style.width = '0%';
    document.getElementById('fill-backend').style.width = '0%';
    document.getElementById('fill-db').style.width = '0%';
    document.getElementById('fill-desktop').style.width = '0%';
  }
  if (id === 'modal-arcade') {
    stopArcadeGame();
  }
}

closeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-close');
    closeModal(id);
  });
});


// ----------------------------------------------------
// 4. PROJECTS DIRECTORY TREE FILE INSPECTOR
// ----------------------------------------------------
const files = {
  'file-cv': {
    title: 'cv_analyzer.py',
    desc: 'Combines resume NLP insights, semantic similarity keyword checks, and ATS formatting match grades inside a clean Python backend environment.',
    stack: 'Python, FastAPI, SentenceTransformers, SQLite',
    link: 'https://github.com/SercanOzkan55/CV-Analyzer'
  },
  'file-space': {
    title: 'space_duel.js',
    desc: 'Retro canvas space shooter mini arcade emulator featuring ship controls, particle explosions, collision layers, and score logs.',
    stack: 'JavaScript (ES6), HTML5 Canvas, CSS Neon Gradients',
    link: 'https://SercanOzkan55.github.io/SercanOzkan55/'
  },
  'file-food': {
    title: 'server.js',
    desc: 'Food cataloging and menu ordering service endpoints. Focuses on safe API payload validation and database queries.',
    stack: 'NodeJS, ExpressJS, MongoDB, RESTful Endpoints',
    link: 'https://github.com/SercanOzkan55/FoodApp'
  }
};

const displayBox = document.getElementById('project-detail-display');
const displayTitle = document.getElementById('project-detail-title');
const displayDesc = document.getElementById('project-detail-desc');
const displayStack = document.getElementById('project-detail-stack');
const displayLink = document.getElementById('project-detail-link');

Object.keys(files).forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    const data = files[id];
    displayTitle.textContent = data.title;
    displayDesc.textContent = data.desc;
    displayStack.textContent = data.stack;
    displayLink.href = data.link;
    displayBox.style.display = 'block';
  });
});


// ----------------------------------------------------
// 5. CV ANALYZER ATS SCANNER WIDGET
// ----------------------------------------------------
const runScanBtn = document.getElementById('run-scanner-btn');
const scanProgressBar = document.getElementById('scanner-bar');
const scanProgressFill = document.getElementById('scanner-fill');
const scanResultsBox = document.getElementById('scanner-results-box');

runScanBtn.addEventListener('click', () => {
  scanResultsBox.style.display = 'none';
  scanProgressBar.style.display = 'block';
  scanProgressFill.style.style = '0%';
  
  let val = 0;
  const interval = setInterval(() => {
    val += 5;
    scanProgressFill.style.width = `${val}%`;
    
    if (val >= 100) {
      clearInterval(interval);
      setTimeout(showScannerResults, 200);
    }
  }, 100);
});

function showScannerResults() {
  scanProgressBar.style.display = 'none';
  
  const resume = document.getElementById('scan-resume').value;
  const job = document.getElementById('scan-job').value;

  let score = 0;
  let assess = "";
  let strengths = [];
  let gaps = [];

  if (resume === 'student' && job === 'ai') {
    score = 88;
    assess = "Excellent profile alignment. Resume shows active deployment of LLM prompt tuning, parsing tools, and python data structuring matching this AI/Backend requirement.";
    strengths = ["Mentions AI and Prompt Tuning explicitly", "Directly links related repositories", "Python + SQL data matching metrics"];
    gaps = ["Expand on cloud server deployment pipelines (Docker, AWS)"];
  } else if (resume === 'student' && job === 'web') {
    score = 65;
    assess = "Partial match. Found solid JavaScript and HTML5 Canvas knowledge, but lacking deep component architectures.";
    strengths = ["Strong ES6 foundations", "Dynamic GUI visualization experience"];
    gaps = ["Include modern reactive client engines (React, Vue)", "Lacks UI layout wrappers (Tailwind)"];
  } else if (resume === 'junior' && job === 'web') {
    score = 80;
    assess = "Good junior alignment. Tech credentials provide foundations for interface scripting and mock integrations.";
    strengths = ["Fundamental CSS/HTML formatting", "Basic scripting modules"];
    gaps = ["Incorporate modern pipeline tools and git collaboration logs"];
  } else if (resume === 'marketing' && job === 'sales') {
    score = 92;
    assess = "Top-tier candidate. Strong sales metrics, presentation, and pipeline automation CRM metrics.";
    strengths = ["Salesforce CRM familiarity", "Lead validation funneling analytics"];
    gaps = ["Include dashboard visualization libraries (Tableau, PowerBI)"];
  } else {
    // Unmatched combinations
    score = Math.floor(Math.random() * 25) + 15;
    assess = "Critical discrepancy index. Core skill markers do not match target framework capabilities required for this job description.";
    strengths = ["General computer literacy indicators."];
    gaps = ["Major technical retraining recommended.", "Acquire corresponding certification courses."];
  }

  document.getElementById('scan-score-val').textContent = score;
  document.getElementById('scan-assess').textContent = assess;
  
  const strList = document.getElementById('scan-strengths');
  const gapList = document.getElementById('scan-gaps');
  
  strList.innerHTML = strengths.map(s => `<li>• ${s}</li>`).join('');
  gapList.innerHTML = gaps.map(g => `<li>• ${g}</li>`).join('');
  
  scanResultsBox.style.display = 'block';
}


// ----------------------------------------------------
// 6. ARCADE NEON SPACE DUEL MINI-GAME ENGINE
// ----------------------------------------------------
const arcadeCanvas = document.getElementById('arcade-canvas');
const arcadeCtx = arcadeCanvas.getContext('2d');
const scoreEl = document.getElementById('arcade-score');
const highscoreEl = document.getElementById('arcade-highscore');

let arcadeLoopId = null;
let arcadeActive = false;
let gameScore = 0;
let highScore = 150;

// Game state variables
let shipX = arcadeCanvas.width / 2;
const shipY = arcadeCanvas.height - 24;
const shipWidth = 24;
const shipHeight = 12;
let bullets = [];
let targets = [];
let gameKeys = { a: false, d: false, ArrowLeft: false, ArrowRight: false, space: false };
let shield = 3;
let targetSpawnTimer = 0;

// Listeners inside arcade
function handleArcadeKeydown(e) {
  if (e.key === 'a' || e.key === 'ArrowLeft') gameKeys.a = true;
  if (e.key === 'd' || e.key === 'ArrowRight') gameKeys.d = true;
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault(); // Stop screen jump
    gameKeys.space = true;
  }
}
function handleArcadeKeyup(e) {
  if (e.key === 'a' || e.key === 'ArrowLeft') gameKeys.a = false;
  if (e.key === 'd' || e.key === 'ArrowRight') gameKeys.d = false;
  if (e.key === ' ' || e.code === 'Space') gameKeys.space = false;
}

// Direct screen tap shoots / moves on mobile in arcade
arcadeCanvas.addEventListener('click', (e) => {
  if (!arcadeActive) return;
  const rect = arcadeCanvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  // Move ship towards click x and fire
  shipX = (clickX / rect.width) * arcadeCanvas.width;
  bullets.push({ x: shipX, y: shipY - 6, w: 2, h: 6, speed: 6 });
});

function startArcadeGame() {
  arcadeActive = true;
  gameScore = 0;
  shield = 3;
  bullets = [];
  targets = [];
  shipX = arcadeCanvas.width / 2;
  scoreEl.textContent = '0000';
  
  window.addEventListener('keydown', handleArcadeKeydown);
  window.addEventListener('keyup', handleArcadeKeyup);
  
  arcadeLoop();
}

function stopArcadeGame() {
  arcadeActive = false;
  if (arcadeLoopId) cancelAnimationFrame(arcadeLoopId);
  window.removeEventListener('keydown', handleArcadeKeydown);
  window.removeEventListener('keyup', handleArcadeKeyup);
}

function spawnTarget() {
  const size = 16;
  const x = Math.random() * (arcadeCanvas.width - size);
  targets.push({
    x: x,
    y: 0,
    w: size,
    h: size,
    speed: Math.random() * 1.2 + 0.8,
    color: Math.random() > 0.5 ? 'var(--primary)' : '#c084fc'
  });
}

function updateArcade() {
  // Move ship
  if (gameKeys.a) shipX -= 4.2;
  if (gameKeys.d) shipX += 4.2;

  // Clamp ship bounds
  if (shipX < shipWidth / 2) shipX = shipWidth / 2;
  if (shipX > arcadeCanvas.width - shipWidth / 2) shipX = arcadeCanvas.width - shipWidth / 2;

  // Space shooting cooling interval
  if (gameKeys.space) {
    gameKeys.space = false; // Require semi-auto clicks
    bullets.push({
      x: shipX,
      y: shipY - 6,
      w: 2,
      h: 6,
      speed: 6.5
    });
  }

  // Update bullets
  bullets.forEach((b, idx) => {
    b.y -= b.speed;
    if (b.y < 0) bullets.splice(idx, 1);
  });

  // Update targets spawn
  targetSpawnTimer++;
  if (targetSpawnTimer > 60) {
    targetSpawnTimer = 0;
    spawnTarget();
  }

  // Move targets
  targets.forEach((t, tIdx) => {
    t.y += t.speed;
    
    // Check hit bottom
    if (t.y > arcadeCanvas.height) {
      targets.splice(tIdx, 1);
      shield--;
    }
  });

  // Bullet & target collision checking
  bullets.forEach((b, bIdx) => {
    targets.forEach((t, tIdx) => {
      if (
        b.x > t.x && b.x < t.x + t.w &&
        b.y > t.y && b.y < t.y + t.h
      ) {
        bullets.splice(bIdx, 1);
        targets.splice(tIdx, 1);
        gameScore += 10;
        
        // Update score UI
        scoreEl.textContent = String(gameScore).padStart(4, '0');
        if (gameScore > highScore) {
          highScore = gameScore;
          highscoreEl.textContent = String(highScore).padStart(4, '0');
        }
      }
    });
  });

  // Game over checks
  if (shield <= 0) {
    arcadeActive = false;
  }
}

function drawArcade() {
  arcadeCtx.clearRect(0, 0, arcadeCanvas.width, arcadeCanvas.height);

  // Background grid
  arcadeCtx.strokeStyle = 'rgba(57, 255, 20, 0.05)';
  arcadeCtx.lineWidth = 0.5;
  for (let x = 0; x < arcadeCanvas.width; x += 20) {
    arcadeCtx.beginPath();
    arcadeCtx.moveTo(x, 0);
    arcadeCtx.lineTo(x, arcadeCanvas.height);
    arcadeCtx.stroke();
  }
  for (let y = 0; y < arcadeCanvas.height; y += 20) {
    arcadeCtx.beginPath();
    arcadeCtx.moveTo(0, y);
    arcadeCtx.lineTo(arcadeCanvas.width, y);
    arcadeCtx.stroke();
  }

  // Draw Player ship
  arcadeCtx.fillStyle = 'var(--primary)';
  arcadeCtx.beginPath();
  arcadeCtx.moveTo(shipX, shipY - 8);
  arcadeCtx.lineTo(shipX - shipWidth / 2, shipY + shipHeight / 2);
  arcadeCtx.lineTo(shipX + shipWidth / 2, shipY + shipHeight / 2);
  arcadeCtx.closePath();
  arcadeCtx.fill();

  // Draw bullets
  arcadeCtx.fillStyle = '#ef4444';
  bullets.forEach(b => {
    arcadeCtx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
  });

  // Draw targets (Space Invaders styling shapes)
  targets.forEach(t => {
    arcadeCtx.fillStyle = t.color;
    arcadeCtx.fillRect(t.x, t.y, t.w, t.h);
    // Add simple pixel details
    arcadeCtx.fillStyle = '#020617';
    arcadeCtx.fillRect(t.x + 3, t.y + 4, 3, 3);
    arcadeCtx.fillRect(t.x + 10, t.y + 4, 3, 3);
  });

  // Draw shields health bar
  arcadeCtx.fillStyle = 'var(--primary)';
  arcadeCtx.font = '8px monospace';
  arcadeCtx.fillText(`SHIELD: ${'I'.repeat(shield)}`, 10, 20);

  // Game over overlay
  if (!arcadeActive) {
    arcadeCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    arcadeCtx.fillRect(0, 0, arcadeCanvas.width, arcadeCanvas.height);
    
    arcadeCtx.fillStyle = '#ef4444';
    arcadeCtx.font = '16px monospace';
    arcadeCtx.textAlign = 'center';
    arcadeCtx.fillText('GAME OVER', arcadeCanvas.width / 2, arcadeCanvas.height / 2 - 10);
    
    arcadeCtx.fillStyle = 'var(--primary)';
    arcadeCtx.font = '10px monospace';
    arcadeCtx.fillText('CLICK CANV OR REOPEN TO RETRY', arcadeCanvas.width / 2, arcadeCanvas.height / 2 + 15);
    arcadeCtx.textAlign = 'start';
  }
}

function arcadeLoop() {
  if (arcadeActive) {
    updateArcade();
  }
  drawArcade();
  arcadeLoopId = requestAnimationFrame(arcadeLoop);
}
