(() => {
  const section = document.querySelector('.peel-section');
  const stage = document.querySelector('.peel-stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let queued = false;
  function paint() {
    queued = false;
    if (reduced.matches) return;
    const rect = section.getBoundingClientRect();
    const distance = Math.max(1, section.offsetHeight - innerHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / distance));
    stage.style.setProperty('--peel', progress.toFixed(4));
    stage.style.setProperty('--reveal', Math.max(0, Math.min(1, (progress - .25) / .4)).toFixed(4));
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  reduced.addEventListener('change', queue);
  paint();
})();

(() => {
 const hero = document.querySelector('.showcase');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let frame = 0;
 function update() {
  frame = 0;
  hero.style.setProperty('--hero-scroll', reduced.matches ? '0px' : `${Math.min(scrollY * .16, 130)}px`);
 }
 addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
 if (matchMedia('(pointer: fine)').matches) {
  hero.addEventListener('pointermove', e => {
   if (reduced.matches) return;
   const box = hero.getBoundingClientRect();
   hero.style.setProperty('--hero-x', `${(e.clientX / box.width - .5) * -12}px`);
   hero.style.setProperty('--hero-y', `${((e.clientY - box.top) / box.height - .5) * -8}px`);
  });
  hero.addEventListener('pointerleave', () => {
   hero.style.setProperty('--hero-x', '0px'); hero.style.setProperty('--hero-y', '0px');
  });
 }
 reduced.addEventListener('change', update);
 update();
})();

(() => {
 const section = document.querySelector('.reel-scroll');
 const reel = document.querySelector('.film-reel');
 const counter = document.getElementById('reelFrame');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let scheduled = false;
 function draw() {
  scheduled = false;
  if (reduced.matches) return;
  const progress = Math.max(0, Math.min(1, -section.getBoundingClientRect().top / Math.max(1, section.offsetHeight - innerHeight)));
  reel.style.setProperty('--reel-angle', `${-progress * 315}deg`);
  section.style.setProperty('--roll-progress', `${progress * 100}%`);
  counter.textContent = `${String(Math.round(progress * 7) + 1).padStart(2, '0')} / 08`;
 }
 function queue() { if (!scheduled) { scheduled = true; requestAnimationFrame(draw); } }
 addEventListener('scroll', queue, { passive:true });
 addEventListener('resize', queue);
 reduced.addEventListener('change', queue);
 draw();
})();
