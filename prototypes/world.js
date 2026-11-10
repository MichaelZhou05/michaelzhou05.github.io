import { sections } from './content.js';

const places=[
  {id:'experience',name:'Work experience',x:77,y:66,color:'#bca777',label:'THE OFFICE'},
  {id:'now',name:'Building now',x:237,y:61,color:'#8f81bc',label:'THE WORKSHOP'},
  {id:'projects',name:'Past projects',x:80,y:153,color:'#91a48a',label:'THE ARCHIVE'},
  {id:'fun',name:'Cool stuff',x:242,y:153,color:'#bb7d78',label:'THE ARCADE'},
];
export function mountOverworld(container,{onSelect}) {
  container.innerHTML=`<div class="world-frame"><div class="room-topline"><span>MICHAEL'S CORNER OF THE INTERNET</span><span>all areas unlocked</span></div><div class="world-scene"><canvas width="320" height="208" tabindex="0" role="img" aria-label="Pixel map with an office, workshop, archive, and arcade. Use arrow keys to walk and Enter to explore the nearest building, or click a labeled destination."></canvas>${places.map(p=>`<button type="button" class="world-destination" data-place="${p.id}" aria-label="Explore ${p.name}" style="left:${p.x/320*100}%;top:${(p.y-10)/208*100}%"><span>${p.label}</span><small>${p.name}</small></button>`).join('')}</div><p class="world-hint">Click a destination · or focus the map, walk with ↑ ↓ ← →, and press Enter</p></div>`;
  const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  let selected='experience',avatar={x:160,y:106},animation=0;
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  function draw(){
    rect(0,0,320,208,'#151c22');
    for(let y=0;y<208;y+=8)for(let x=0;x<320;x+=8){rect(x,y,8,8,(x*7+y*3)%24===0?'#273534':'#22302f');if((x+y)%32===0){rect(x+2,y+3,1,2,'#4b5a44');rect(x+4,y+2,1,2,'#374a3d');}}
    rect(72,95,176,19,'#a3906d');rect(151,50,18,126,'#a3906d');
    for(let x=76;x<247;x+=12)rect(x,99+(x%3),4,2,'#c0a983');
    for(let y=51;y<174;y+=11)rect(156,y,3,2,'#c0a983');
    // Pond and stepping stones.
    rect(261,88,48,27,'#253b51');rect(266,85,36,33,'#2d4961');rect(273,92,17,1,'#5d7894');rect(282,108,14,1,'#5d7894');
    for(const [x,y]of [[21,36],[16,137],[297,40],[285,183],[183,26],[118,181],[185,172],[32,179],[32,78]]){
      rect(x+3,y+13,4,8,'#5b4437');rect(x-2,y+4,14,13,'#244534');rect(x,y,10,14,'#42634a');rect(x+3,y-4,4,9,'#5c7754');
    }
    for(const p of places){
      rect(p.x-25,p.y-18,51,35,'#15141d');rect(p.x-22,p.y-19,45,31,p.color);rect(p.x-25,p.y-30,51,12,'#41364d');rect(p.x-20,p.y-35,40,7,'#5b4b69');
      rect(p.x-5,p.y-3,10,15,'#2c2537');rect(p.x-17,p.y-11,8,8,p.id==='now'?'#e5b665':'#d4d2ba');rect(p.x+10,p.y-11,8,8,'#d4d2ba');
      rect(p.x-14,p.y-11,1,8,'#75687c');rect(p.x+13,p.y-11,1,8,'#75687c');
      if(p.id===selected){rect(p.x-3,p.y-44,7,3,'#ffb000');rect(p.x-1,p.y-41,3,3,'#ffb000');}
    }
    rect(avatar.x-5,avatar.y+8,11,3,'#18251e');rect(avatar.x-3,avatar.y+3,3,6,'#282034');rect(avatar.x+1,avatar.y+3,3,6,'#282034');rect(avatar.x-4,avatar.y-4,9,8,'#7b68ee');rect(avatar.x-3,avatar.y-10,7,6,'#e4b18e');rect(avatar.x-4,avatar.y-12,9,4,'#d52c3e');rect(avatar.x-5,avatar.y-9,11,2,'#b22132');
  }
  function select(key){
    selected=key;
    const p=places.find(place=>place.id===key);
    const from={...avatar},to={x:p.x,y:p.y+24};
    cancelAnimationFrame(animation);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){avatar=to;draw();}
    else {const start=performance.now();const walk=t=>{const f=Math.min(1,(t-start)/360);avatar={x:from.x+(to.x-from.x)*f,y:from.y+(to.y-from.y)*f};draw();if(f<1)animation=requestAnimationFrame(walk);};animation=requestAnimationFrame(walk);}
    container.querySelectorAll('[data-place]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.place===key)));
    onSelect(key);
  }
  container.querySelectorAll('[data-place]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.place)));
  canvas.addEventListener('keydown',event=>{
    const movement={ArrowUp:[0,-6],ArrowDown:[0,6],ArrowLeft:[-6,0],ArrowRight:[6,0]}[event.key];
    if(movement){event.preventDefault();cancelAnimationFrame(animation);avatar.x=Math.max(10,Math.min(310,avatar.x+movement[0]));avatar.y=Math.max(12,Math.min(197,avatar.y+movement[1]));draw();}
    if(event.key==='Enter'){event.preventDefault();const nearest=[...places].sort((a,b)=>Math.hypot(a.x-avatar.x,a.y-avatar.y)-Math.hypot(b.x-avatar.x,b.y-avatar.y))[0];select(nearest.id);}
  });
  draw();
  return {select};
}
