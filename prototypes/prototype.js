import { concepts, entries, sections } from './content.js';
import { spriteSvg, SPRITES } from '../sprites.js';
import { mountTerminal } from './terminal.js';
import { mountRoom } from './room.js';
import { mountOverworld } from './world.js';

const app = document.getElementById('prototype-app');
const concept = document.body.dataset.prototype;
const panel = document.getElementById('explore');
const keys = Object.keys(sections);
const params = new URLSearchParams(location.search);
if (params.has('focus')) document.body.classList.add('prototype-focused');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
const icon = (name, scale = 2) => spriteSvg(SPRITES[name] ? name : 'chest', { scale, color:'#b8a9ff' });
const sectionButtons = (className = 'explorer-tab') => keys.map((key,i) => `<button type="button" class="${className}" data-section="${key}" aria-pressed="false"><span class="nav-sprite" aria-hidden="true">${icon(sections[key].icon)}</span><span>${sections[key].title}</span><small>0${i+1}</small></button>`).join('');
const header = (kicker, title, intro) => `<header class="explorer-header"><p class="explorer-kicker">${kicker}</p><h2>${title}</h2><p>${intro}</p></header>`;
let current = keys.includes(params.get('section')) ? params.get('section') : 'experience';
let showSection;

function detail(entry, expanded = false) {
  return `<article class="entry${entry.placeholder?' entry-active':''}"><details${expanded?' open':''}><summary><span class="entry-summary"><span class="entry-title">${escape(entry.title)}</span><span class="entry-meta">${escape(entry.meta)}</span><span class="entry-description">${escape(entry.description)}</span></span><span class="entry-plus" aria-hidden="true">+</span></summary><div class="entry-detail"><p>${escape(entry.body)}</p><ul class="entry-stats">${entry.stats.map(s=>`<li>${escape(s)}</li>`).join('')}</ul><p class="entry-tech">${escape(entry.tech)}</p>${entry.game?`<button type="button" class="pixel-action" data-game="${entry.game}">▶ play ${entry.game==='race'?'the racing eval':'the Vim sprint'}</button><div class="game-slot" data-game-slot="${entry.game}"></div>`:''}</div></details></article>`;
}
function sectionHTML(key, {expanded=false} = {}) {
  return `<div class="content-topline"><h3>${sections[key].title}</h3><span>${sections[key].count}</span></div><p class="content-subtitle">${sections[key].subtitle}</p><div class="entries">${entries[key].map(e=>detail(e, expanded || key==='now')).join('')}</div>`;
}
function selectButtons(key, scope=app) {
  scope.querySelectorAll('[data-section]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.section===key)));
}
function remember(key) {
  current=key;
  const url=new URL(location.href);
  url.searchParams.set('section',key);
  history.replaceState(null,'',url);
}
function changed(content) {
  content.classList.remove('content-arrive');
  void content.offsetWidth;
  content.classList.add('content-arrive');
}

// These dialogs are shared by the room and the alternative physical navigators.
const reader = document.createElement('dialog');
reader.className='portfolio-dialog reader-dialog';
reader.setAttribute('aria-labelledby','reader-title');
reader.innerHTML=`<div class="dialog-topline"><h2 id="reader-title">Michael's field notes</h2><button type="button" class="dialog-close" aria-label="Close reader">×</button></div><nav class="dialog-categories" aria-label="Reader sections">${sectionButtons('reader-tab')}</nav><div class="dialog-content" aria-live="polite"></div>`;
document.body.append(reader);
const terminalDialog=document.createElement('dialog');
terminalDialog.className='portfolio-dialog terminal-dialog';
terminalDialog.setAttribute('aria-labelledby','computer-title');
terminalDialog.innerHTML=`<div class="dialog-topline"><h2 id="computer-title">michael@portfolio — bash</h2><button type="button" class="dialog-close" aria-label="Close terminal">×</button></div><div class="computer-boot"><span class="live-dot"></span> Linux is ready. Make yourself at home.</div><div id="room-terminal"></div>`;
document.body.append(terminalDialog);
function openReader(key){
  reader.querySelector('.dialog-content').innerHTML=sectionHTML(key);
  selectButtons(key,reader);
  reader.querySelector('h2').textContent=sections[key].title;
  if(terminalDialog.open)terminalDialog.close();
  if(!reader.open)reader.showModal();
  remember(key);
}
reader.querySelectorAll('[data-section]').forEach(button=>button.addEventListener('click',()=>openReader(button.dataset.section)));
const term=mountTerminal(document.getElementById('room-terminal'),{onOpen:openReader,onExit:()=>terminalDialog.close()});
function openComputer(){if(reader.open)reader.close();if(!terminalDialog.open)terminalDialog.showModal();term.focus();}
for(const dialog of [reader,terminalDialog]){
  dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{dialog.querySelectorAll('iframe').forEach(frame=>frame.remove());dialog.querySelectorAll('[data-game]').forEach(button=>{button.disabled=false;button.textContent=`▶ play ${button.dataset.game==='race'?'the racing eval':'the Vim sprint'}`;});});
}

if(concept==='cartridges') {
  app.innerHTML=header('PLAYER 01 / THE COLLECTION','Pick a cartridge.','Four shelves of my life. Pick something up and have a look.') + `<nav class="cartridge-library" aria-label="Portfolio cartridges">${keys.map((key,i)=>`<button class="portfolio-cartridge" type="button" data-section="${key}" aria-pressed="false"><span class="cartridge-ridges" aria-hidden="true"></span><span class="cartridge-sticker"><span class="cartridge-art" aria-hidden="true">${icon(sections[key].icon,3)}</span><span class="cartridge-title">${sections[key].title}</span><span class="cartridge-edition">MZ COLLECTION / VOL. 0${i+1}</span></span><span class="cartridge-status">INSERT TO EXPLORE</span><span class="cartridge-contacts" aria-hidden="true"></span></button>`).join('')}</nav><div class="console-slot"><span class="live-dot"></span><span data-cartridge-label></span><span>NO SAVE FILE REQUIRED</span></div><div class="explorer-content" aria-live="polite"></div><p class="explorer-footnote">Click to swap cartridges. Everything is unlocked.</p>`;
  const content=app.querySelector('.explorer-content');
  showSection=key=>{content.innerHTML=sectionHTML(key);selectButtons(key);app.querySelector('[data-cartridge-label]').textContent=`NOW PLAYING: ${sections[key].title.toUpperCase()}`;app.querySelectorAll('.portfolio-cartridge').forEach(button=>button.querySelector('.cartridge-status').textContent=button.dataset.section===key?'● LOADED':'INSERT TO EXPLORE');remember(key);changed(content);};
} else if(concept==='workbench') {
  app.innerHTML=header('PLAYER 01 / WORKSPACE','The workbench.','A few folders, a few projects, and a terminal if you feel at home there.')+`<div class="workbench-window"><div class="desktop-title"><span>■ michael@portfolio: ~/workbench</span><span aria-hidden="true">− □ ×</span></div><div class="workbench-layout"><nav class="filesystem-tree" aria-label="Portfolio directories"><p>~/michael/</p>${sectionButtons('folder-button')}</nav><div class="filesystem-main"><p class="filesystem-path"></p><div class="filesystem-files" aria-label="Files in this directory"></div><div class="file-document" aria-live="polite"></div></div></div><details class="shell-drawer"><summary>▸ terminal <span>bash · click to open</span></summary><div id="workbench-terminal"></div></details></div>`;
  const documentView=app.querySelector('.file-document');
  function fileAt(key,index){documentView.innerHTML=detail(entries[key][index],true);app.querySelectorAll('[data-file]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.file)===index)));changed(documentView);}
  showSection=key=>{selectButtons(key);app.querySelector('.filesystem-path').textContent=`~/michael/${key==='now'?'building-now':key==='fun'?'cool-stuff':key}/`;app.querySelector('.filesystem-files').innerHTML=entries[key].map((entry,index)=>`<button type="button" data-file="${index}" aria-pressed="false"><span aria-hidden="true">${icon('page',1)}</span>${entry.id}.md</button>`).join('');app.querySelectorAll('[data-file]').forEach(button=>button.addEventListener('click',()=>fileAt(key,Number(button.dataset.file))));fileAt(key,0);remember(key);};
  mountTerminal(document.getElementById('workbench-terminal'),{onOpen:key=>showSection(key),onExit:()=>{app.querySelector('.shell-drawer').open=false;}});
} else if(concept==='overworld') {
  app.innerHTML=header('PLAYER 01 / FREE ROAM','Take the scenic route.','The office, the workshop, the archive, the arcade. No grinding required.')+`<div id="portfolio-world"></div><div class="explorer-content world-reader" aria-live="polite"></div>`;
  const content=app.querySelector('.explorer-content');
  const world=mountOverworld(document.getElementById('portfolio-world'),{onSelect:key=>{content.innerHTML=sectionHTML(key);remember(key);changed(content);}});
  showSection=key=>world.select(key);
} else if(concept==='room') {
  app.innerHTML=header('PLAYER 01 / A ROOM OF MY OWN','Come on in.','I’m probably at the desk. There’s more to the room than meets the eye.')+`<div id="pixel-room"></div><nav class="room-quick-nav" aria-label="Explore the room"><button type="button" data-room-action="books">${icon('book')} the books</button><button type="button" data-room-action="computer">${icon('crt')} the computer</button><button type="button" data-room-action="now">${icon('page')} wall notes</button><button type="button" data-room-action="games">${icon('dpad')} the games</button></nav><div class="room-guide"><p><b>On the shelf</b> — work experience & past projects.</p><p><b>On the computer</b> — a little Linux terminal. Try <code>help</code>.</p><p><b>On the wall</b> — Auto Research, what I’m building now.</p></div>`;
  const room=mountRoom(document.getElementById('pixel-room'),{onBooks:()=>openReader('experience'),onComputer:openComputer,onNow:()=>openReader('now'),onGames:()=>openReader('fun')});
  app.querySelectorAll('[data-room-action]').forEach(button=>button.addEventListener('click',()=>room.activate(button.dataset.roomAction)));
  showSection=openReader;
} else if(concept==='bookshelf') {
  app.innerHTML=header('PLAYER 01 / THE PERSONAL LIBRARY','Pull up a chapter.','A small shelf of work, unfinished ideas, and the occasional side quest.')+`<nav class="personal-bookshelf" aria-label="Portfolio books">${keys.map((key,i)=>`<button type="button" class="shelf-book book-${i}" data-section="${key}" aria-pressed="false"><span class="book-spine-bands" aria-hidden="true"></span><span class="book-volume">VOL. 0${i+1}</span><span class="book-title">${sections[key].title}</span><span class="book-mark" aria-hidden="true">${icon(sections[key].icon,3)}</span><span class="book-author">MICHAEL ZHOU</span></button>`).join('')}</nav><div class="open-book"><div class="book-chapters"><h3>Contents</h3><div></div></div><div class="book-page" aria-live="polite"></div></div><div class="page-turner"><button type="button" data-page-direction="-1">← previous chapter</button><span data-page-number></span><button type="button" data-page-direction="1">next chapter →</button></div>`;
  let chapter=0;
  function readChapter(key,index){chapter=index;const entry=entries[key][index];app.querySelector('.book-page').innerHTML=`<p class="chapter-number">CHAPTER ${String(index+1).padStart(2,'0')}</p>`+detail(entry,true);app.querySelectorAll('[data-chapter]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.chapter)===index)));app.querySelector('[data-page-number]').textContent=`${index+1} / ${entries[key].length}`;app.querySelector('[data-page-direction="-1"]').disabled=index===0;app.querySelector('[data-page-direction="1"]').disabled=index===entries[key].length-1;changed(app.querySelector('.book-page'));}
  showSection=key=>{selectButtons(key);app.querySelector('.book-chapters > div').innerHTML=entries[key].map((entry,i)=>`<button type="button" data-chapter="${i}" aria-pressed="false"><span>${String(i+1).padStart(2,'0')}</span>${entry.title}</button>`).join('');app.querySelectorAll('[data-chapter]').forEach(button=>button.addEventListener('click',()=>readChapter(key,Number(button.dataset.chapter))));remember(key);readChapter(key,0);};
  app.querySelectorAll('[data-page-direction]').forEach(button=>button.addEventListener('click',()=>readChapter(current,chapter+Number(button.dataset.pageDirection))));
} else if(concept==='fieldboard') {
  const notes=[['experience','PLACES I’VE BEEN','DraftKings / Duke / Army / GMU'],['now','ON THE BENCH','Auto Research'],['projects','THINGS I’VE BUILT','Playground / benchmark / Amdahl'],['fun','TAKE A DETOUR','A lap of the Nürburgring?']];
  app.innerHTML=header('PLAYER 01 / WORK IN PROGRESS','Connect the dots.','Notes from a life spent opening too many tabs.')+`<div class="pinboard"><div class="board-string string-a" aria-hidden="true"></div><div class="board-string string-b" aria-hidden="true"></div>${notes.map(([key,title,text],i)=>`<button type="button" class="pinned-note note-${i}" data-note="${key}" aria-label="Open ${sections[key].title}"><span class="pin" aria-hidden="true"></span><span class="note-illustration" aria-hidden="true">${icon(sections[key].icon,4)}</span><span class="note-eyebrow">${title}</span><span class="note-title">${sections[key].title}</span><span class="note-description">${text}</span><span class="note-open">open file ↗</span></button>`).join('')}</div><div class="board-caption"><span>Click a note to open it. Drag to make a little mess.</span><button type="button" class="text-button" data-tidy>tidy the board ↻</button></div><div class="explorer-content board-reader" aria-live="polite"></div>`;
  const content=app.querySelector('.explorer-content');
  showSection=key=>{content.innerHTML=sectionHTML(key);app.querySelectorAll('[data-note]').forEach(button=>button.classList.toggle('note-selected',button.dataset.note===key));remember(key);changed(content);};
  app.querySelectorAll('[data-note]').forEach(button=>{
    let start=null,moved=false,offset={x:0,y:0};
    button.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')return;start={x:event.clientX,y:event.clientY,ox:offset.x,oy:offset.y};moved=false;button.setPointerCapture(event.pointerId);});
    button.addEventListener('pointermove',event=>{if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;if(!moved)return;const board=button.parentElement.getBoundingClientRect();offset.x=Math.max(-25,Math.min(25,start.ox+dx));offset.y=Math.max(-22,Math.min(22,start.oy+dy));button.style.translate=`${offset.x}px ${offset.y}px`;});
    button.addEventListener('pointerup',()=>{start=null;});
    button.addEventListener('pointercancel',()=>{start=null;});
    button.addEventListener('click',()=>{if(moved){moved=false;return;}showSection(button.dataset.note);});
    button.addEventListener('prototype:tidy',()=>{offset={x:0,y:0};button.style.translate='0px 0px';});
  });
  app.querySelector('[data-tidy]').addEventListener('click',()=>app.querySelectorAll('[data-note]').forEach(button=>button.dispatchEvent(new Event('prototype:tidy'))));
}

if(concept!=='room')showSection(current);
app.addEventListener('click',event=>{const button=event.target.closest('[data-section]');if(button)showSection(button.dataset.section);});
document.addEventListener('click',event=>{
  const play=event.target.closest('[data-game]');
  if(play){
    const slot=play.parentElement.querySelector(`[data-game-slot="${play.dataset.game}"]`);
    if(!slot || slot.querySelector('iframe'))return;
    const frame=document.createElement('iframe');
    frame.src=`./${play.dataset.game}.html`;
    frame.title=play.dataset.game==='race'?'Playable Nordschleife eval':'Playable Vim sprint';
    frame.className=`original-game-frame ${play.dataset.game}-frame`;
    frame.loading='eager';
    frame.addEventListener('load',()=>{
      const gameMain=frame.contentDocument.querySelector('main');
      const resize=()=>{if(frame.isConnected)frame.style.height=`${gameMain.scrollHeight+8}px`;};
      resize();
      const observer=new ResizeObserver(resize);
      observer.observe(gameMain);
      const removed=new MutationObserver(()=>{if(!frame.isConnected){observer.disconnect();removed.disconnect();}});
      removed.observe(slot,{childList:true});
    });
    slot.append(frame);play.disabled=true;play.textContent='Game open below ↓';
  }
});
// Keep the original sidebar and make its existing links lead into the prototype.
document.querySelectorAll('#site-index a').forEach(link=>link.addEventListener('click',event=>{
  const hash=link.getAttribute('href');
  const target={'#race':'fun','#projects':'projects','#experience':'experience'}[hash];
  if(!target)return;event.preventDefault();showSection(target);panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}));
const picker=document.getElementById('concept-picker');
picker.addEventListener('change',()=>{location.href=`./${picker.value}.html${document.body.classList.contains('prototype-focused')?'?focus=1':''}#explore`;});
const modeLink=document.createElement('a');
modeLink.href=document.body.classList.contains('prototype-focused')?`./${concept}.html#explore`:`./${concept}.html?focus=1#explore`;
modeLink.textContent=document.body.classList.contains('prototype-focused')?'view in the full site ↗':'focus on this concept ↗';
modeLink.className='prototype-mode-link';
panel.append(modeLink);
