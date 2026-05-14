const c = document.getElementById('game');
const x = c.getContext('2d');
const statusEl = document.getElementById('status');
const statsEl = document.getElementById('stats');
const bombBtn = document.getElementById('bombBtn');
const laserBtn = document.getElementById('laserBtn');

const d = { w: 0, h: 0, s: 1 };
let running = true, last = 0, score = 0, bombs = 3, level = 1;
let started = false;
let autoFire = false;
let player = { x: 120, y: 260, w: 34, h: 22, vx: 0, vy: 0, dragging: false, dragDX: 0, dragDY: 0, inv: 0 };
let bullets = [], eBullets = [], enemies = [], particles = [], boss = null, terrain = [];
let laserHeat = 0, spawnTimer = 0, terrainScroll = 0, bossTimer = 0;
let keys = {};

function resize(){ d.s = Math.min(window.devicePixelRatio || 1, 2); d.w = c.width = Math.floor(innerWidth * d.s); d.h = c.height = Math.floor(innerHeight * d.s); c.style.width='100vw'; c.style.height='100vh'; }
function sx(v){ return v * d.s; }
function sy(v){ return v * d.s; }
function rect(x0,y0,w,h,c0){ x.fillStyle=c0; x.fillRect(x0,y0,w,h); }
function circle(x0,y0,r,c0){ x.fillStyle=c0; x.beginPath(); x.arc(x0,y0,r,0,Math.PI*2); x.fill(); }
function line(x1,y1,x2,y2,c0,w=3){ x.strokeStyle=c0; x.lineWidth=w; x.beginPath(); x.moveTo(x1,y1); x.lineTo(x2,y2); x.stroke(); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function rand(a,b){ return Math.random()*(b-a)+a; }
function boxOverlap(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }

function buildTerrain(){
  terrain = [];
  for(let i=0;i<35;i++) terrain.push({ x: rand(0,2200), y: rand(0.1,0.9), kind: i%7===0 ? 'rock':'tree', s: rand(0.6,1.35) });
}
function reset(){
  bullets=[]; eBullets=[]; enemies=[]; particles=[]; boss=null; laserHeat=0; spawnTimer=0.2; bossTimer=0; terrainScroll=0; score=0; bombs=3; level=1;
  player = { x: 110*d.s, y: d.h*0.55, w: 34*d.s, h: 22*d.s, vx: 0, vy: 0, dragging: false, dragDX: 0, dragDY: 0, inv: 1.0 };
  for(let i=0;i<5;i++) enemies.push(makeEnemy(true));
  statusEl.textContent = 'Touch ship and drag. Use BOMB / LASER.';
  updateHud();
}
function updateHud(){ statsEl.textContent = `Score ${Math.floor(score)} · Bombs ${bombs} · Level ${level}`; statusEl.textContent = !started ? 'Tap play to start, then drag ship.' : (running ? (boss ? 'Boss fight!' : 'Touch ship and drag. Use BOMB / LASER.') : 'You win! Tap to restart.'); }
function makeEnemy(offscreen=false){
  const y = rand(d.h*0.12, d.h*0.82);
  const kind = Math.random() < 0.5 ? 'drone' : (Math.random() < 0.8 ? 'swoop' : 'turret');
  return { kind, x: offscreen ? d.w + rand(0,500) : d.w + 60, y, w: 28*d.s, h: 18*d.s, hp: kind==='turret' ? 3 : 1, vx: rand(-120,-220)*d.s, vy: kind==='swoop' ? rand(-50,50)*d.s : 0, fire: rand(0.5,2.0) };
}
function spawnBoss(){
  boss = { x: d.w + 180, y: d.h*0.24, w: 160*d.s, h: 90*d.s, hp: 40 + (level-1)*10, maxHp: 40 + (level-1)*10, vx: -60*d.s, fire: 0.7 };
  statusEl.textContent = 'Boss approaching!';
}
function puff(x0,y0,c0){ for(let i=0;i<12;i++) particles.push({x:x0,y:y0,vx:rand(-180,180)*d.s,vy:rand(-180,180)*d.s,life:rand(0.18,0.45),c:c0}); }
function fireLaser(){
  if (laserHeat > 0) return;
  bullets.push({ x: player.x + player.w, y: player.y + player.h/2, w: 24*d.s, h: 4*d.s, vx: 720*d.s, dmg: 1, laser: true });
  laserHeat = 0.12;
}
function bomb(){
  if (bombs <= 0) return;
  bombs--;
  enemies.forEach(e => { e.hp = 0; score += 25; puff(e.x,e.y,'#fff0a6'); });
  if (boss) boss.hp -= 8;
  eBullets = [];
  puff(player.x, player.y, '#ffffff');
  updateHud();
}
function pointInPlayer(mx,my){ return mx > player.x-10*d.s && mx < player.x+player.w+12*d.s && my > player.y-12*d.s && my < player.y+player.h+12*d.s; }

function drawBackground(dt){
  terrainScroll += 110*d.s*dt;
  const sky = x.createLinearGradient(0,0,0,d.h);
  sky.addColorStop(0,'#17335a');
  sky.addColorStop(1,'#08111f');
  x.fillStyle = sky; x.fillRect(0,0,d.w,d.h);
  rect(0,d.h*0.78,d.w,d.h*0.22, level===2 ? '#35457a' : level===3 ? '#4b241c' : '#1f5b2f');
  rect(0,0,d.w,sy(2),'#ffffff');

  x.save();
  x.translate(-terrainScroll % sx(220), 0);
  for(let i=0;i<18;i++){
    const mx = sx(i*220 + 120);
    const base = d.h*0.78;
    x.fillStyle = level===2 ? '#e8f5ff' : level===3 ? '#9d3927' : '#3a7b41';
    x.beginPath();
    x.moveTo(mx, base);
    x.lineTo(mx+sx(70), base - sx(50 + (i%3)*25));
    x.lineTo(mx+sx(140), base);
    x.closePath();
    x.fill();
  }
  x.restore();

  terrain.forEach(t => {
    const px = ((t.x*0.65 - terrainScroll*0.25) % (d.w + sx(120))) - sx(60);
    if (t.kind === 'tree') {
      rect(px, d.h*0.75, sx(10*t.s), sx(22*t.s), '#5b3a1d');
      circle(px+sx(5*t.s), d.h*0.74, sx(12*t.s), level===2 ? '#f2fbff' : level===3 ? '#ff7035' : '#2e8d3d');
    } else {
      circle(px, d.h*0.8, sx(5*t.s), level===2 ? '#d9efff' : level===3 ? '#b85439' : '#6aa84f');
    }
  });
}

function drawPlayer(){
  x.save();
  if (player.inv > 0 && Math.floor(performance.now()/60)%2===0) x.globalAlpha = 0.35;
  rect(player.x, player.y, player.w, player.h, '#5fd3ff');
  rect(player.x+3*d.s, player.y+4*d.s, player.w-8*d.s, player.h-8*d.s, '#d8f8ff');
  circle(player.x+player.w+8*d.s, player.y+player.h/2, 8*d.s, '#ffd25d');
  line(player.x-10*d.s, player.y+2*d.s, player.x-22*d.s, player.y+10*d.s, '#c9d8ff', 4*d.s);
  x.restore();
}
function drawEnemy(e){
  if (e.kind==='drone') { rect(e.x,e.y,e.w,e.h,'#ff617f'); circle(e.x+e.w*0.8,e.y+e.h/2,4*d.s,'#fff'); }
  if (e.kind==='swoop') { rect(e.x,e.y,e.w,e.h,'#ffa43d'); circle(e.x+e.w/2,e.y+e.h/2,5*d.s,'#2a0'); }
  if (e.kind==='turret') { rect(e.x,e.y,e.w,e.h,'#a06dff'); rect(e.x+4*d.s,e.y-6*d.s,e.w-8*d.s,8*d.s,'#dac7ff'); }
  if (e.hp>1) rect(e.x,e.y-5*d.s,e.w*0.65,3*d.s,'#000');
}
function drawBoss(){ if(!boss) return; rect(boss.x,boss.y,boss.w,boss.h,'#cf3b3b'); rect(boss.x+14*d.s,boss.y+14*d.s,boss.w-28*d.s,boss.h-28*d.s,'#731919'); circle(boss.x+boss.w-24*d.s,boss.y+boss.h/2,18*d.s,'#ffd64d'); rect(boss.x,boss.y-10*d.s,boss.w*(boss.hp/boss.maxHp),5*d.s,'#45ff99'); }
function drawBullets(){ bullets.forEach(b=> b.laser ? rect(b.x,b.y,b.w,b.h,'#f7ff8a') : circle(b.x,b.y,4*d.s,'#fff6d8')); eBullets.forEach(b=>circle(b.x,b.y,4*d.s,'#ffcb74')); }
function drawParticles(){ particles = particles.filter(p => (p.life -= 0.016) > 0); particles.forEach(p => { p.x += p.vx*0.016; p.y += p.vy*0.016; p.vy += 240*0.016; x.globalAlpha = Math.max(0, p.life/0.45); circle(p.x,p.y,3*d.s,p.c); x.globalAlpha = 1; }); }

function update(dt){
  if (!running) return;
  player.inv = Math.max(0, player.inv - dt);
  laserHeat = Math.max(0, laserHeat - dt);
  spawnTimer -= dt;
  bossTimer += dt;
  score += dt*2;

  if (!player.dragging) {
    let ax = 0, ay = 0;
    if (keys.KeyA || keys.ArrowLeft) ax -= 1;
    if (keys.KeyD || keys.ArrowRight) ax += 1;
    if (keys.KeyW || keys.ArrowUp) ay -= 1;
    if (keys.KeyS || keys.ArrowDown) ay += 1;
    player.x += ax * 260 * d.s * dt;
    player.y += ay * 260 * d.s * dt;
  }
  player.x = clamp(player.x, sx(14), d.w*0.42);
  player.y = clamp(player.y, sy(30), d.h - sy(44));

  if (spawnTimer <= 0 && !boss) { enemies.push(makeEnemy()); spawnTimer = rand(0.45, 1.0); }
  if (!boss && bossTimer > 24) spawnBoss();

  bullets.forEach(b => b.x += b.vx*dt);
  bullets = bullets.filter(b => b.x < d.w + 60);

  eBullets.forEach(b => { b.x += b.vx*dt; b.y += b.vy*dt; });
  eBullets = eBullets.filter(b => b.x > -60 && b.y > -60 && b.y < d.h+60);

  enemies.forEach(e => {
    e.x += e.vx*dt;
    e.y += e.vy*dt;
    e.vy *= 0.99;
    e.fire -= dt;
    if (e.fire <= 0 && e.kind !== 'swoop') { eBullets.push({x:e.x,y:e.y+e.h/2,vx:-270*d.s,vy:0,r:4*d.s}); e.fire = rand(0.9,1.8); }
  });

  if (boss) {
    boss.x += boss.vx*dt;
    boss.y += Math.sin(bossTimer*2) * 40 * dt;
    boss.fire -= dt;
    if (boss.fire <= 0) {
      for (let i=-2;i<=2;i++) eBullets.push({x:boss.x+12*d.s,y:boss.y+boss.h/2+i*12*d.s,vx:-320*d.s,vy:i*28*d.s,r:5*d.s});
      boss.fire = 0.55;
    }
    if (boss.x < d.w*0.58) boss.vx = 0;
  }

  bullets.forEach(b => {
    enemies.forEach(e => {
      if (e.hp > 0 && boxOverlap({x:b.x,y:b.y,w:b.w||6*d.s,h:b.h||6*d.s}, e)) { e.hp--; b.x = d.w + 99; score += 60; puff(e.x,e.y,'#fff0a6'); }
    });
    if (boss && boxOverlap({x:b.x,y:b.y,w:b.w||6*d.s,h:b.h||6*d.s}, boss)) { boss.hp--; b.x = d.w + 99; score += 90; puff(boss.x + rand(0,boss.w), boss.y + rand(0,boss.h), '#ffd17a'); if (boss.hp <= 0) { score += 1000; puff(boss.x+boss.w/2,boss.y+boss.h/2,'#ffffff'); boss = null; if (level < 3) { level++; resetLevel(level-1); bossTimer = 0; } else { running = false; statusEl.textContent = 'You win! Tap to restart.'; } } }
  });

  eBullets.forEach(b => { if (boxOverlap({x:player.x,y:player.y,w:player.w,h:player.h}, {x:b.x,y:b.y,w:8*d.s,h:8*d.s})) { b.x=-999; if (player.inv===0) { player.inv = 1.0; score = Math.max(0, score - 100); } } });
  enemies.forEach(e => { if (boxOverlap({x:player.x,y:player.y,w:player.w,h:player.h}, e) && player.inv===0) { player.inv = 1.0; score = Math.max(0, score - 150); puff(player.x,player.y,'#fff'); } });
  if (boss && boxOverlap({x:player.x,y:player.y,w:player.w,h:player.h}, boss) && player.inv===0) { player.inv = 1.0; score = Math.max(0, score - 200); }

  enemies = enemies.filter(e => e.hp > 0 && e.x > -120);
  if (enemies.length < 6 && !boss) enemies.push(makeEnemy());
  particles = particles.filter(p => p.life > 0);
  updateHud();
}

function render(dt){
  x.setTransform(1,0,0,1,0,0);
  x.clearRect(0,0,d.w,d.h);
  drawBackground(dt);
  drawBullets();
  enemies.forEach(drawEnemy);
  drawBoss();
  drawPlayer();
  drawParticles();
  x.fillStyle='#fff'; x.font=`${14*d.s}px system-ui`;
  x.fillText(`player ${Math.floor(player.x)},${Math.floor(player.y)}`, sx(16), sy(56));
  if (!started) {
    x.fillStyle='rgba(0,0,0,.45)'; x.fillRect(0,0,d.w,d.h);
    x.fillStyle='#fff'; x.font=`${18*d.s}px system-ui`; x.fillText('Tap to start', sx(18), sy(36));
  } else if (!running) { x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(0,0,d.w,d.h); }
}
function loop(ts){ if(!last) last = ts; const dt = Math.min(0.033,(ts-last)/1000); last = ts; update(dt); render(dt); requestAnimationFrame(loop); }

function startGame(){ started = true; running = true; overlay.classList.add('hidden'); score = 0; bombs = 3; level = 1; player.inv = 1; bossTimer = 0; reset(); }

canvas.addEventListener('pointerdown', e => {
  if (!started) return startGame();
  if (!running) return startGame();
  const mx = e.clientX * d.s, my = e.clientY * d.s;
  if (pointInPlayer(mx,my)) { player.dragging = true; player.dragDX = mx - player.x; player.dragDY = my - player.y; }
  else if (mx < d.w * 0.33) keys.KeyA = true;
  else if (mx > d.w * 0.67) keys.KeyD = true;
});
canvas.addEventListener('pointermove', e => {
  if (!player.dragging) return;
  const mx = e.clientX * d.s, my = e.clientY * d.s;
  player.x = clamp(mx - player.dragDX, sx(14), d.w*0.42);
  player.y = clamp(my - player.dragDY, sy(30), d.h - sy(44));
});
canvas.addEventListener('pointerup', () => { player.dragging = false; keys.KeyA=false; keys.KeyD=false; });
canvas.addEventListener('pointercancel', () => { player.dragging = false; keys.KeyA=false; keys.KeyD=false; });

bombBtn.addEventListener('click', e => { e.stopPropagation(); if (started) bomb(); });
laserBtn.addEventListener('click', e => { e.stopPropagation(); if (started) fireLaser(); });
window.addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyX') bomb(); if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') fireLaser(); });
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('resize', resize);
resize(); buildTerrain(); reset(); updateHud(); requestAnimationFrame(loop);
