import { spriteSvg } from '../sprites.js';

export const diskDesigns = [
  { id:'graphite', name:'Graphite', eyebrow:'THE SLOT LOADER', title:'A little hardware. A lot of rabbit holes.', description:'Four disks on the left. One quiet, graphite laptop. Pick a disk, then slide it into the drive.', computer:'MZ POWERBOOK', os:'MZ OS / DARK', version:'01' },
  { id:'platinum', name:'Platinum', eyebrow:'THE CLASSIC', title:'Please insert a little curiosity.', description:'A warm platinum notebook, a striped desktop, and a box of labeled floppies. A little more old-school Mac.', computer:'MICHAEL / PERSONAL COMPUTER', os:'MZ SYSTEM 7', version:'02' },
  { id:'studio', name:'Night Shift', eyebrow:'THE PIXEL DESK', title:'One more thing before bed.', description:'A pixel laptop on a wooden desk. Grab a disk from the stack, put it in the drive, and settle in.', computer:'MZ / LATE-NIGHT EDITION', os:'WORKBENCH / 00:42', version:'03' },
];

const disks = [
  {id:'experience', title:'Work experience', short:'WORK', volume:'01', caption:'The places I’ve worked.', color:'#7260a7'},
  {id:'now', title:'Building now', short:'NOW', volume:'02', caption:'Currently: Auto Research.', color:'#66877d'},
  {id:'projects', title:'Past projects', short:'CODE', volume:'03', caption:'Things I’ve made.', color:'#a07361'},
  {id:'fun', title:'Cool stuff', short:'PLAY', volume:'04', caption:'The side quests.', color:'#a58b52'},
];

const pixel = (name,scale=2) => spriteSvg(name,{scale,color:'#b8a9ff'});
const diskMarkup = disk => `<span class="physical-disk" style="--disk-plastic:${disk.color}" aria-hidden="true"><span class="disk-shutter"><span></span></span><span class="disk-label"><span class="label-ruled">MZ / ${disk.volume}</span><span class="disk-handwriting">${disk.short}</span><span class="label-line"></span></span><span class="disk-protect"></span><span class="disk-bottom-ridge"></span></span>`;

function computer(design) {
  return `<div class="computer-area">
    <div class="desk-props" aria-hidden="true"><span class="desk-poster">BUILD<br>WEIRD<br>THINGS.</span><span class="desk-coffee">${pixel('coffeeCup',3)}</span><span class="desk-plant"><i></i><i></i><i></i></span></div>
    <div class="retro-notebook">
      <div class="notebook-lid"><span class="bezel-screw screw-left"></span><span class="bezel-screw screw-right"></span><div class="lcd-screen">
        <div class="system-menubar"><span>${pixel('floppy',1)}</span><span>File</span><span>Edit</span><span>View</span><span class="system-clock">${design.id==='studio'?'00:42':'MZ OS'}</span></div>
        <div class="screen-workarea"><div class="screen-corner-label">MICHAEL'S COLLECTION</div><div class="mount-window"><div class="mount-window-bar"><span class="window-close-mark" aria-hidden="true"></span><span data-window-title>Disk Utility</span><span class="window-lines" aria-hidden="true"></span></div><div class="mount-window-content" aria-live="polite"><div class="screen-icon">${pixel('floppy',3)}</div><h3 data-screen-title>No disk inserted.</h3><p data-screen-copy>There’s something good on every one.</p><div class="screen-state"><i></i><span data-screen-status>DRIVE EMPTY</span></div></div></div><span class="desktop-trash" aria-hidden="true">${pixel('chest',1)}<small>storage</small></span></div>
        <div class="screen-system-line"><span>${design.os}</span><span data-volume-label>NO VOLUME</span></div>
      </div><div class="notebook-wordmark"><span class="wordmark-symbol">${pixel('hero',1)}</span><span>${design.computer}</span><span class="power-led"></span></div></div>
      <div class="notebook-hinge"><i></i><i></i></div>
      <div class="notebook-base"><div class="speaker-grille grille-left"></div><div class="keyboard" aria-hidden="true">${Array.from({length:50},(_,i)=>`<i${i===46?' class="space-key"':''}></i>`).join('')}</div><div class="speaker-grille grille-right"></div><div class="palmrest"><div class="trackpad"></div><span class="hardware-sticker">MZ<br>’28</span></div></div>
      <div class="notebook-front"><div class="drive-block"><span class="drive-led"></span><button type="button" class="disk-drive" aria-label="Insert selected disk into drive" disabled><span class="drive-opening"></span><span class="drive-drop-label">INSERT DISK</span></button><button type="button" class="hardware-eject" aria-label="Eject disk" disabled>⏏</button></div><span class="front-latch"></span></div>
    </div><div class="desk-surface" aria-hidden="true"></div>
  </div>`;
}

function mountDesign(stage, design) {
  stage.innerHTML=`<div class="study-heading"><p>${design.eyebrow}</p><h2>${design.title}</h2><span>${design.description}</span></div><div class="disk-workspace"><aside class="disk-library" aria-label="Choose a portfolio disk"><div class="library-heading"><span>THE DISK BOX</span><span>4 VOLUMES</span></div><div class="disk-shelf">${disks.map(disk=>`<button type="button" class="disk-choice" draggable="true" data-disk="${disk.id}" aria-pressed="false" aria-label="Select ${disk.title} disk">${diskMarkup(disk)}<span class="disk-choice-copy"><span class="disk-choice-title">${disk.title}</span><span class="disk-choice-caption">${disk.caption}</span><span class="disk-choice-state">VOL. ${disk.volume} / AVAILABLE</span></span></button>`).join('')}</div><p class="shelf-footnote">3½ IN. / FOUR SMALL WORLDS</p></aside>${computer(design)}</div><div class="disk-control-deck"><div class="selection-readout" aria-live="polite"><span class="readout-led"></span><span data-selection-copy>Choose a disk from the box.</span></div><div class="disk-actions"><button type="button" class="insert-disk" disabled>insert disk →</button><button type="button" class="eject-disk" disabled>eject ⏏</button></div></div><p class="disk-instruction">Select → insert → eject. You can also drag a disk onto the drive.</p>`;
  let selected=null,mounted=null,busy=false;
  const chooseButtons=[...stage.querySelectorAll('[data-disk]')];
  const slot=stage.querySelector('.disk-drive');
  const insert=stage.querySelector('.insert-disk');
  const eject=stage.querySelector('.eject-disk');
  const hardwareEject=stage.querySelector('.hardware-eject');
  const screenTitle=stage.querySelector('[data-screen-title]');
  const screenCopy=stage.querySelector('[data-screen-copy]');
  const screenStatus=stage.querySelector('[data-screen-status]');
  const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
  function refresh() {
    stage.dataset.phase=busy?'busy':mounted?'mounted':selected?'selected':'empty';
    stage.dataset.mounted=mounted?.id || '';
    stage.dataset.selected=selected?.id || '';
    chooseButtons.forEach(button=>{
      const disk=disks.find(d=>d.id===button.dataset.disk);
      button.setAttribute('aria-pressed',String(selected?.id===disk.id));
      button.classList.toggle('is-mounted',mounted?.id===disk.id);
      button.disabled=busy;
      button.draggable=false;
      button.querySelector('.disk-choice-state').textContent=mounted?.id===disk.id?'● IN THE DRIVE':selected?.id===disk.id?'→ SELECTED':`VOL. ${disk.volume} / AVAILABLE`;
    });
    const canInsert=Boolean(selected&&!busy&&selected.id!==mounted?.id);
    insert.disabled=!canInsert;
    slot.disabled=!canInsert;
    insert.textContent=mounted&&selected&&selected.id!==mounted.id?'swap disks →':'insert disk →';
    eject.disabled=hardwareEject.disabled=busy||!mounted;
    slot.setAttribute('aria-label',canInsert?`Insert ${selected.title} disk into drive`:'Insert selected disk into drive');
    stage.querySelector('.drive-drop-label').textContent=mounted?'DISK IN DRIVE':selected?'INSERT HERE':'INSERT DISK';
    const readout=busy?'Please wait for the drive.':selected&&selected.id!==mounted?.id?`${selected.title} selected. ${mounted?'Swap it into':'Insert it into'} the drive.`:mounted?`${mounted.title} is mounted. Eject to take it out.`:'Choose a disk from the box.';
    stage.querySelector('[data-selection-copy]').textContent=readout;
    stage.querySelector('[data-volume-label]').textContent=mounted?`VOL. ${mounted.volume} / MOUNTED`:'NO VOLUME';
  }
  function select(id){if(busy)return;selected=disks.find(d=>d.id===id)||null;refresh();}
  async function fly(disk,reverse=false,fromDrive=false){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const origin=stage.querySelector(`[data-disk="${disk.id}"] .physical-disk`);
    const from=origin.getBoundingClientRect(),to=slot.getBoundingClientRect(),bounds=stage.getBoundingClientRect();
    const flight=document.createElement('div');
    flight.className='disk-flight';flight.setAttribute('aria-hidden','true');flight.innerHTML=diskMarkup(disk);
    flight.style.width=`${from.width}px`;flight.style.height=`${from.height}px`;
    stage.append(flight);
    const a={x:from.left-bounds.left,y:from.top-bounds.top};
    const b={x:to.left-bounds.left+(to.width-from.width)/2,y:to.top-bounds.top+(to.height-from.height)/2};
    const frames=fromDrive?[
      {transform:`translate(${b.x}px,${b.y-16}px) rotate(0deg) scale(1,.38)`,opacity:1},
      {transform:`translate(${b.x}px,${b.y}px) rotate(0deg) scale(1,.04)`,opacity:0},
    ]:[
      {transform:`translate(${a.x}px,${a.y}px) rotate(-5deg) scale(1)`,opacity:1,offset:0},
      {transform:`translate(${a.x+(b.x-a.x)*.55}px,${Math.min(a.y,b.y)-35}px) rotate(8deg) scale(1)`,opacity:1,offset:.5},
      {transform:`translate(${b.x}px,${b.y}px) rotate(0deg) scale(1,.38)`,opacity:1,offset:.83},
      {transform:`translate(${b.x}px,${b.y}px) rotate(0deg) scale(1,.04)`,opacity:0,offset:1},
    ];
    if(reverse)frames.forEach(f=>f.offset=1-f.offset),frames.reverse();
    try {await flight.animate(frames,{duration:reverse?510:fromDrive?250:660,easing:'cubic-bezier(.3,.02,.25,1)',fill:'forwards'}).finished;}
    finally {flight.remove();}
  }
  function idleScreen(){screenTitle.textContent='No disk inserted.';screenCopy.textContent='There’s something good on every one.';screenStatus.textContent='DRIVE EMPTY';stage.querySelector('[data-window-title]').textContent='Disk Utility';}
  async function ejectMounted(){
    if(!mounted||busy)return;
    busy=true;refresh();screenTitle.textContent='Ejecting disk…';screenCopy.textContent='Back to the collection.';screenStatus.textContent='EJECTING';
    await fly(mounted,true);
    mounted=null;selected=null;busy=false;idleScreen();refresh();
  }
  async function insertSelected({fromDrive=false}={}){
    if(!selected||busy||selected.id===mounted?.id)return;
    const disk=selected;
    busy=true;refresh();
    if(mounted){screenTitle.textContent='Swapping disks…';screenCopy.textContent='One volume at a time.';screenStatus.textContent='EJECTING';await fly(mounted,true);mounted=null;}
    screenTitle.textContent='Inserting disk…';screenCopy.textContent=disk.title;screenStatus.textContent='DRIVE ACTIVE';
    await fly(disk,false,fromDrive);
    screenTitle.textContent='Reading volume…';screenCopy.textContent=disk.title;screenStatus.textContent='MOUNTING';
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await wait(380);
    mounted=disk;busy=false;
    stage.querySelector('[data-window-title]').textContent=`Volume ${disk.volume}`;
    screenTitle.textContent=disk.title;
    screenCopy.textContent='Your program will launch here.';
    screenStatus.textContent='DISK MOUNTED / PROGRAM TO COME';
    refresh();
  }
  const dropArea=stage.querySelector('.drive-block');
  chooseButtons.forEach(button=>{
    let pointer=null,ghost=null,suppressClick=false;
    const overDrive=event=>{const r=dropArea.getBoundingClientRect();return event.clientX>=r.left-12&&event.clientX<=r.right+12&&event.clientY>=r.top-18&&event.clientY<=r.bottom+18;};
    function cleanDrag(){ghost?.remove();ghost=null;pointer=null;button.classList.remove('is-drag-source');stage.classList.remove('is-dragging','is-over-drive');}
    button.addEventListener('click',event=>{if(suppressClick){event.preventDefault();suppressClick=false;return;}select(button.dataset.disk);});
    button.addEventListener('pointerdown',event=>{
      if(busy||event.button!==0||event.pointerType==='touch')return;
      pointer={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove',event=>{
      if(!pointer||pointer.id!==event.pointerId)return;
      if(!pointer.moved&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)<7)return;
      if(!pointer.moved){
        pointer.moved=true;select(button.dataset.disk);
        const disk=disks.find(d=>d.id===button.dataset.disk),r=button.querySelector('.physical-disk').getBoundingClientRect();
        ghost=document.createElement('div');ghost.className='disk-flight drag-ghost';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=diskMarkup(disk);ghost.style.width=`${r.width}px`;ghost.style.height=`${r.height}px`;stage.append(ghost);
        stage.classList.add('is-dragging');button.classList.add('is-drag-source');
      }
      const bounds=stage.getBoundingClientRect();
      ghost.style.transform=`translate(${event.clientX-bounds.left-ghost.offsetWidth/2}px,${event.clientY-bounds.top-ghost.offsetHeight/2}px) rotate(-6deg)`;
      stage.classList.toggle('is-over-drive',overDrive(event));
    });
    button.addEventListener('pointerup',event=>{
      if(!pointer||pointer.id!==event.pointerId)return;
      const moved=pointer.moved,drop=moved&&overDrive(event);
      cleanDrag();
      if(moved){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);}
      if(drop)insertSelected({fromDrive:true});
    });
    button.addEventListener('pointercancel',cleanDrag);
    button.addEventListener('lostpointercapture',()=>{if(pointer)cleanDrag();});
  });
  insert.addEventListener('click',insertSelected);slot.addEventListener('click',insertSelected);eject.addEventListener('click',ejectMounted);hardwareEject.addEventListener('click',ejectMounted);
  stage.addEventListener('keydown',event=>{if(event.key==='Escape'&&mounted&&!busy){event.preventDefault();ejectMounted();}});
  refresh();
}

const host=document.getElementById('disk-study');
const single=host.dataset.only;
const designs=single?diskDesigns.filter(d=>d.id===single):diskDesigns;
if(!single){
  host.innerHTML=`<div class="disk-study-header"><p class="study-kicker">MICHAEL ZHOU / HARDWARE STUDIES</p><h1>Pick a disk. Pop it in.</h1><p>Three ways into the same four worlds.</p></div><div class="study-nav"><nav role="tablist" aria-label="Laptop designs">${designs.map((d,i)=>`<button type="button" role="tab" id="design-tab-${d.id}" aria-controls="design-${d.id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-design-tab="${d.id}"><span>0${i+1}</span>${d.name}</button>`).join('')}</nav><a class="view-in-site" href="./disk-graphite.html#explore">view in the full site ↗</a></div><div class="study-designs">${designs.map((d,i)=>`<section class="disk-stage variant-${d.id}" id="design-${d.id}" role="tabpanel" aria-labelledby="design-tab-${d.id}"${i?' hidden':''}></section>`).join('')}</div>`;
}else host.innerHTML=`<div class="single-study-nav"><a href="./disks.html">← compare the three designs</a><span>DISK INSERTION STUDY / ${designs[0].name.toUpperCase()}</span></div><section class="disk-stage variant-${single}" id="design-${single}"></section>`;
designs.forEach(d=>mountDesign(document.getElementById(`design-${d.id}`),d));
if(!single){
  const tabs=[...host.querySelectorAll('[data-design-tab]')];
  function activate(id){tabs.forEach(tab=>{const active=tab.dataset.designTab===id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById(`design-${tab.dataset.designTab}`).hidden=!active;});host.querySelector('.view-in-site').href=`./disk-${id}.html#explore`;}
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(tab.dataset.designTab));tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;activate(tabs[next].dataset.designTab);tabs[next].focus();}});});
}
document.querySelectorAll('#site-index a[href="#race"],#site-index a[href="#projects"],#site-index a[href="#experience"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();document.getElementById('explore').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
