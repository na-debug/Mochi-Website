(()=> {
 const button=document.getElementById('nightlightToggle');if(!button)return;
 const overlay=document.createElement('div');overlay.className='nightlight-overlay';overlay.setAttribute('aria-hidden','true');document.body.append(overlay);
 function lamp(x,y){overlay.style.setProperty('--lx',Math.max(0,Math.min(innerWidth,x))+'px');overlay.style.setProperty('--ly',Math.max(0,Math.min(innerHeight,y))+'px')}
 lamp(innerWidth/2,innerHeight/2);addEventListener('pointermove',e=>lamp(e.clientX,e.clientY),{passive:true});addEventListener('pointerdown',e=>lamp(e.clientX,e.clientY),{passive:true});
 button.addEventListener('click',()=>{const on=document.body.classList.toggle('nightlight-on');button.setAttribute('aria-pressed',String(on));button.textContent=on?'☼ Nightlight on':'☼ Nightlight off';button.setAttribute('aria-label',on?'Turn nightlight off':'Turn nightlight on')});
 const pages=[
  ['A workshop in the branches','Inside an ancient oak, Mochi gathered river glass, fallen stardust, and a tiny brass gear. He wanted to help a weary explorer feel at home.','🌳'],
  ['A light for the long way','He polished the glass until it felt warm and smooth, then tucked a steady star inside. Just a little light to share, with no startling flashes.','✨'],
  ['A wish finds its way home','At dusk, the explorer followed Mochi’s compass to a safe place beneath the stars. The tiny lantern glowed between them, and the road no longer felt lonely.','🧭']
 ];
 let current=0,busy=false;
 const stage=document.getElementById('storybookStage'),sheet=document.getElementById('pageTurnSheet'),front=document.getElementById('pageFront'),back=document.getElementById('pageBack'),title=document.getElementById('pageTitle'),copy=document.getElementById('pageText'),icon=document.getElementById('pageIcon'),number=document.getElementById('pageNumber'),status=document.getElementById('pageStatus'),previous=document.getElementById('pagePrev'),next=document.getElementById('pageNext');
 function setFace(face,data,index){face.querySelector('[data-icon]').textContent=data[2];face.querySelector('[data-title]').textContent=data[0];face.querySelector('[data-copy]').textContent=data[1];face.querySelector('[data-number]').textContent='0'+(index+1)+' / 03'}
 function showStatic(index){title.textContent=pages[index][0];copy.textContent=pages[index][1];icon.textContent=pages[index][2];number.textContent='0'+(index+1)+' / 03';status.textContent='Page '+(index+1)+' of 3';previous.disabled=index===0;next.disabled=index===pages.length-1}
 function turn(target,direction){
  target=Math.max(0,Math.min(pages.length-1,target));if(busy||target===current)return;
  const old=current;current=target;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){showStatic(current);return}
  busy=true;sheet.classList.remove('turn-next','turn-prev');
  if(direction>0){setFace(front,pages[old],old);setFace(back,pages[target],target);sheet.style.transform='rotateY(0deg)'}
  else{setFace(front,pages[target],target);setFace(back,pages[old],old);sheet.style.transform='rotateY(-180deg)'}
  showStatic(target);sheet.hidden=false;void sheet.offsetWidth;
  sheet.addEventListener('animationend',function done(e){if(e.target!==sheet)return;sheet.classList.remove('turn-next','turn-prev');sheet.style.transform='';sheet.hidden=true;busy=false},{once:true});
  sheet.classList.add(direction>0?'turn-next':'turn-prev');
 }
 previous.addEventListener('click',()=>turn(current-1,-1));next.addEventListener('click',()=>turn(current+1,1));
 stage.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();turn(current+1,1)}else if(e.key==='ArrowLeft'){e.preventDefault();turn(current-1,-1)}});
 let swipe=null;
 stage.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;swipe={id:e.pointerId,x:e.clientX};try{stage.setPointerCapture(e.pointerId)}catch{}});
 stage.addEventListener('pointerup',e=>{if(!swipe||swipe.id!==e.pointerId)return;const dx=e.clientX-swipe.x;swipe=null;if(Math.abs(dx)>38)turn(current+(dx<0?1:-1),dx<0?1:-1)});
 stage.addEventListener('pointercancel',()=>{swipe=null});
 const board=document.getElementById('dreamBoard'),start=document.getElementById('gameStart'),scoreOutput=document.getElementById('gameScore'),timeOutput=document.getElementById('gameTime'),gameStatus=document.getElementById('gameStatus');
 const roundLength=30,spawnEvery=1100;let score=0,seconds=roundLength,playing=false,spawnTimer=0,clockTimer=0,spawnCount=0;
 function stopTimers(){clearInterval(spawnTimer);clearInterval(clockTimer);board.replaceChildren()}
 function finish(reason){if(!playing)return;playing=false;stopTimers();start.disabled=false;start.textContent='Play again ✨';gameStatus.textContent=reason==='cloud'?'Cloud! Game over—you caught '+score+' stars.':'Time! You caught '+score+' '+(score===1?'star':'stars')+'. Lovely exploring!'}
 function drop(kind){
  if(!playing)return;const cloud=kind==='cloud',item=document.createElement('button');item.type='button';item.className=cloud?'dream-cloud':'dream-star';item.textContent=cloud?'☁️':['✦','★','✧'][Math.floor(Math.random()*3)];item.setAttribute('aria-label',cloud?'Avoid this cloud; tapping it ends the game':'Catch this star to add one point');item.style.setProperty('--x',(5+Math.random()*80)+'%');item.style.setProperty('--fall','6.4s');
  item.addEventListener('click',()=>{if(!playing)return;if(cloud){finish('cloud');return}score++;scoreOutput.textContent=String(score);item.remove()},{once:true});item.addEventListener('animationend',()=>item.remove(),{once:true});board.append(item)
 }
 function spawnOnBeat(){spawnCount++;drop(spawnCount%4===0?'cloud':'star')}
 start.addEventListener('click',()=>{if(playing)return;stopTimers();playing=true;score=0;seconds=roundLength;spawnCount=0;scoreOutput.textContent='0';timeOutput.textContent=String(seconds);gameStatus.textContent='Catch stars; avoid clouds. Both fall at the same speed!';start.disabled=true;start.textContent='You’ve got this!';spawnOnBeat();spawnTimer=setInterval(spawnOnBeat,spawnEvery);clockTimer=setInterval(()=>{seconds--;timeOutput.textContent=String(seconds);if(seconds<=0)finish('time')},1000)})
})();