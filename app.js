const c = document.getElementById('game');
const x = c.getContext('2d');
const hud = document.getElementById('hud');
const footnote = document.getElementById('footnote');

let dpr = 1, W = 0, H = 0;
let started = false;
let keys = {};
let ship = { x: 0, y: 0, w: 44, h: 26, speed: 260 };
let stars = [];
let bullets = [];
let fireCooldown = 0;

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

function draw(){
  rect(0,0,W,H,'#08111f');
  stars.forEach(s => {
    s.x -= s.s * 120 * dpr / 60;
    if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
    circle(s.x, s.y, s.r * dpr, '#ffffff');
  });
  drawBullets();
  drawShip();
  if (!started) {
    x.fillStyle = 'rgba(255,255,255,0.12)';
    x.fillRect(0,0,W,H);
    x.fillStyle = '#ffffff';
    x.font = `${18 * dpr}px system-ui`;
    x.fillText('Press a key or click to start', 18 * dpr, 36 * dpr);
  }
}

function update(dt){
  if (!started) return;
  fireCooldown = Math.max(0, fireCooldown - dt);

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

  bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
  bullets = bullets.filter(b => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
}

function shoot(vx, vy){
  if (fireCooldown > 0) return;
  const speed = 520 * dpr;
  bullets.push({
    x: ship.x + ship.w * 0.5,
    y: ship.y + ship.h * 0.5,
    vx: vx * speed,
    vy: vy * speed,
  });
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

c.addEventListener('pointerdown', () => { started = true; });
window.addEventListener('keydown', e => { started = true; keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('resize', resize);

resize();
ship.x = W * 0.5 - ship.w * 0.5;
ship.y = H * 0.65;
const now = new Date();
const stamp = now.toLocaleString('en-US', { timeZone: 'America/Chicago', hour12: true });
footnote.textContent = `Synced ${stamp} CST`;
requestAnimationFrame(loop);
