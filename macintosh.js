/** One drive, one running program. Programs own only the LCD and return cleanup. */
const machine = document.querySelector('.macintosh');
const screen = machine.querySelector('.mac-display');
const drive = machine.querySelector('.mac-drive');
const ejectButton = machine.querySelector('.mac-eject');
const shelf = machine.querySelector('.mac-disks');
const status = machine.querySelector('.mac-status');
const disks = [
  {id:'experience', title:'Work experience', label:'WORK', color:'#7b6b99', load:()=>import('./programs/work.js')},
  {id:'now', title:'Building now', label:'NOW', color:'#6e8d82', load:()=>import('./programs/now.js')},
  {id:'projects', title:'Past projects', label:'CODE', color:'#a17c6d', load:()=>import('./programs/projects.js')},
  {id:'fun', title:'Cool stuff', label:'PLAY', color:'#a38d5e', load:()=>import('./programs/arcade.js')},
];
let selected = 'experience';
let mounted = null;
let cleanup = null;
let version = 0;
let flight = null;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const alias = id => id === 'race' ? 'fun' : id;
const diskFor = id => disks.find(disk => disk.id === alias(id));

shelf.innerHTML = disks.map(disk => `<button type="button" class="mac-disk" data-disk="${disk.id}" draggable="true" aria-pressed="false" aria-label="Select ${disk.title} disk"><span class="mac-floppy" style="--plastic:${disk.color}" aria-hidden="true"><span class="mac-shutter"><i></i></span><span class="mac-disk-label"><small>Michael Zhou</small><b>${disk.label}</b><em></em></span><span class="mac-protect"></span></span><span class="mac-disk-title">${disk.title}</span><span class="mac-disk-state">Select disk</span></button>`).join('');
machine.querySelector('.mac-keyboard').innerHTML = Array.from({length:51},(_,i)=>`<i${i===47?' class="mac-space"':''}></i>`).join('');

function idle() {
  screen.innerHTML = `<div class="mac-idle"><div class="mac-idle-bar"><span>▧ &nbsp; Michael's Macintosh</span><span>MZ System 7</span></div><div class="mac-idle-welcome"><div class="mac-happy" aria-hidden="true"><span class="mac-happy-face">☺</span><span class="mac-happy-slot"></span></div><h2>Hello.</h2><p>Pick a disk.<br>Make yourself at home.</p></div><div class="mac-idle-footer"><span>Four disks. A few rabbit holes.</span><span>Drive empty</span></div></div>`;
}
function update() {
  machine.dataset.disk = mounted || selected;
  const disk = diskFor(selected);
  shelf.querySelectorAll('.mac-disk').forEach(button => {
    const active = button.dataset.disk === selected;
    const inserted = button.dataset.disk === mounted;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('is-mounted', inserted);
    button.querySelector('.mac-disk-state').textContent = inserted ? 'In the drive' : active ? 'Ready to insert' : 'Select disk';
  });
  drive.disabled = selected === mounted;
  drive.setAttribute('aria-label', mounted === selected ? `${disk.title} disk inserted` : `Insert ${disk.title} disk`);
  drive.querySelector('.mac-drive-label').textContent = mounted === selected ? disk.title : `Insert ${disk.title}`;
  ejectButton.disabled = !mounted;
}
function select(id) {
  const disk = diskFor(id);
  if (!disk) return;
  selected = disk.id;
  status.textContent = mounted === selected ? `${disk.title} is running. Eject to return to the desktop.` : `${disk.title} selected. ${mounted ? 'Insert to swap disks.' : 'Ready to insert.'}`;
  update();
  machine.dispatchEvent(new CustomEvent('diskchange',{bubbles:true,detail:{id:mounted}}));
}
function stopProgram() {
  version += 1;
  flight?.cancel();
  flight = null;
  cleanup?.();
  cleanup = null;
  screen.replaceChildren();
  mounted = null;
  screen.setAttribute('aria-busy', 'false');
}
async function insert(id = selected, {focus = true} = {}) {
  const disk = diskFor(id);
  if (!disk || mounted === disk.id) return;
  stopProgram();
  const current = version;
  selected = mounted = disk.id;
  machine.dataset.phase = 'loading';
  screen.setAttribute('aria-busy', 'true');
  screen.innerHTML = `<div class="mac-loading" role="status">Reading ${disk.title}…</div>`;
  status.textContent = `Reading ${disk.title}…`;
  update();
  // The animation follows the real floppy to its drive; reduced motion mounts immediately.
  if (!reducedMotion()) {
    const source = shelf.querySelector(`[data-disk="${disk.id}"] .mac-floppy`);
    const from = source.getBoundingClientRect();
    const to = drive.getBoundingClientRect();
    const ghost = source.cloneNode(true);
    ghost.classList.add('mac-flight');
    Object.assign(ghost.style,{left:`${from.left}px`,top:`${from.top}px`,width:`${from.width}px`,height:`${from.height}px`});
    document.body.append(ghost);
    flight = ghost.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${to.left+to.width/2-from.left-from.width/2}px,${to.top+to.height/2-from.top-from.height/2}px) scale(.3,.05)`,opacity:0}],{duration:380,easing:'ease-in'});
    flight.finished.catch(()=>{}).finally(()=>ghost.remove());
  }
  try {
    const program = await disk.load();
    if (current !== version) return;
    screen.replaceChildren();
    const host = document.createElement('div');
    host.className = 'mac-program';
    screen.append(host);
    cleanup = program.mount(host);
    screen.setAttribute('aria-busy', 'false');
    machine.dataset.phase = 'mounted';
    screen.setAttribute('aria-label', `${disk.title} program`);
    status.textContent = `${disk.title} is running. Select another disk to swap, or eject.`;
    if (focus) screen.focus({preventScroll:true});
    machine.dispatchEvent(new CustomEvent('diskchange',{bubbles:true,detail:{id:mounted}}));
  } catch (error) {
    if (current !== version) return;
    cleanup?.(); cleanup = null; mounted = null;
    screen.setAttribute('aria-busy', 'false');
    machine.dataset.phase = 'empty';
    idle(); update();
    status.textContent = `Could not read ${disk.title}. Insert the disk to try again.`;
    console.error('Disk load failed:', error);
  }
}
function eject() {
  stopProgram();
  machine.dataset.phase = 'empty';
  screen.setAttribute('aria-label','Macintosh screen');
  idle(); update();
  status.textContent = 'Disk ejected. Pick another, or insert it again.';
  if (diskFor(location.hash.slice(1))) history.replaceState(null,'',location.pathname+location.search+'#macintosh');
  shelf.querySelector(`[data-disk="${selected}"]`).focus({preventScroll:true});
  machine.dispatchEvent(new CustomEvent('diskchange',{bubbles:true,detail:{id:null}}));
}
shelf.addEventListener('click',event=>{
  const button = event.target.closest('[data-disk]');
  if(button) select(button.dataset.disk);
});
shelf.addEventListener('dblclick',event=>{
  const button = event.target.closest('[data-disk]');
  if(button) insert(button.dataset.disk);
});
shelf.addEventListener('keydown',event=>{
  const button = event.target.closest('[data-disk]');
  if (!button) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    insert(button.dataset.disk);
    return;
  }
  const index = disks.findIndex(disk=>disk.id===button.dataset.disk);
  const destination = {ArrowRight:(index+1)%4,ArrowLeft:(index+3)%4,Home:0,End:3}[event.key];
  if(destination === undefined) return;
  event.preventDefault();
  const disk = disks[destination];select(disk.id);
  shelf.querySelector(`[data-disk="${disk.id}"]`).focus();
});
shelf.addEventListener('dragstart',event=>{
  const button = event.target.closest('[data-disk]');
  if(!button) return;
  select(button.dataset.disk);
  event.dataTransfer.setData('application/x-mz-disk',button.dataset.disk);
  event.dataTransfer.setData('text/plain',button.dataset.disk);
  event.dataTransfer.effectAllowed = 'copy';
});
shelf.addEventListener('dragend',()=>machine.classList.remove('is-over-drive'));
drive.addEventListener('dragover',event=>{
  if(![...event.dataTransfer.types].includes('application/x-mz-disk')) return;
  event.preventDefault();event.dataTransfer.dropEffect='copy';machine.classList.add('is-over-drive');
});
drive.addEventListener('dragleave',()=>machine.classList.remove('is-over-drive'));
drive.addEventListener('drop',event=>{
  event.preventDefault();machine.classList.remove('is-over-drive');
  const id=event.dataTransfer.getData('application/x-mz-disk');
  if(diskFor(id)) insert(id);
});
drive.addEventListener('click',()=>insert());
ejectButton.addEventListener('click',eject);

// Existing portfolio links remain useful, including bookmarked race links.
function openHash({scroll=false} = {}) {
  const disk = diskFor(location.hash.slice(1));
  if(!disk) return;
  select(disk.id);insert(disk.id,{focus:scroll});
  if(scroll) machine.scrollIntoView({behavior:reducedMotion()?'instant':'smooth',block:'start'});
}
document.addEventListener('click',event=>{
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]');
  const disk = link && diskFor(link.hash.slice(1));
  if(!disk) return;
  event.preventDefault();
  history.pushState(null,'',link.hash);
  openHash({scroll:true});
});
window.addEventListener('hashchange',()=>openHash({scroll:true}));
window.addEventListener('popstate',()=>openHash({scroll:true}));
document.addEventListener('portfolio:arcade',async ()=>{
  await insert('fun');
  screen.querySelector('.mac-program')?.dispatchEvent(new CustomEvent('arcade:boot'));
  machine.scrollIntoView({behavior:reducedMotion()?'instant':'smooth',block:'start'});
});
idle();update();openHash();
