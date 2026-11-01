(() => {
 const section=document.querySelector('.arcade-arrival');
 const stage=document.querySelector('.arrival-stage');
 const studio=document.getElementById('studio');
 const room=document.querySelector('.room-console');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let pending=false;
 studio.tabIndex=0;
 studio.setAttribute('aria-label','Arcade clip studio. Scroll inside to view all controls and saved clips.');
 function draw(){
  pending=false;
  const p=reduced.matches?1:Math.max(0,Math.min(1,-section.getBoundingClientRect().top/Math.max(1,section.offsetHeight-innerHeight)));
  const reveal=Math.max(0,Math.min(1,(p-.38)/.32));
  stage.style.setProperty('--enter',p.toFixed(4));
  stage.style.setProperty('--title-events',p>.35?'none':'auto');
  stage.style.setProperty('--console-progress',reveal.toFixed(4));
  stage.style.setProperty('--console-opacity',Math.max(0,Math.min(1,(p-.43)/.17)).toFixed(4));
  stage.style.setProperty('--machine-opacity',Math.max(0,1-(p-.4)/.2).toFixed(4));
  stage.style.setProperty('--console-visible',p>.43?'visible':'hidden');
  stage.style.setProperty('--console-events',p>=.7?'auto':'none');
  room.inert=p<.7;
 }
 function queue(){if(!pending){pending=true;requestAnimationFrame(draw);}}
 function enter(target){
  if(target==='library'){document.dispatchEvent(new Event('open-reels'));return;}
  if(!reduced.matches){const top=section.getBoundingClientRect().top+scrollY;window.scrollTo({top:top+(section.offsetHeight-innerHeight)*.78,behavior:'instant'});}
  draw();
  studio.scrollTop=0;
  studio.focus({preventScroll:true});
 }
 document.querySelectorAll('a[href="#studio"],a[href="#library"]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();enter(link.hash.slice(1));}));
 addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);reduced.addEventListener('change',queue);draw();
 if(location.hash==='#studio')enter('studio');
 if(location.hash==='#library')document.dispatchEvent(new Event('open-reels'));
})();



