(() => {
 const scene=document.querySelector('.cabinet-scene');
 const cabinet=document.querySelector('.arcade-cabinet');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function tilt(e){
  if(reduced.matches || e.target.closest('canvas,button'))return;
  if(e.pointerType!=='mouse'&&!scene.hasPointerCapture(e.pointerId))return;
  const r=scene.getBoundingClientRect();
  cabinet.style.setProperty('--cab-y',`${Math.max(-23,Math.min(23,(e.clientX-r.left-r.width/2)/r.width*38))}deg`);
  cabinet.style.setProperty('--cab-x',`${Math.max(-8,Math.min(7,-(e.clientY-r.top-r.height/2)/r.height*13))}deg`);
 }
 scene.addEventListener('pointermove',tilt);
 scene.addEventListener('pointerdown',e=>{if(!e.target.closest('canvas,button,a')){scene.setPointerCapture(e.pointerId);tilt(e);}});
 scene.addEventListener('pointerleave',()=>{cabinet.style.setProperty('--cab-y','-13deg');cabinet.style.setProperty('--cab-x','-3deg');});
 document.getElementById('cabinetStart').addEventListener('click',()=>document.dispatchEvent(new Event('dino-start')));
 for(const id of ['cabinetJump','cabinetAction'])document.getElementById(id).addEventListener('click',()=>document.dispatchEvent(new Event('dino-jump')));
})();
