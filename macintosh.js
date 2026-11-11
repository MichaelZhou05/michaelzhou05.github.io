/** One drive, one running program. Programs own only the LCD and return cleanup. */
const machine = document.querySelector('.macintosh');
const screen = machine.querySelector('.mac-display');
const drive = machine.querySelector('.mac-drive');
const slot = drive.querySelector('.mac-slot');
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
let seated = null;
let cleanup = null;
let version = 0;
let cancelFlight = null;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const alias = id => id === 'race' ? 'fun' : id;
const diskFor = id => disks.find(disk => disk.id === alias(id));

shelf.innerHTML = disks.map(disk => `
  <button type="button" class="mac-disk" data-disk="${disk.id}" draggable="true"
    aria-pressed="false" aria-label="Select ${disk.title} disk">
    <span class="mac-disk-bay" aria-hidden="true">
      <span class="mac-floppy" style="--plastic:${disk.color}">
        <span class="mac-shutter"><i></i></span>
        <span class="mac-disk-label"><small>Michael Zhou</small><b>${disk.label}</b></span>
        <span class="mac-protect"></span>
      </span>
    </span>
    <span class="mac-disk-title">${disk.title}</span>
    <span class="mac-disk-state">Select disk</span>
  </button>`).join('');
const diskButtons = [...shelf.querySelectorAll('.mac-disk')];
machine.querySelector('.mac-keyboard').innerHTML = Array.from({length:51},(_,i)=>`<i${i===47?' class="mac-space"':''}></i>`).join('');

function idle() {
  screen.innerHTML = `<div class="mac-idle"><div class="mac-idle-bar"><span>▧ &nbsp; Michael's Macintosh</span><span>MZ System 7</span></div><div class="mac-idle-welcome"><div class="mac-happy" aria-hidden="true"><span class="mac-happy-face">☺</span><span class="mac-happy-slot"></span></div><h2>Hello.</h2><p>Pick a disk.<br>Make yourself at home.</p></div><div class="mac-idle-footer"><span>Four disks. A few rabbit holes.</span><span>Drive empty</span></div></div>`;
}
function update() {
  machine.dataset.disk = mounted || selected;
  const disk = diskFor(selected);
  diskButtons.forEach(button => {
    const active = button.dataset.disk === selected;
    const inserted = button.dataset.disk === seated;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('is-mounted', inserted);
    button.querySelector('.mac-disk-state').textContent = inserted ? 'In the drive'
      : button.dataset.disk === mounted ? 'Inserting…' : active ? 'Ready to insert' : 'Select disk';
  });
  drive.disabled = selected === mounted;
  drive.setAttribute('aria-label', seated === selected ? `${disk.title} disk inserted`
    : mounted === selected ? `Inserting ${disk.title} disk` : `Insert ${disk.title} disk`);
  drive.querySelector('.mac-drive-label').textContent = mounted === selected ? disk.title : `Insert ${disk.title}`;
  ejectButton.disabled = !mounted;
}
function select(id) {
  const disk = diskFor(id);
  if (!disk) return;
  selected = disk.id;
  if (mounted !== selected) {
    status.textContent = `${disk.title} selected. ${mounted ? 'Insert to swap disks.' : 'Ready to insert.'}`;
  } else if (machine.dataset.phase === 'mounted') {
    status.textContent = `${disk.title} is running. Eject to return to the desktop.`;
  } else {
    status.textContent = `Reading ${disk.title}…`;
  }
  update();
  machine.dispatchEvent(new CustomEvent('diskchange',{bubbles:true,detail:{id:mounted}}));
}
function stopProgram() {
  version += 1;
  cancelFlight?.();
  cleanup?.();
  cleanup = null;
  screen.replaceChildren();
  mounted = null;
  screen.setAttribute('aria-busy', 'false');
}

function animateDisk(disk, {ejecting = false, fromDrive = false} = {}) {
  const button = diskButtons.find(button => button.dataset.disk === disk.id);
  const source = button.querySelector('.mac-floppy');
  const from = source.getBoundingClientRect();
  const opening = slot.getBoundingClientRect();
  const width = source.offsetWidth;
  const height = source.offsetHeight;
  const x = from.left + from.width / 2 - (opening.left + opening.width / 2);
  const y = from.top + from.height / 2 - (opening.top + opening.height / 2);
  const sourceTransform = getComputedStyle(source).transform;
  const rotation = new DOMMatrixReadOnly(sourceTransform === 'none' ? undefined : sourceTransform);
  const shelfAngle = Math.atan2(rotation.b, rotation.a);
  const pitch = 68;
  const fit = Math.min(1, (opening.width - 8) / (width * 1.15));
  const halfDepth = height * fit * Math.cos(pitch * Math.PI / 180) / 2;
  // The shutter leads. Once it meets the slot, the disk travels along its own plane.
  const pose = ({x = 0, y = halfDepth + 3, tilt = pitch, turn = 0, roll = 0, travel = 0, scale = fit} = {}) =>
    `translate(${x}px, ${y}px) perspective(520px) rotateX(${tilt}deg) rotateY(${turn}deg) rotateZ(${roll}rad) translateY(${travel}px) scale(${scale})`;
  const resting = pose({x, y, tilt: 0, roll: shelfAngle, scale: 1});
  const turning = pose({x: x * .49, y: y * .55 + halfDepth * .45, tilt: 34, turn: x < 0 ? 17 : -17});
  const aligned = pose();
  const inside = pose({travel: -height * fit - 47});
  const approach = 'cubic-bezier(.25, .65, .27, 1)';
  let frames;
  let duration;
  if (ejecting) {
    frames = [
      { transform: inside, easing: 'ease-out' },
      { transform: aligned, offset: .34, easing: approach },
      { transform: turning, offset: .67, easing: approach },
      { transform: resting },
    ];
    duration = 430;
  } else if (fromDrive) {
    frames = [{ transform: aligned, easing: 'ease-in' }, { transform: inside }];
    duration = 220;
  } else {
    frames = [
      { transform: resting, easing: approach },
      { transform: turning, offset: .31, easing: approach },
      { transform: aligned, offset: .65, easing: 'ease-in' },
      { transform: inside },
    ];
    duration = 550;
  }

  const layer = document.createElement('span');
  layer.className = 'mac-flight';
  const model = document.createElement('span');
  model.className = 'mac-flight-disk';
  model.style.setProperty('--plastic', disk.color);
  Object.assign(model.style, {width: `${width}px`, height: `${height}px`});
  const ghost = source.cloneNode(true);
  model.append(ghost);
  model.insertAdjacentHTML('beforeend', '<span class="mac-flight-side mac-flight-side-left"></span><span class="mac-flight-side mac-flight-side-right"></span>');
  layer.append(model);
  slot.append(layer);
  button.classList.add('is-moving');

  const animation = model.animate(frames, {duration, fill: 'both'});
  const clear = () => {
    if (!layer.isConnected) return;
    layer.remove();
    button.classList.remove('is-moving');
    cancelFlight = null;
  };
  cancelFlight = () => {
    clear();
    animation.cancel();
  };
  return animation.finished.catch(() => {}).finally(clear);
}

async function seatDisk(disk, {current, animate, fromDrive}) {
  const outgoing = diskFor(seated);
  seated = null;
  if (animate) {
    update();
    if (outgoing) await animateDisk(outgoing, {ejecting: true});
    if (current !== version) return;
    await animateDisk(disk, {fromDrive});
    if (current !== version) return;
  }
  seated = disk.id;
  update();
}

async function insert(id = selected, {focus = true, fromDrive = false} = {}) {
  const disk = diskFor(id);
  if (!disk || mounted === disk.id) return;
  stopProgram();
  const current = version;
  selected = mounted = disk.id;
  machine.dataset.phase = 'loading';
  screen.setAttribute('aria-busy', 'true');
  screen.innerHTML = `<div class="mac-loading" role="status">Reading ${disk.title}…</div>`;
  status.textContent = `Reading ${disk.title}…`;
  try {
    const [program] = await Promise.all([
      disk.load(),
      seatDisk(disk, {current, animate: focus && !reducedMotion(), fromDrive}),
    ]);
    if (current !== version) return;
    screen.replaceChildren();
    const host = document.createElement('div');
    host.className = 'mac-program';
    host.dataset.disk = disk.id;
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
    stopProgram();
    seated = null;
    machine.dataset.phase = 'empty';
    screen.setAttribute('aria-label', 'Macintosh screen');
    idle(); update();
    status.textContent = `Could not read ${disk.title}. Insert the disk to try again.`;
    console.error('Disk load failed:', error);
  }
}
async function eject() {
  const disk = diskFor(seated);
  stopProgram();
  const current = version;
  const animate = disk && !reducedMotion();
  seated = null;
  machine.dataset.phase = animate ? 'ejecting' : 'empty';
  screen.setAttribute('aria-label','Macintosh screen');
  idle(); update();
  status.textContent = 'Disk ejected. Pick another, or insert it again.';
  if (diskFor(location.hash.slice(1))) history.replaceState(null,'',location.pathname+location.search+'#macintosh');
  shelf.querySelector(`[data-disk="${selected}"]`).focus({preventScroll:true});
  machine.dispatchEvent(new CustomEvent('diskchange',{bubbles:true,detail:{id:null}}));
  if (!animate) return;
  await animateDisk(disk, {ejecting: true});
  if (current === version) machine.dataset.phase = 'empty';
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
  const last = disks.length - 1;
  const destination = {ArrowRight:(index+1)%disks.length,ArrowLeft:(index+last)%disks.length,Home:0,End:last}[event.key];
  if(destination === undefined) return;
  event.preventDefault();
  const disk = disks[destination];select(disk.id);
  diskButtons[destination].focus();
});
shelf.addEventListener('dragstart',event=>{
  const button = event.target.closest('[data-disk]');
  if(!button) return;
  select(button.dataset.disk);
  event.dataTransfer.setData('application/x-mz-disk',button.dataset.disk);
  event.dataTransfer.setData('text/plain',button.dataset.disk);
  const floppy = button.querySelector('.mac-floppy');
  if (button.dataset.disk !== seated) {
    event.dataTransfer.setDragImage(floppy, floppy.offsetWidth / 2, floppy.offsetHeight / 2);
  }
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
  if(diskFor(id)) insert(id, {fromDrive: true});
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
