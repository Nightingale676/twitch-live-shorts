(() => {
 const host=document.getElementById('clips');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const storageKey='stream-clips-liked-v1';
 const common=new Set(['the','and','for','with','that','this','from','your','into','just','clip','short','stream','moment','highlight','epic','best','great','video','game']);
 let liked=new Set(),mode='for-you',source=[],active=null,cleanup=()=>{},feedOpen=false;
 try {const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))liked=new Set(saved.filter(x=>typeof x==='string'));}catch{}
 function words(title){return new Set((title||'').toLowerCase().match(/[a-z0-9]{3,}/g)?.filter(word=>!common.has(word))||[]);}
 function ordered(){
  if(mode==='latest'||liked.size===0)return [...source];
  const likedWords=[...source].filter(clip=>liked.has(clip.name)).flatMap(clip=>[...words(clip.title),...(clip.gameId?[`game:${clip.gameId}`]:[])]);
  const weight=new Map();for(const word of likedWords)weight.set(word,(weight.get(word)||0)+1);
  return [...source].sort((a,b)=>{
   const score=clip=>(liked.has(clip.name)?20:0)+[...words(clip.title),...(clip.gameId?[`game:${clip.gameId}`]:[])].reduce((sum,word)=>sum+(weight.get(word)||0)*(word.startsWith('game:')?14:8),0);
   return score(b)-score(a)||new Date(b.createdAt)-new Date(a.createdAt);
  });
 }
 function pauseAll(except){const keepCard=except?.closest?.('.reel')||((except?.classList?.contains('reel'))?except:null);host.querySelectorAll('video').forEach(video=>{if(video!==except)video.pause();});host.querySelectorAll('.twitch-player').forEach(frame=>{if(frame.closest('.reel')!==keepCard){const media=frame.parentElement;frame.remove();media?.querySelector('.twitch-play')?.removeAttribute('hidden');}});}
 function saveLikes(){try{localStorage.setItem(storageKey,JSON.stringify([...liked]));}catch{}}
 window.renderReels=clips=>{
  source=clips;
  const previous=active?.dataset.name;
  cleanup();pauseAll();active=null;host.replaceChildren();
  if(!clips.length){
   const empty=document.createElement('div');empty.className='empty';
   const title=document.createElement('h3');title.textContent='No reels yet';
   const text=document.createElement('p');text.textContent='Create a clip in the arcade studio. Your reels will appear here.';
   empty.append(title,text);host.append(empty);return;
  }
  const controls=document.createElement('div');controls.className='reels-preferences';
  const tabs=document.createElement('div');tabs.className='reels-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Reel order');
  for(const [value,label] of [['for-you','For you'],['latest','Latest']]){
   const button=document.createElement('button');button.type='button';button.textContent=label;button.className=mode===value?'selected':'';
   button.setAttribute('aria-pressed',String(mode===value));
   button.addEventListener('click',()=>{if(mode===value)return;mode=value;window.renderReels(source);});tabs.append(button);
  }
  const note=document.createElement('p');note.textContent=mode==='for-you'?(liked.size?'Ordered by clips and title words you liked.':'Like a reel to start shaping your recommendations.'):'All saved clips, newest first.';
  controls.append(tabs,note);host.append(controls);
  const feed=document.createElement('div');feed.className='reels-feed';feed.tabIndex=0;feed.setAttribute('role','region');feed.setAttribute('aria-label','Saved reels. Swipe horizontally or use left and right arrow keys.');
  const toolbar=document.createElement('div');toolbar.className='reels-toolbar';
  const position=document.createElement('span');position.setAttribute('aria-live','polite');
  const prev=document.createElement('button');prev.type='button';prev.textContent='← Previous';prev.setAttribute('aria-label','Previous reel');
  const next=document.createElement('button');next.type='button';next.textContent='Next →';next.setAttribute('aria-label','Next reel');
  toolbar.append(position,prev,next);host.append(feed,toolbar);
  const shown=ordered();
  const cards=shown.map((clip,index)=>{
   const card=document.createElement('article');card.className='reel';card.dataset.name=clip.name;
   let media;
   if (clip.source === 'twitch') {
    media=document.createElement('div');media.className='twitch-media';
    const preview=document.createElement('button');preview.type='button';preview.className='twitch-play';
    preview.setAttribute('aria-label',`Play Twitch clip: ${clip.title||'untitled clip'}`);
    const image=document.createElement('img');image.src=clip.thumbnail;image.alt='';image.loading='lazy';
    const playIcon=document.createElement('span');playIcon.textContent='▶ Play on Twitch';
    preview.append(image,playIcon);media.append(preview);
    preview.addEventListener('click',()=>{
     pauseAll();
     const frame=document.createElement('iframe');frame.className='twitch-player';
     const url=new URL('https://clips.twitch.tv/embed');
     url.searchParams.set('clip',clip.name.slice(7));
     url.searchParams.set('parent',location.hostname);
     url.searchParams.set('autoplay','true');
     url.searchParams.set('muted','true');
     frame.src=url.href;frame.title=clip.title||'Twitch clip';frame.allow='autoplay; fullscreen';frame.allowFullscreen=true;
     media.append(frame);preview.hidden=true;
    });
   } else {
    media=document.createElement('video');media.src=clip.url;media.controls=true;media.muted=true;media.loop=true;media.playsInline=true;media.preload='metadata';
    media.setAttribute('aria-label',`${clip.title||`Clip ${index+1}`}, saved ${new Date(clip.createdAt).toLocaleString()}`);
    media.addEventListener('play',()=>pauseAll(media));
   }
   const info=document.createElement('div');info.className='reel-info';
   const details=document.createElement('div');details.className='reel-details';
   const heading=document.createElement('strong');heading.textContent=clip.title||`Clip ${index+1}`;
   const date=document.createElement('p');date.textContent=clip.source==='twitch'?`TWITCH · ${clip.broadcaster || 'Creator'} · ${Number(clip.views||0).toLocaleString()} views · ${new Date(clip.createdAt).toLocaleDateString()}`:`LOCAL · ${new Date(clip.createdAt).toLocaleString()} · ${(clip.bytes/1048576).toFixed(1)} MB`;
   details.append(heading,date);
   const actions=document.createElement('div');actions.className='reel-actions';
   const like=document.createElement('button');like.type='button';like.className=liked.has(clip.name)?'is-liked':'';like.textContent=liked.has(clip.name)?'♥ Liked':'♡ Like';like.setAttribute('aria-pressed',String(liked.has(clip.name)));like.setAttribute('aria-label',`${liked.has(clip.name)?'Unlike':'Like'} ${clip.title||'clip'}`);
   like.addEventListener('click',()=>{liked.has(clip.name)?liked.delete(clip.name):liked.add(clip.name);saveLikes();window.renderReels(source);});
   const link=document.createElement('a');link.href=clip.url;if(clip.source==='twitch'){link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open on Twitch ↗';}else{link.download=clip.name;link.textContent='Download ↓';}
   actions.append(like,link);info.append(details,actions);card.append(media,info);feed.append(card);return card;
  });
  let selected=Math.max(0,cards.findIndex(card=>card.dataset.name===previous));
  function update(index){selected=index;active=cards[index];position.textContent=`${index+1} / ${cards.length} · Swipe left or right`;prev.disabled=index===0;next.disabled=index===cards.length-1;}
  function go(delta){const index=Math.max(0,Math.min(cards.length-1,selected+delta));feed.scrollTo({left:cards[index].offsetLeft-cards[0].offsetLeft,behavior:reduced.matches?'instant':'smooth'});}
  prev.addEventListener('click',()=>go(-1));next.addEventListener('click',()=>go(1));
  feed.addEventListener('keydown',event=>{if(event.target!==feed)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();go(event.key==='ArrowRight'?1:-1);}});
  function syncVisible(){
   const center=feed.scrollLeft+feed.clientWidth/2;let index=0,closest=Infinity;
   cards.forEach((card,i)=>{const distance=Math.abs(card.offsetLeft-cards[0].offsetLeft+card.clientWidth/2-center);if(distance<closest){closest=distance;index=i;}});
   update(index);
   const video=cards[index].querySelector('video');pauseAll(video||cards[index]);
   if(video&&feedOpen&&!document.hidden&&!reduced.matches&&video.paused)video.play().catch(()=>{});
   else if(video&&(!feedOpen||document.hidden))video.pause();
  }
  let frame=0;function queueSync(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;syncVisible();});}
  feed.addEventListener('scroll',queueSync,{passive:true});
  document.addEventListener('reels-shown',onShow);document.addEventListener('reels-hidden',onHide);
  function onShow(){feedOpen=true;queueSync();}function onHide(){feedOpen=false;pauseAll();}
  cleanup=()=>{document.removeEventListener('reels-shown',onShow);document.removeEventListener('reels-hidden',onHide);};
  feed.scrollLeft=cards[selected].offsetLeft-cards[0].offsetLeft;syncVisible();
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAll();});
})();


