const c = document.getElementById('game');
const x = c.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const statusEl = document.getElementById('status');
const statsEl = document.getElementById('stats');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const fireBtn = document.getElementById('fireBtn');
const bombBtn = document.getElementById('bombBtn');

const W = { w: 0, h: 0, dpr: 1 };
const keys = {};
let running = false;
let last = 0;
let scene = 'grass';
let levelIndex = 0;
let score = 0;
let lives = 3;
let bombs = 3;
let shake = 0;
let flash = 0;
let bossHitFlash = 0;
let bgX = 0;
let fireCooldown = 0;
let spawnTimer = 0;
let levelTimer = 0;
let particles = [];
let bullets = [];
let enemyBullets = [];
let enemies = [];
let powerups = [];
let mountains = [];
let terrain = [];
let player = { x: 90, y: 0, w: 26, h: 18, speed: 300, fireRate: 0.14, inv: 0 };
let boss = null;

const levelDefs = [
  { name: 'Grass Run', bg: ['#69c34c', '#8ee265'], enemyRate: 1.0, speed: 130, bossHp: 24 },
  { name: 'Snow Rush', bg: ['#d7f3ff', '#89b8d3'], enemyRate: 1.15, speed: 160, bossHp: 30 },
  { name: 'Volcano Edge', bg: ['#ffb25c', '#7d2c2c'], enemyRate: 1.35, speed: 190, bossHp: 38 },
];

function rand(a, b) { return Math.random() * (b - a) + a; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function resize() {
  W.dpr = Math.min(window.devicePixelRatio || 1, 2);
  W.w = c.width = Math.floor(innerWidth * W.dpr);
  W.h = c.height = Math.floor(innerHeight * W.dpr);
  c.style.width = '100vw';
  c.style.height = '100vh';
}
function sx(v) { return v * W.dpr; }
function sy(v) { return v * W.dpr; }
function rect(x0, y0, w, h, color) { x.fillStyle = color; x.fillRect(x0, y0, w, h); }
function circle(x0, y0, r, color) { x.fillStyle = color; x.beginPath(); x.arc(x0, y0, r, 0, Math.PI * 2); x.fill(); }
function line(x1, y1, x2, y2, color, width = 3) { x.strokeStyle = color; x.lineWidth = width; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); }

function buildTerrain() {
  mountains = [];
  terrain = [];
  for (let i = 0; i < 8; i++) mountains.push({ x: rand(0, 900), y: rand(40, 220), w: rand(120, 240), h: rand(50, 130), s: rand(0.2, 0.7) });
  for (let i = 0; i < 120; i++) terrain.push({ x: rand(0, 2000), y: rand(0, 1), kind: Math.random() > 0.8 ? 'tree' : 'rock', s: rand(0.7, 1.2) });
}
function resetLevel(idx) {
  levelIndex = idx;
  const L = levelDefs[levelIndex];
  scene = levelIndex === 1 ? 'snow' : levelIndex === 2 ? 'lava' : 'grass';
  bullets = []; enemyBullets = []; enemies = []; powerups = [];
  boss = null;
  player.x = 90 * W.dpr;
  player.y = W.h * 0.72;
  player.inv = 1.2;
  fireCooldown = 0;
  spawnTimer = 0.7;
  levelTimer = 0;
  bgX = 0;
  shake = 0;
  flash = 0;
  bossHitFlash = 0;
  statusEl.textContent = `${L.name} ready`;
  statsEl.textContent = `Score ${score} · Bombs ${bombs} · Level ${levelIndex + 1}`;
}
function addParticle(x0, y0, color) {
  for (let i = 0; i < 10; i++) particles.push({ x: x0, y: y0, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.25, 0.55), color });
}
function shoot(fromPlayer = true) {
  if (fromPlayer) {
    if (fireCooldown > 0) return;
    bullets.push({ x: player.x + 14 * W.dpr, y: player.y - 2 * W.dpr, vx: 520 * W.dpr, vy: 0, r: 4 * W.dpr, dmg: 1 });
    fireCooldown = player.fireRate;
  }
}
function bomb() {
  if (bombs <= 0) return;
  bombs--;
  flash = 0.35;
  shake = 18;
  enemies.forEach(e => { e.hp = 0; score += 10; addParticle(e.x, e.y, '#fff3b0'); });
  if (boss) boss.hp -= 6;
  enemyBullets = [];
  statsEl.textContent = `Score ${score} · Bombs ${bombs} · Level ${levelIndex + 1}`;
}
function spawnEnemy() {
  const L = levelDefs[levelIndex];
  const y = rand(W.h * 0.1, W.h * 0.68);
  const type = Math.random();
  if (type < 0.62) enemies.push({ kind: 'drone', x: W.w + 40, y, w: 26 * W.dpr, h: 18 * W.dpr, hp: 1, vx: -(L.speed + rand(20, 80)) * W.dpr, vy: rand(-15, 15) * W.dpr, shoot: rand(0.9, 2.2) });
  else if (type < 0.88) enemies.push({ kind: 'turret', x: W.w + 40, y, w: 30 * W.dpr, h: 24 * W.dpr, hp: 2, vx: -(L.speed * 0.65) * W.dpr, vy: 0, shoot: rand(0.7, 1.4) });
  else enemies.push({ kind: 'charger', x: W.w + 40, y, w: 34 * W.dpr, h: 22 * W.dpr, hp: 2, vx: -(L.speed * 1.3) * W.dpr, vy: rand(-24, 24) * W.dpr, shoot: rand(1.4, 2.4) });
}
function spawnBoss() {
  boss = { x: W.w + 180, y: W.h * 0.25, w: 150 * W.dpr, h: 86 * W.dpr, hp: levelDefs[levelIndex].bossHp, maxHp: levelDefs[levelIndex].bossHp, vx: -90 * W.dpr, phase: 0, fire: 0.6 };
  statusEl.textContent = 'Boss incoming';
}
function hitPlayer() {
  if (player.inv > 0) return;
  lives--;
  player.inv = 1.3;
  shake = 20;
  addParticle(player.x, player.y, '#ffffff');
  if (lives <= 0) {
    running = false;
    overlay.classList.remove('hidden');
    overlay.querySelector('h1').textContent = 'Game Over';
    overlay.querySelector('p').textContent = `Final score ${score}. Tap start to try again.`;
    startBtn.textContent = 'Restart';
  }
}
function rectHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function drawBackground(dt) {
  const L = levelDefs[levelIndex];
  bgX -= 140 * W.dpr * dt;
  if (bgX < -W.w) bgX += W.w;
  rect(0, 0, W.w, W.h, L.bg[0]);
  const grad = x.createLinearGradient(0, 0, 0, W.h);
  grad.addColorStop(0, L.bg[0]);
  grad.addColorStop(1, L.bg[1]);
  x.fillStyle = grad;
  x.fillRect(0, 0, W.w, W.h);

  x.save();
  x.translate(bgX, 0);
  mountains.forEach(m => {
    x.fillStyle = levelIndex === 1 ? '#edf9ff' : levelIndex === 2 ? '#7f2d2d' : '#356d2a';
    x.beginPath();
    x.moveTo(sx(m.x), sy(m.y + m.h));
    x.lineTo(sx(m.x + m.w / 2), sy(m.y));
    x.lineTo(sx(m.x + m.w), sy(m.y + m.h));
    x.closePath();
    x.fill();
  });
  for (let i = 0; i < 20; i++) {
    const px = ((i * 180) + (bgX * 0.4)) % (W.w + 220) - 100;
    const py = sy(440 + (i % 3) * 16);
    rect(px, py, sx(96), sy(120), levelIndex === 1 ? '#dff6ff' : levelIndex === 2 ? '#ac5a2f' : '#4a8f31');
  }
  x.restore();

  terrain.forEach(t => {
    const xPos = ((t.x * 0.35) - bgX * 0.18) % (W.w + 120) - 60;
    if (t.kind === 'tree') {
      rect(xPos, sy(470), sx(10 * t.s), sy(24 * t.s), '#62431d');
      circle(xPos + sx(5 * t.s), sy(462), sx(14 * t.s), levelIndex === 1 ? '#ffffff' : levelIndex === 2 ? '#f76b3c' : '#2c8b2f');
    } else {
      circle(xPos, sy(490), sx(4 * t.s), levelIndex === 1 ? '#d7e7f0' : levelIndex === 2 ? '#913c23' : '#6aa253');
    }
  });
}
function drawPlayer() {
  const px = player.x, py = player.y;
  x.save();
  if (player.inv > 0 && Math.floor(performance.now() / 80) % 2 === 0) x.globalAlpha = 0.4;
  rect(px - 8 * W.dpr, py - 10 * W.dpr, 18 * W.dpr, 10 * W.dpr, '#2cc7ff');
  rect(px - 18 * W.dpr, py - 6 * W.dpr, 38 * W.dpr, 9 * W.dpr, '#ffffff');
  circle(px + 10 * W.dpr, py - 6 * W.dpr, 8 * W.dpr, '#ffcf66');
  line(px - 20 * W.dpr, py - 1 * W.dpr, px - 30 * W.dpr, py + 8 * W.dpr, '#c8d2ff', 4 * W.dpr);
  x.restore();
}
function drawEnemies() {
  enemies.forEach(e => {
    if (e.kind === 'drone') {
      rect(e.x, e.y, e.w, e.h, '#ff5d7e');
      circle(e.x + e.w * 0.78, e.y + e.h / 2, 5 * W.dpr, '#fff');
    } else if (e.kind === 'turret') {
      rect(e.x, e.y, e.w, e.h, '#8c56ff');
      rect(e.x + 4 * W.dpr, e.y - 8 * W.dpr, e.w - 8 * W.dpr, 10 * W.dpr, '#bda2ff');
    } else {
      rect(e.x, e.y, e.w, e.h, '#ff8f2f');
      circle(e.x + e.w / 2, e.y + e.h / 2, 6 * W.dpr, '#000');
    }
    if (e.hp > 1) rect(e.x, e.y - 5 * W.dpr, e.w, 3 * W.dpr, '#000');
    rect(e.x, e.y - 5 * W.dpr, e.w * Math.max(0, e.hp / 2), 3 * W.dpr, '#4dff8f');
  });
  if (boss) {
    rect(boss.x, boss.y, boss.w, boss.h, '#c92f2f');
    rect(boss.x + 14 * W.dpr, boss.y + 16 * W.dpr, boss.w - 28 * W.dpr, boss.h - 32 * W.dpr, '#691818');
    circle(boss.x + boss.w - 24 * W.dpr, boss.y + boss.h / 2, 16 * W.dpr, '#ffd04d');
    rect(boss.x, boss.y - 8 * W.dpr, boss.w * (boss.hp / boss.maxHp), 5 * W.dpr, '#43ff99');
  }
}
function drawBullets() {
  bullets.forEach(b => circle(b.x, b.y, b.r, '#fff7d6'));
  enemyBullets.forEach(b => circle(b.x, b.y, b.r, '#ffcb74'));
}
function drawParticles(dt) {
  particles = particles.filter(p => (p.life -= dt) > 0);
  particles.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt;
    x.globalAlpha = Math.max(0, p.life / 0.5);
    circle(p.x, p.y, 3 * W.dpr, p.color);
    x.globalAlpha = 1;
  });
}
function update(dt) {
  if (!running) return;
  const L = levelDefs[levelIndex];
  levelTimer += dt;
  fireCooldown = Math.max(0, fireCooldown - dt);
  player.inv = Math.max(0, player.inv - dt);

  if (keys.ArrowUp || keys.KeyW) player.y -= player.speed * dt;
  if (keys.ArrowDown || keys.KeyS) player.y += player.speed * dt;
  if (keys.ArrowLeft || keys.KeyA) player.x -= player.speed * dt;
  if (keys.ArrowRight || keys.KeyD) player.x += player.speed * dt;
  player.x = clamp(player.x, 26 * W.dpr, W.w * 0.42);
  player.y = clamp(player.y, 40 * W.dpr, W.h - 36 * W.dpr);

  if (keys.Space || keys.KeyZ || keys.Enter) shoot(true);

  spawnTimer -= dt;
  if (spawnTimer <= 0 && !boss) {
    spawnEnemy();
    spawnTimer = rand(0.65, 1.25) / L.enemyRate;
  }

  if (!boss && levelTimer > 28) spawnBoss();

  bullets = bullets.filter(b => (b.x += b.vx * dt) < W.w + 40 && b.y > -40 && b.y < W.h + 40);
  enemyBullets = enemyBullets.filter(b => (b.x += b.vx * dt) > -40 && b.y > -40 && b.y < W.h + 40);

  enemies.forEach(e => { e.x += e.vx * dt; e.y += e.vy * dt; e.shoot -= dt; if (e.shoot <= 0 && e.kind !== 'charger') { enemyBullets.push({ x: e.x, y: e.y + e.h/2, vx: -260 * W.dpr, vy: 0, r: 4 * W.dpr }); e.shoot = rand(1.1, 2.2); } });
  enemies = enemies.filter(e => e.x > -100 && e.hp > 0);

  if (boss) {
    boss.x += boss.vx * dt;
    boss.y += Math.sin(levelTimer * 1.8) * 0.6 * W.dpr;
    boss.fire -= dt;
    if (boss.fire <= 0) {
      for (let i = -2; i <= 2; i++) enemyBullets.push({ x: boss.x + 12 * W.dpr, y: boss.y + boss.h / 2 + i * 12 * W.dpr, vx: -320 * W.dpr, vy: i * 30 * W.dpr, r: 4 * W.dpr });
      boss.fire = 0.5;
    }
    if (boss.x < W.w * 0.56) boss.vx = 0;
  }

  bullets.forEach(b => {
    enemies.forEach(e => {
      if (e.hp > 0 && rectHit({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, e)) {
        e.hp--;
        b.x = W.w + 999;
        score += 50;
        addParticle(e.x, e.y, '#fff1a8');
      }
    });
    if (boss && rectHit({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, boss)) {
      boss.hp--;
      b.x = W.w + 999;
      score += 80;
      bossHitFlash = 0.12;
      addParticle(boss.x + rand(0, boss.w), boss.y + rand(0, boss.h), '#ffbf5c');
      if (boss.hp <= 0) {
        score += 1000;
        flash = 0.45;
        shake = 24;
        addParticle(boss.x + boss.w / 2, boss.y + boss.h / 2, '#ffffff');
        boss = null;
        if (levelIndex < levelDefs.length - 1) {
          levelIndex++;
          setTimeout(() => resetLevel(levelIndex), 700);
        } else {
          running = false;
          overlay.classList.remove('hidden');
          overlay.querySelector('h1').textContent = 'You Win!';
          overlay.querySelector('p').textContent = `Final score ${score}. Tap restart to play again.`;
          startBtn.textContent = 'Restart';
        }
      }
    }
  });

  enemyBullets.forEach(b => { if (rectHit({ x: player.x - 12 * W.dpr, y: player.y - 12 * W.dpr, w: 24 * W.dpr, h: 24 * W.dpr }, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) { b.x = -999; hitPlayer(); } });
  enemies.forEach(e => { if (rectHit({ x: player.x - 12 * W.dpr, y: player.y - 12 * W.dpr, w: 24 * W.dpr, h: 24 * W.dpr }, e)) hitPlayer(); });
  if (boss && rectHit({ x: player.x - 12 * W.dpr, y: player.y - 12 * W.dpr, w: 24 * W.dpr, h: 24 * W.dpr }, boss)) hitPlayer();

  if (Math.random() < 0.002) powerups.push({ x: W.w + 30, y: rand(W.h * 0.2, W.h * 0.75), kind: 'bomb', vx: -130 * W.dpr });
  powerups.forEach(p => p.x += p.vx * dt);
  powerups = powerups.filter(p => p.x > -40);
  powerups.forEach(p => { if (rectHit({ x: player.x - 12 * W.dpr, y: player.y - 12 * W.dpr, w: 24 * W.dpr, h: 24 * W.dpr }, { x: p.x - 10 * W.dpr, y: p.y - 10 * W.dpr, w: 20 * W.dpr, h: 20 * W.dpr })) { if (p.kind === 'bomb') bombs++; p.x = -999; statusEl.textContent = 'Bomb picked up'; }});

  score += dt * 2;
  if (Math.floor(levelTimer) % 10 === 0) statsEl.textContent = `Score ${Math.floor(score)} · Bombs ${bombs} · Level ${levelIndex + 1}`;
  if (flash > 0) flash = Math.max(0, flash - dt);
  if (bossHitFlash > 0) bossHitFlash = Math.max(0, bossHitFlash - dt);
  if (shake > 0) shake = Math.max(0, shake - 40 * dt);
}
function render(dt) {
  x.setTransform(1,0,0,1,0,0);
  x.clearRect(0,0,W.w,W.h);
  const ox = shake ? rand(-shake, shake) : 0;
  const oy = shake ? rand(-shake, shake) : 0;
  x.save();
  x.translate(ox, oy);
  drawBackground(dt);
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawParticles(dt);
  x.restore();

  if (flash > 0) { x.fillStyle = `rgba(255,255,255,${flash})`; x.fillRect(0,0,W.w,W.h); }
  if (bossHitFlash > 0) { x.fillStyle = `rgba(255,230,120,${bossHitFlash})`; x.fillRect(0,0,W.w,W.h); }
  if (!running) {
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0,0,W.w,W.h);
    x.fillStyle = '#fff'; x.font = `${18 * W.dpr}px system-ui`; x.fillText('Tap Start', W.w * 0.42, W.h * 0.84);
  }
}
function loop(ts) { if (!last) last = ts; const dt = Math.min(0.033, (ts - last) / 1000); last = ts; update(dt); render(dt); requestAnimationFrame(loop); }
function startGame() {
  overlay.classList.add('hidden');
  overlay.querySelector('h1').textContent = 'MarksSHMUP';
  overlay.querySelector('p').textContent = 'Arcade side-scroller, touch-friendly, 3 levels, enemies, bombs, boss fight.';
  startBtn.textContent = 'Start';
  score = 0; lives = 3; bombs = 3; player.inv = 1.2; running = true; resetLevel(0);
}
function bindHold(btn, onDown, onUp) {
  const start = e => { e.preventDefault(); onDown(); };
  const end = e => { e.preventDefault(); onUp && onUp(); };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointerleave', end);
  btn.addEventListener('pointercancel', end);
}
function bindTouchControls() {
  let left = false, right = false, fire = false;
  bindHold(leftBtn, () => { left = true; keys.KeyA = true; }, () => { left = false; keys.KeyA = false; });
  bindHold(rightBtn, () => { right = true; keys.KeyD = true; }, () => { right = false; keys.KeyD = false; });
  bindHold(fireBtn, () => { fire = true; keys.Space = true; }, () => { fire = false; keys.Space = false; });
  bombBtn.addEventListener('pointerdown', e => { e.preventDefault(); bomb(); });
}
window.addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyX') bomb(); });
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('resize', resize);
startBtn.addEventListener('click', startGame);
canvas.addEventListener('pointerdown', () => { if (!running) startGame(); });
canvas.addEventListener('pointermove', e => {
  if (!running) return;
  if (e.buttons) {
    const x0 = e.clientX * W.dpr;
    if (x0 < W.w * 0.33) keys.KeyA = true, keys.KeyD = false;
    else if (x0 > W.w * 0.67) keys.KeyD = true, keys.KeyA = false;
    else { keys.KeyA = false; keys.KeyD = false; }
    if (e.clientY * W.dpr < W.h * 0.55) keys.Space = true;
  }
});
canvas.addEventListener('pointerup', () => { keys.KeyA = false; keys.KeyD = false; keys.Space = false; });
bindTouchControls();
resize();
buildTerrain();
resetLevel(0);
requestAnimationFrame(loop);
