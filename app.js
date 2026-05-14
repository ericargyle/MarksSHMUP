const c = document.getElementById('game');
const x = c.getContext('2d');
const hud = document.getElementById('hud');
const footnote = document.getElementById('footnote');
const titleScreen = document.getElementById('titleScreen');
const versionStamp = document.getElementById('versionStamp');
const startBtn = document.getElementById('startBtn');

let dpr = 1, W = 0, H = 0;
let started = false;
let keys = {};
let ship = { x: 0, y: 0, w: 44, h: 26, speed: 260 };
let stars = [];
let bullets = [];
let enemies = [];
let fireCooldown = 0;
let spawnCooldown = 0.6;
let score = 0;

function nowStamp(){
  return new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour12: true });
}

function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = Math.max(1, window.innerWidth);
  const vh = Math.max(1, window.innerHeight);
  W = c.width = Math.floor(vw * dpr);
  H = c.height = Math.floor(vh * dpr);
  c.style.width = '100vw';
  c.style.height = '100vh';
  ship.w = Math.max(34 * dpr, Math.min(52 * dpr, Math.floor(Math.min(W, H) * 0.08)));
  ship.h = ship.w * 0.6;
  ship.x = clamp(ship.x || (W * 0.5 - ship.w * 0.5), 8 * dpr, W - ship.w - 8 * dpr);
  ship.y = clamp(ship.y || (H * 0.65), 8 * dpr, H - ship.h - 8 * dpr);
  if (stars.length === 0) {
    for (let i = 0; i < 60; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 1, s: Math.random() * 0.35 + 0.1 });
  }
}

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function rect(x0,y0,w,h,c0){ x.fillStyle = c0; x.fillRect(x0,y0,w,h); }
function circle(x0,y0,r,c0){ x.fillStyle = c0; x.beginPath(); x.arc(x0,y0,r,0,Math.PI*2); x.fill(); }
function overlap(a,b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function drawShip(){
  const x0 = ship.x, y0 = ship.y, w = ship.w, h = ship.h;
  x.save();
  x.fillStyle = '#5fd3ff';
  x.beginPath();
  x.moveTo(x0 + w * 0.5, y0);
  x.lineTo(x0 + w, y0 + h * 0.5);
  x.lineTo(x0 + w * 0.72, y0 + h);
  x.lineTo(x0 + w * 0.28, y0 + h);
  x.lineTo(x0, y0 + h * 0.5);
  x.closePath();
  x.fill();
  x.fillStyle = '#e8fbff';
  x.beginPath();
  x.moveTo(x0 + w * 0.5, y0 + h * 0.14);
  x.lineTo(x0 + w * 0.83, y0 + h * 0.5);
  x.lineTo(x0 + w * 0.5, y0 + h * 0.86);
  x.lineTo(x0 + w * 0.17, y0 + h * 0.5);
  x.closePath();
  x.fill();
  x.fillStyle = '#ffd35d';
  x.beginPath();
  x.arc(x0 + w * 0.5, y0 + h * 0.5, Math.max(2, w * 0.07), 0, Math.PI * 2);
  x.fill();
  x.restore();
}

function drawBullets(){
  bullets.forEach(b => circle(b.x, b.y, 4 * dpr, '#fff8df'));
}

function drawEnemies(){
  enemies.forEach(e => rect(e.x, e.y, e.w, e.h, e.color));
}

function draw(){
  rect(0,0,W,H,'#08111f');
  stars.forEach(s => {
    s.x -= s.s * 120 * dpr / 60;
    if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
    circle(s.x, s.y, s.r * dpr, '#ffffff');
  });
  drawBullets();
  drawEnemies();
  drawShip();
  x.fillStyle = '#ffffff';
  x.font = `${16 * dpr}px system-ui`;
  x.fillText(`Score ${score}`, 16 * dpr, 54 * dpr);
  if (!started) {
    x.fillStyle = 'rgba(255,255,255,0.12)';
    x.fillRect(0,0,W,H);
    x.fillStyle = '#ffffff';
    x.font = `${18 * dpr}px system-ui`;
    x.fillText('Press Start to play', 18 * dpr, 36 * dpr);
  }
}

function spawnEnemy(){
  const defs = [
    { color: '#ff4b4b', score: 3, speed: 220 },
    { color: '#ffd84a', score: 2, speed: 170 },
    { color: '#4cff7a', score: 1, speed: 120 },
  ];
  const pick = defs[Math.floor(Math.random() * defs.length)];
  const side = Math.floor(Math.random() * 4);
  const size = ship.w;
  let xPos = 0, yPos = 0, vx = 0, vy = 0;
  if (side === 0) { xPos = -size; yPos = rand(20 * dpr, H - 20 * dpr - size); vx = pick.speed * dpr; }
  if (side === 1) { xPos = W + size; yPos = rand(20 * dpr, H - 20 * dpr - size); vx = -pick.speed * dpr; }
  if (side === 2) { xPos = rand(20 * dpr, W - 20 * dpr - size); yPos = -size; vy = pick.speed * dpr; }
  if (side === 3) { xPos = rand(20 * dpr, W - 20 * dpr - size); yPos = H + size; vy = -pick.speed * dpr; }
  enemies.push({ x: xPos, y: yPos, w: size, h: size, color: pick.color, value: pick.score, vx, vy, speed: pick.speed * dpr });
}

function update(dt){
  if (!started) return;
  fireCooldown = Math.max(0, fireCooldown - dt);
  spawnCooldown = Math.max(0, spawnCooldown - dt);

  let dx = 0, dy = 0;
  if (keys.KeyA) dx -= 1;
  if (keys.KeyD) dx += 1;
  if (keys.KeyW) dy -= 1;
  if (keys.KeyS) dy += 1;
  const len = Math.hypot(dx, dy) || 1;
  ship.x += (dx / len) * ship.speed * dpr * dt;
  ship.y += (dy / len) * ship.speed * dpr * dt;
  ship.x = clamp(ship.x, 8 * dpr, W - ship.w - 8 * dpr);
  ship.y = clamp(ship.y, 8 * dpr, H - ship.h - 8 * dpr);

  if (keys.ArrowUp) shoot(0, -1);
  if (keys.ArrowDown) shoot(0, 1);
  if (keys.ArrowLeft) shoot(-1, 0);
  if (keys.ArrowRight) shoot(1, 0);

  if (spawnCooldown <= 0) {
    spawnEnemy();
    spawnCooldown = 0.35 + Math.random() * 0.7;
  }

  bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
  bullets = bullets.filter(b => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);

  enemies.forEach(e => {
    const dxE = ship.x - e.x;
    const dyE = ship.y - e.y;
    const lenE = Math.hypot(dxE, dyE) || 1;
    e.x += (dxE / lenE) * e.speed * dt * 0.35 + e.vx * dt * 0.05;
    e.y += (dyE / lenE) * e.speed * dt * 0.35 + e.vy * dt * 0.05;
  });

  bullets.forEach(b => {
    enemies.forEach(e => {
      if (e.value && overlap({ x: b.x, y: b.y, w: 4 * dpr, h: 4 * dpr }, e)) {
        e.value = 0;
        b.x = -9999;
        score += e.color === '#ff4b4b' ? 3 : e.color === '#ffd84a' ? 2 : 1;
      }
    });
  });

  enemies = enemies.filter(e => e.value !== 0);
  hud.textContent = `WASD moves, arrows fire only. Score ${score}.`;
}

function shoot(vx, vy){
  if (fireCooldown > 0) return;
  const speed = 520 * dpr;
  bullets.push({ x: ship.x + ship.w * 0.5, y: ship.y + ship.h * 0.5, vx: vx * speed, vy: vy * speed });
  fireCooldown = 0.14;
}

function loop(ts){
  if (!loop.last) loop.last = ts;
  const dt = Math.min(0.033, (ts - loop.last) / 1000);
  loop.last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function startGame(){
  started = true;
  titleScreen.classList.add('hidden');
  ship.x = W * 0.5 - ship.w * 0.5;
  ship.y = H * 0.65;
  bullets = [];
  enemies = [];
  fireCooldown = 0;
  spawnCooldown = 0.6;
  score = 0;
}

c.addEventListener('pointerdown', () => { started = true; titleScreen.classList.add('hidden'); });
startBtn.addEventListener('click', startGame);
window.addEventListener('keydown', e => { started = true; titleScreen.classList.add('hidden'); keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('resize', resize);

resize();
ship.x = W * 0.5 - ship.w * 0.5;
ship.y = H * 0.65;
versionStamp.textContent = `Version ${nowStamp()} CST`;
footnote.textContent = `Synced ${nowStamp()} CST`;
requestAnimationFrame(loop);
