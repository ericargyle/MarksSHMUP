const c = document.getElementById('game');
const x = c.getContext('2d');
const hud = document.getElementById('hud');

let dpr = 1, W = 0, H = 0;
let keys = {};
let pointer = { down: false, id: null, offsetX: 0, offsetY: 0 };
let ship = { x: 0, y: 0, w: 44, h: 26, speed: 220 };
let stars = [];
let started = false;

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
  if (!started) {
    ship.x = W * 0.5 - ship.w * 0.5;
    ship.y = H * 0.65;
  } else {
    ship.x = clamp(ship.x, 8 * dpr, W - ship.w - 8 * dpr);
    ship.y = clamp(ship.y, 8 * dpr, H - ship.h - 8 * dpr);
  }
  if (stars.length === 0) {
    for (let i = 0; i < 60; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 1, s: Math.random() * 0.35 + 0.1 });
  }
}

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function rect(x0,y0,w,h,c0){ x.fillStyle = c0; x.fillRect(x0,y0,w,h); }
function circle(x0,y0,r,c0){ x.fillStyle = c0; x.beginPath(); x.arc(x0,y0,r,0,Math.PI*2); x.fill(); }
function insideShip(px, py){ return px >= ship.x && px <= ship.x + ship.w && py >= ship.y && py <= ship.y + ship.h; }

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

function draw(){
  rect(0,0,W,H,'#08111f');
  stars.forEach(s => {
    s.x -= s.s * 120 * dpr / 60;
    if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
    circle(s.x, s.y, s.r * dpr, '#ffffff');
  });
  if (!started) {
    x.fillStyle = 'rgba(255,255,255,0.12)';
    x.fillRect(0,0,W,H);
    x.fillStyle = '#ffffff';
    x.font = `${18 * dpr}px system-ui`;
    x.fillText('Tap to start', 18 * dpr, 36 * dpr);
  }
  drawShip();
}

function update(dt){
  if (!started) return;
  let dx = 0, dy = 0;
  if (keys.KeyA || keys.ArrowLeft) dx -= 1;
  if (keys.KeyD || keys.ArrowRight) dx += 1;
  if (keys.KeyW || keys.ArrowUp) dy -= 1;
  if (keys.KeyS || keys.ArrowDown) dy += 1;
  const len = Math.hypot(dx, dy) || 1;
  ship.x += (dx / len) * ship.speed * dpr * dt;
  ship.y += (dy / len) * ship.speed * dpr * dt;
  ship.x = clamp(ship.x, 8 * dpr, W - ship.w - 8 * dpr);
  ship.y = clamp(ship.y, 8 * dpr, H - ship.h - 8 * dpr);
}

function loop(ts){
  if (!loop.last) loop.last = ts;
  const dt = Math.min(0.033, (ts - loop.last) / 1000);
  loop.last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

c.addEventListener('pointerdown', e => {
  const px = e.clientX * dpr;
  const py = e.clientY * dpr;
  if (!started) {
    started = true;
    resize();
    return;
  }
  if (insideShip(px, py)) {
    pointer.down = true;
    pointer.id = e.pointerId;
    pointer.offsetX = px - ship.x;
    pointer.offsetY = py - ship.y;
    c.setPointerCapture(e.pointerId);
  }
});
c.addEventListener('pointermove', e => {
  if (!pointer.down || pointer.id !== e.pointerId) return;
  const px = e.clientX * dpr;
  const py = e.clientY * dpr;
  ship.x = clamp(px - pointer.offsetX, 8 * dpr, W - ship.w - 8 * dpr);
  ship.y = clamp(py - pointer.offsetY, 8 * dpr, H - ship.h - 8 * dpr);
});
c.addEventListener('pointerup', e => {
  if (pointer.id === e.pointerId) {
    pointer.down = false;
    pointer.id = null;
  }
});
c.addEventListener('pointercancel', () => { pointer.down = false; pointer.id = null; });
window.addEventListener('keydown', e => { started = true; keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('resize', resize);

resize();
hud.textContent = 'WASD or touch the ship to move.';
requestAnimationFrame(loop);
