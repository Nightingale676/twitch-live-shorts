(() => {
 const drawer=document.getElementById('library');
 const close=document.getElementById('closeReels');
 const arcade=document.querySelector('.arcade-arrival');
 let previousFocus=null;
 function open(){
  if(drawer.classList.contains('is-open'))return;
  previousFocus=document.activeElement;
  drawer.inert=false;
  drawer.setAttribute('aria-hidden','false');
  drawer.classList.add('is-open');
  document.body.classList.add('reels-open');
  close.focus({preventScroll:true});
  document.dispatchEvent(new Event('reels-shown'));
 }
 function hide(){
  if(!drawer.classList.contains('is-open'))return;
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden','true');
  drawer.inert=true;
  document.body.classList.remove('reels-open');
  drawer.querySelectorAll('video').forEach(video=>video.pause());
  document.dispatchEvent(new Event('reels-hidden'));
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 }
 document.addEventListener('open-reels',open);
 close.addEventListener('click',hide);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drawer.classList.contains('is-open'))hide();});
 let startX=0,startY=0;
 let pointerX=0,pointerY=0,pointerStarted=false;
 arcade.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='mouse'||event.target.closest('a,button,video,canvas'))return;
  pointerX=event.clientX;pointerY=event.clientY;pointerStarted=true;
 });
 arcade.addEventListener('pointerup',event=>{
  if(!pointerStarted)return;
  pointerStarted=false;
  const dx=event.clientX-pointerX,dy=event.clientY-pointerY;
  if(dx>75&&Math.abs(dx)>Math.abs(dy)*1.4)open();
 });
 arcade.addEventListener('pointercancel',()=>{pointerStarted=false;});
 arcade.addEventListener('touchstart',event=>{if(event.touches.length!==1)return;startX=event.touches[0].clientX;startY=event.touches[0].clientY;},{passive:true});
 arcade.addEventListener('touchend',event=>{
  const dx=event.changedTouches[0].clientX-startX;
  const dy=event.changedTouches[0].clientY-startY;
  if(dx>70&&Math.abs(dx)>Math.abs(dy)*1.4)open();
 },{passive:true});
 drawer.addEventListener('touchstart',event=>{if(event.touches.length!==1)return;startX=event.touches[0].clientX;startY=event.touches[0].clientY;},{passive:true});
 drawer.addEventListener('touchend',event=>{
  if(event.target.closest('.reels-feed'))return;
  const dx=event.changedTouches[0].clientX-startX;
  const dy=event.changedTouches[0].clientY-startY;
  if(dx < -70&&Math.abs(dx)>Math.abs(dy)*1.4)hide();
 },{passive:true});
})();



