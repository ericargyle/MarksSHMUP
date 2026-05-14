const c = document.getElementById('game');
const x = c.getContext('2d');
const statusEl = document.getElementById('status');
const statsEl = document.getElementById('stats');
const bombBtn = document.getElementById('bombBtn');
const laserBtn = document.getElementById('laserBtn');

let W=0,H=0,dpr=1;
let started=false,last=0,score=0,bombs=3,level=1,shake=0,flash=0;
let player={x:0,y:0,w:42,h:26,dragging:false,dx:0,dy:0,inv:0};
let bullets=[],enemies=[],particles=[],boss=null,keys={},fireCd=0,spawnCd=0,terrainScroll=0,bossT=0;
const levelBg=['#14304f','#d9f0ff','#89c4ff'];

function resize(){ dpr=Math.min(window.devicePixelRatio||1,2); W=c.width=Math.floor(innerWidth*dpr); H=c.height=Math.floor(innerHeight*dpr); c.style.width='100vw'; c.style.height='100vh'; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function rand(a,b){ return Math.random()*(b-a)+a; }
function rect(x0,y0,w,h,c0){ x.fillStyle=c0; x.fillRect(x0,y0,w,h); }
function circle(x0,y0,r,c0){ x.fillStyle=c0; x.beginPath(); x.arc(x0,y0,r,0,Math.PI*2); x.fill(); }
function line(x1,y1,x2,y2,c0,w=3){ x.strokeStyle=c0; x.lineWidth=w; x.beginPath(); x.moveTo(x1,y1); x.lineTo(x2,y2); x.stroke(); }
function overlap(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }
function updateHud(){ statusEl.textContent = started ? (boss ? 'Boss fight!' : 'Drag ship, use Laser or Bomb.') : 'Tap screen to start.'; statsEl.textContent = `Score ${Math.floor(score)} · Bombs ${bombs} · Level ${level}`; }
function resetGame(){ bullets=[]; enemies=[]; particles=[]; boss=null; score=0; bombs=3; level=1; fireCd=0; spawnCd=0.4; terrainScroll=0; bossT=0; flash=0; shake=0; player={x:W*0.18||80*dpr,y:H*0.62||240*dpr,w:42*dpr,h:26*dpr,dragging:false,dx:0,dy:0,inv:1.2}; for(let i=0;i<6;i++) enemies.push(spawnEnemy(true)); updateHud(); }
function spawnEnemy(off=true){ return { x:(off?W+rand(0,400):W+40), y:rand(H*0.14,H*0.82), w:26*dpr, h:18*dpr, hp:1+ (Math.random()<0.2), vx:rand(-170,-250)*dpr, vy:rand(-30,30)*dpr, fire:rand(0.8,1.8), kind:Math.random()<0.6?'drone':(Math.random()<0.8?'swoop':'turret') }; }
function spawnBoss(){ boss={x:W+200,y:H*0.24,w:170*dpr,h:100*dpr,hp:40*level,maxHp:40*level,vx:-70*dpr,fire:0.7}; }
function puff(x0,y0,c0){ for(let i=0;i<10;i++) particles.push({x:x0,y:y0,vx:rand(-180,180)*dpr,vy:rand(-180,180)*dpr,life:rand(0.15,0.5),c:c0}); }
function fireLaser(){ if(fireCd>0) return; bullets.push({x:player.x+player.w,y:player.y+player.h/2,w:30*dpr,h:5*dpr,vx:880*dpr,laser:true}); fireCd=0.12; }
function bomb(){ if(!bombs) return; bombs--; enemies.forEach(e=>{e.hp=0; puff(e.x,e.y,'#fff1a8'); score+=30;}); if(boss) boss.hp-=10; bullets=[]; updateHud(); }
function pointInPlayer(mx,my){ return mx>player.x-10*dpr && mx<player.x+player.w+14*dpr && my>player.y-10*dpr && my<player.y+player.h+14*dpr; }

function drawBg(dt){ terrainScroll += 120*dpr*dt; rect(0,0,W,H,'#08111f'); rect(0,H*0.78,W,H*0.22, level===2 ? '#cfeaff' : level===3 ? '#8b3a2a' : '#2d7d3a'); x.save(); x.translate(-(terrainScroll%(240*dpr)),0); for(let i=0;i<8;i++){ let mx=i*260*dpr; let by=H*0.78; x.fillStyle=level===2?'#eaf6ff':level===3?'#ff8b5b':'#3f8b43'; x.beginPath(); x.moveTo(mx,by); x.lineTo(mx+80*dpr,by-50*dpr); x.lineTo(mx+160*dpr,by); x.fill(); } x.restore(); for(let i=0;i<24;i++){ let px=((i*160*dpr)-(terrainScroll*0.4))%(W+160*dpr)-80*dpr; if(i%5===0){ rect(px,H*0.74,10*dpr,24*dpr,'#5c3a1c'); circle(px+5*dpr,H*0.73,12*dpr,level===2?'#f5fbff':level===3?'#ff6d3a':'#2f8a33'); } else { circle(px,H*0.8,4*dpr,level===2?'#d7e8f5':level===3?'#c15436':'#74b15f'); } } rect(0,0,W,2*dpr,'#ffffff'); }
function drawPlayer(){ x.save(); if(player.inv>0 && Math.floor(performance.now()/80)%2===0) x.globalAlpha=.35; rect(player.x,player.y,player.w,player.h,'#49d9ff'); rect(player.x+4*dpr,player.y+4*dpr,player.w-8*dpr,player.h-8*dpr,'#effcff'); circle(player.x+player.w+10*dpr,player.y+player.h/2,8*dpr,'#ffd35d'); line(player.x-8*dpr,player.y+4*dpr,player.x-20*dpr,player.y+12*dpr,'#d4dcff',4*dpr); x.restore(); }
function drawEnemy(e){ if(e.kind==='drone'){ rect(e.x,e.y,e.w,e.h,'#ff5b7e'); circle(e.x+e.w*0.8,e.y+e.h/2,4*dpr,'#fff'); } else if(e.kind==='swoop'){ rect(e.x,e.y,e.w,e.h,'#ffa73b'); } else { rect(e.x,e.y,e.w,e.h,'#9a65ff'); rect(e.x+4*dpr,e.y-6*dpr,e.w-8*dpr,8*dpr,'#dac7ff'); } }
function drawBoss(){ if(!boss) return; rect(boss.x,boss.y,boss.w,boss.h,'#cf2d2d'); rect(boss.x+16*dpr,boss.y+16*dpr,boss.w-32*dpr,boss.h-32*dpr,'#6e1717'); circle(boss.x+boss.w-26*dpr,boss.y+boss.h/2,16*dpr,'#ffd24d'); rect(boss.x,boss.y-10*dpr,boss.w*(boss.hp/boss.maxHp),5*dpr,'#44ff99'); }
function drawBullets(){ bullets.forEach(b=> b.laser ? rect(b.x,b.y,b.w,b.h,'#f6ff85') : circle(b.x,b.y,4*dpr,'#fff8df')); }
function drawParticles(){ particles=particles.filter(p=> (p.life-=0.016)>0); particles.forEach(p=>{ p.x+=p.vx*0.016; p.y+=p.vy*0.016; p.vy+=180*0.016; x.globalAlpha=Math.max(0,p.life/0.5); circle(p.x,p.y,3*dpr,p.c); x.globalAlpha=1; }); }
function update(dt){ if(!started) return; fireCd=Math.max(0,fireCd-dt); player.inv=Math.max(0,player.inv-dt); spawnCd-=dt; bossT+=dt; score+=dt*2; if(!player.dragging){ let ax=0,ay=0; if(keys.KeyA||keys.ArrowLeft) ax-=1; if(keys.KeyD||keys.ArrowRight) ax+=1; if(keys.KeyW||keys.ArrowUp) ay-=1; if(keys.KeyS||keys.ArrowDown) ay+=1; player.x += ax*280*dpr*dt; player.y += ay*280*dpr*dt; } player.x=clamp(player.x,16*dpr,W*0.42); player.y=clamp(player.y,30*dpr,H-40*dpr); if(spawnCd<=0 && !boss){ enemies.push(spawnEnemy()); spawnCd=rand(0.35,0.8); } if(!boss && bossT>10) spawnBoss(); bullets.forEach(b=> b.x += b.vx*dt); bullets = bullets.filter(b=> b.x < W+80); enemies.forEach(e=>{ e.x += e.vx*dt; e.y += e.vy*dt; e.fire -= dt; if(e.fire<=0 && e.kind!=='swoop'){ e.fire = rand(0.7,1.2); eBullets.push({x:e.x,y:e.y+e.h/2,w:8*dpr,h:8*dpr,vx:-240*dpr,vy:0,r:4*dpr}); } }); if(boss){ boss.x += boss.vx*dt; boss.y += Math.sin(bossT*2)*20*dt; boss.fire -= dt; if(boss.fire<=0){ for(let i=-2;i<=2;i++) eBullets.push({x:boss.x+14*dpr,y:boss.y+boss.h/2+i*12*dpr,w:8*dpr,h:8*dpr,vx:-260*dpr,vy:i*20*dpr,r:5*dpr}); boss.fire=.5; } }
  bullets.forEach(b=>{ enemies.forEach(e=>{ if(e.hp>0 && overlap({x:b.x,y:b.y,w:b.w,h:b.h},{x:e.x,y:e.y,w:e.w,h:e.h})){ e.hp=0; b.x=W+999; score+=60; puff(e.x,e.y,'#fff0a6'); } }); if(boss && overlap({x:b.x,y:b.y,w:b.w,h:b.h},boss)){ boss.hp--; b.x=W+999; score+=80; puff(boss.x,boss.y,'#ffd17a'); if(boss.hp<=0){ score+=1000; puff(boss.x+boss.w/2,boss.y+boss.h/2,'#fff'); boss=null; if(level<3){ level++; resetGame(); bossT=0; } else { started=false; running=false; statusEl.textContent='You win! Tap to play again.'; } } } });
  eBullets.forEach(b=>{ if(overlap({x:player.x,y:player.y,w:player.w,h:player.h},{x:b.x,y:b.y,w:b.w,h:b.h}) && player.inv<=0){ player.inv=1; score=Math.max(0,score-120); b.x=-999; } });
  enemies.forEach(e=>{ if(e.hp<=0) return; if(overlap({x:player.x,y:player.y,w:player.w,h:player.h},{x:e.x,y:e.y,w:e.w,h:e.h}) && player.inv<=0){ player.inv=1; score=Math.max(0,score-120); puff(player.x,player.y,'#fff'); } });
  if(boss && overlap({x:player.x,y:player.y,w:player.w,h:player.h},boss) && player.inv<=0){ player.inv=1; score=Math.max(0,score-180); }
  enemies = enemies.filter(e=>e.x>-120 && e.hp>0); while(enemies.length<7 && !boss) enemies.push(spawnEnemy());
  updateHud(); }
function render(dt){ x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,W,H); drawBg(dt); drawBullets(); enemies.forEach(drawEnemy); drawBoss(); drawPlayer(); drawParticles(); x.fillStyle='#fff'; x.font=`${12*dpr}px system-ui`; x.fillText(`player ${Math.floor(player.x)},${Math.floor(player.y)}`, 16*dpr, 54*dpr); if(!started){ x.fillStyle='rgba(0,0,0,.45)'; x.fillRect(0,0,W,H); x.fillStyle='#fff'; x.font=`${18*dpr}px system-ui`; x.fillText('Tap to start', 18*dpr, 36*dpr); } }
function loop(ts){ if(!last) last=ts; const dt=Math.min(.033,(ts-last)/1000); last=ts; update(dt); render(dt); requestAnimationFrame(loop); }
function startGame(){ started=true; running=true; resetGame(); }
canvas.addEventListener('pointerdown', e=>{ const mx=e.clientX*dpr,my=e.clientY*dpr; if(!started) return startGame(); if(pointInPlayer(mx,my)){ player.dragging=true; player.dx=mx-player.x; player.dy=my-player.y; } else if(mx< W*0.33){ keys.KeyA=true; } else if(mx>W*0.67){ keys.KeyD=true; } });
canvas.addEventListener('pointermove', e=>{ if(!player.dragging) return; const mx=e.clientX*dpr,my=e.clientY*dpr; player.x=clamp(mx-player.dx,16*dpr,W*0.42); player.y=clamp(my-player.dy,30*dpr,H-40*dpr); });
canvas.addEventListener('pointerup', ()=>{ player.dragging=false; keys.KeyA=false; keys.KeyD=false; });
canvas.addEventListener('pointercancel', ()=>{ player.dragging=false; keys.KeyA=false; keys.KeyD=false; });
bombBtn.addEventListener('click', e=>{ e.stopPropagation(); if(started) bomb(); });
laserBtn.addEventListener('click', e=>{ e.stopPropagation(); if(started) fireLaser(); });
window.addEventListener('keydown', e=>{ keys[e.code]=true; if(e.code==='Space'||e.code==='KeyZ'||e.code==='Enter') fireLaser(); if(e.code==='KeyX') bomb(); });
window.addEventListener('keyup', e=>{ keys[e.code]=false; });
window.addEventListener('resize', resize);
resize(); resetGame(); updateHud(); requestAnimationFrame(loop);
