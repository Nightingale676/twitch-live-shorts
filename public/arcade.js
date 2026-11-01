(() => {
 const canvas = document.getElementById('arcadeCanvas');
 const ctx = canvas.getContext('2d');
 const overlay = document.getElementById('arcadeOverlay');
 const start = document.getElementById('arcadeStart');
 const pause = document.getElementById('arcadePause');
 const scoreLabel = document.getElementById('arcadeScore');
 const bestLabel = document.getElementById('arcadeLives');
 const ground = 211, dinoX = 100;
 let y = 0, velocity = 0, distance = 0, best = 0, obstacles = [], running = false, paused = false, last = 0, timer = 0, next = 1.6, raf = 0;
 try { best = Number(localStorage.getItem('dino-best')) || 0; } catch {}
 bestLabel.textContent = `BEST ${String(best).padStart(3,'0')}`;
 const sprite = ['000000111111','000000111111','000000110111','000000111111','000000111000','100001111000','110011111100','111111111010','011111110000','001111110000','000110110000','000110010000'];
 function draw() {
  ctx.clearRect(0,0,960,250);
  ctx.fillStyle='#302440';
  for(let i=0;i<25;i++){const x=(i*97-distance*.15)%1050;ctx.fillRect((x+1050)%1050,25+(i*31)%115,2,2);}
  ctx.fillStyle='#77618f';ctx.fillRect(0,ground+1,960,2);
  for(let i=0;i<30;i++){const x=((i*43-distance)%1050+1050)%1050;ctx.fillRect(x,ground+12+(i%3)*6,7,2);}
  ctx.fillStyle='#c3ff81';
  sprite.forEach((row,sy)=>[...row].forEach((pixel,sx)=>{if(pixel==='1')ctx.fillRect(dinoX+sx*4,ground-48+y+sy*4,4,4);}));
  if(running&&!paused&&y===0){ctx.fillStyle='#100b20';const foot=Math.floor(distance/25)%2;ctx.fillRect(dinoX+(foot?28:16),ground-7,8,7);}
  for(const o of obstacles){
   const top=ground-o.h;ctx.fillStyle='#c89be8';
   ctx.fillRect(o.x+o.w*.36,top,o.w*.28,o.h);
   ctx.fillRect(o.x,top+o.h*.27,o.w*.18,o.h*.35);
   ctx.fillRect(o.x,top+o.h*.54,o.w*.5,6);
   ctx.fillRect(o.x+o.w*.82,top+o.h*.12,o.w*.18,o.h*.4);
   ctx.fillRect(o.x+o.w*.5,top+o.h*.44,o.w*.5,6);
  }
 }
 function stopLoop(){cancelAnimationFrame(raf);raf=0;}
 function show(title, description, button){
  document.getElementById('arcadeMessage').textContent=title;
  document.getElementById('arcadeInstructions').textContent=description;
  start.textContent=button;overlay.hidden=false;
 }
 function finish(){
  running=false;stopLoop();canvas.classList.remove('playing');pause.disabled=true;
  const score=Math.floor(distance/35);best=Math.max(best,score);
  try{localStorage.setItem('dino-best',String(best));}catch{}
  bestLabel.textContent=`BEST ${String(best).padStart(3,'0')}`;
  show('GAME OVER',`Score ${score}. One more run?`,'RUN AGAIN ↗');
 }
 function jump(){if(running&&!paused&&y===0)velocity=-600;}
 function tick(time){
  if(!running||paused)return;
  const dt=Math.min((time-last)/1000,.035);last=time;
  const speed=310+Math.min(distance/150,230);distance+=speed*dt;timer+=dt;
  velocity+=1700*dt;y+=velocity*dt;
  if(y>=0){y=0;velocity=0;}
  if(timer>=next){timer=0;next=1.3+Math.random()*.7;obstacles.push({x:980,w:26+Math.random()*12,h:35+Math.random()*21});}
  for(const o of obstacles){
   o.x-=speed*dt;
   if(dinoX+39>o.x+4&&dinoX+8<o.x+o.w-4&&ground+y-4>ground-o.h+5&&ground-44+y<ground){draw();finish();return;}
  }
  obstacles=obstacles.filter(o=>o.x+o.w>0);
  scoreLabel.textContent=String(Math.floor(distance/35)).padStart(3,'0');
  draw();raf=requestAnimationFrame(tick);
 }
 function resume(){paused=false;overlay.hidden=true;pause.textContent='Pause';last=performance.now();canvas.classList.add('playing');canvas.focus({preventScroll:true});raf=requestAnimationFrame(tick);}
 function suspend(){if(!running||paused)return;paused=true;stopLoop();canvas.classList.remove('playing');pause.textContent='Resume';show('PAUSED','Your run is saved. Ready to keep going?','RESUME ↗');}
 function begin(){
  if(running&&paused){resume();return;}
  stopLoop();y=0;velocity=0;distance=0;obstacles=[];timer=0;next=1.6;running=true;scoreLabel.textContent='000';pause.disabled=false;resume();
 }
 start.addEventListener('click',begin);
 document.addEventListener('dino-start',()=>{if(!running||paused)begin();else canvas.focus({preventScroll:true});});
 document.addEventListener('dino-jump',()=>{if(!running||paused)begin();jump();});
 pause.addEventListener('click',()=>{if(paused)resume();else suspend();});
 canvas.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();if(!e.repeat){if(!running||paused)begin();jump();}}
  if(e.key==='Escape')suspend();
 });
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();if(!running||paused)begin();canvas.focus({preventScroll:true});jump();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
 addEventListener('blur',suspend);
 new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)suspend();},{threshold:0}).observe(canvas);
 draw();
})();


