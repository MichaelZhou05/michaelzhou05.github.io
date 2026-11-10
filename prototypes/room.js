/** Pixel-native isometric scene. The same fillRect approach as espresso.js,
 * with integer polygon surfaces for the room and furniture. No external art. */
const C = {
  bg:'#0b0a12', edge:'#08070c', wall:'#302b45', wallLight:'#3e3656', wallDark:'#201d31',
  trim:'#5d506e', wood:'#a9793f', woodLight:'#c99a60', woodDark:'#6e4d28', woodDeep:'#43301a',
  purple:'#7b68ee', purpleDark:'#483b86', cream:'#e8dcc4', ink:'#e8e4f4', green:'#2ed573',
  greenDark:'#143f35', amber:'#ffb000', red:'#e60012', steel:'#8a849f', night:'#101126',
};
const iso = (x,y,z=0) => [Math.round(192 + (x-y)*14), Math.round(110+(x+y)*7-z)];
const spotPositions = {
  books: [122,104], computer:[226,102], now:[295,110], games:[238,192], lamp:[257,110], cat:[132,180],
};
export const roomSpots = [
  {id:'books',label:'Bookshelf · work experience',short:'Work experience',x:122,y:104,w:59,h:77},
  {id:'computer',label:'Computer · open Linux terminal',short:'Open computer',x:224,y:102,w:43,h:48},
  {id:'now',label:'Wall notes · Auto Research',short:'Building now',x:295,y:110,w:51,h:53},
  {id:'games',label:'Game console · cool stuff',short:'Cool stuff',x:238,y:192,w:51,h:40},
  {id:'lamp',label:'Desk lamp · toggle the light',short:'Toggle lamp',x:257,y:110,w:19,h:31},
  {id:'cat',label:'Sleeping cat · say hello',short:'Pet the cat',x:132,y:180,w:26,h:21},
];

export function paintRoom(canvas, {time=0, highlighted='', lamp=true, pet=false} = {}) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const poly=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();};
  const line=(points,color,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.stroke();};
  const box=(x,y,w,d,z,h,top=C.woodLight,left=C.woodDark,right=C.wood)=>{
    poly([iso(x,y,z+h),iso(x+w,y,z+h),iso(x+w,y+d,z+h),iso(x,y+d,z+h)],top);
    poly([iso(x,y+d,z),iso(x+w,y+d,z),iso(x+w,y+d,z+h),iso(x,y+d,z+h)],left);
    poly([iso(x+w,y,z),iso(x+w,y+d,z),iso(x+w,y+d,z+h),iso(x+w,y,z+h)],right);
  };
  const wallPaper = (x,y,w,h,z,color) => poly([iso(x,y,z),iso(x+w,y,z),iso(x+w,y,z+h),iso(x,y,z+h)],color);
  rect(0,0,384,280,C.bg);
  // Faint pixels outside the diorama, not a second illustration style.
  for(let i=0;i<40;i++) rect(12+(i*71)%357,12+(i*37)%245,1,1,i%5===0?'#3a2f6e':'#1a1727');
  // Floor slab and the two tall, cutaway back walls.
  box(0,0,10,9,-7,7,C.woodDark,C.woodDeep,'#332519');
  for(let y=0;y<9;y++) for(let x=0;x<10;x++) {
    poly([iso(x,y),iso(x+1,y),iso(x+1,y+1),iso(x,y+1)],['#775132','#805a36','#8a613c','#755033'][(x*3+y)%4]);
    line([iso(x,y),iso(x+1,y)],'#9c7145');
    if((x+y)%3===0) line([iso(x+.2,y+.5),iso(x+.7,y+.5)],'#6b472d');
  }
  poly([iso(0,0),iso(10,0),iso(10,0,99),iso(0,0,99)],C.wallLight);
  poly([iso(0,0),iso(0,9),iso(0,9,99),iso(0,0,99)],C.wall);
  line([iso(0,9,99),iso(0,0,99),iso(10,0,99)],'#685b7e',3);
  line([iso(0,9,3),iso(0,0,3),iso(10,0,3)],'#17131f',4);
  // Window on the left wall, city lights outside.
  poly([iso(0,1.15,44),iso(0,3.6,44),iso(0,3.6,84),iso(0,1.15,84)],'#756689');
  poly([iso(.05,1.32,47),iso(.05,3.43,47),iso(.05,3.43,81),iso(.05,1.32,81)],C.night);
  for(let i=0;i<14;i++) {
    const y=1.45+(i%7)*.28;
    const z=49+Math.floor(i/7)*15+(i%3)*2;
    const p=iso(.07,y,z);rect(p[0],p[1],1,1,i%3===0?C.amber:'#7f7dba');
  }
  line([iso(.1,2.35,46),iso(.1,2.35,82)],'#655978',2);
  line([iso(.1,1.2,63),iso(.1,3.5,63)],'#655978',2);
  box(0,1.05,.4,2.7,43,3,'#9d8eac','#665773','#847493');
  // A corkboard with notes on the right wall; the green slip is the active build.
  wallPaper(6.45,.06,2.6,35,48,'#211b26');
  wallPaper(6.58,.1,2.34,31,50,'#8f6545');
  wallPaper(6.8,.14,.8,12,65,C.cream);
  wallPaper(7.85,.14,.8,13,58,'#c8b9e2');
  wallPaper(6.9,.16,.78,10,52,'#b8ca90');
  for(const [x,z] of [[7.1,75],[8.1,69],[7.2,60]]) {const p=iso(x,.18,z);rect(p[0],p[1],2,2,C.red);}
  // Bookshelf: dark inner cavities, wooden shelves, individual voxel books.
  box(.2,4.15,1.0,3.2,0,80,C.woodLight,C.woodDeep,C.woodDark);
  box(1.22,4.13,.13,3.3,0,80,C.woodLight,C.wood,C.woodDark);
  for(const z of [8,31,55,79]) box(.2,4.12,1.2,3.35,z,3,C.woodLight,C.woodDark,C.wood);
  const bookColors=['#61529b','#d5ac61','#73918e','#9c5753','#c6baa0','#5c749a'];
  for(const z of [11,34,58]) for(let i=0;i<7;i++) {
    const yy=4.28+i*.4, hh=12+(i*7)%7;
    box(.78,yy,.48,.29,z,hh,bookColors[i%6],bookColors[i%6],'#30293f');
    const p=iso(1.28,yy+.14,z+hh-3);rect(p[0],p[1],2,1,'#e8dcc4');
  }
  // Tiny plant above the shelf.
  box(.44,5.25,.55,.55,82,6,'#c09d75','#886346','#a97952');
  for(const [dx,dy,zz] of [[0,0,94],[.3,.1,97],[-.2,.3,93],[.1,.4,99]]) {
    const p=iso(.65+dx,5.45+dy,zz);rect(p[0]-2,p[1]-3,5,6,'#60876a');rect(p[0],p[1]-2,2,4,'#90ad78');
  }
  // Rug, laid on the floor beneath the chair.
  poly([iso(3.1,4.5,.4),iso(7.2,4.5,.4),iso(7.2,7.45,.4),iso(3.1,7.45,.4)],'#302743');
  poly([iso(3.3,4.7,.5),iso(7,4.7,.5),iso(7,7.25,.5),iso(3.3,7.25,.5)],'#4d3e68');
  for(let i=0;i<5;i++)line([iso(3.5+i*.7,4.9,1),iso(3.5+i*.7,7.0,1)],'#5e4d7b');
  // Desk legs, drawer, and heavy tabletop.
  for(const [x,y] of [[3.15,2.1],[6.75,2.1],[3.15,3.72],[6.75,3.72]])box(x,y,.24,.24,0,39,C.woodLight,C.woodDeep,C.woodDark);
  box(6.15,2.2,.9,1.4,13,24,C.wood,C.woodDeep,C.woodDark);
  box(3,1.9,4.25,2.25,39,4,C.woodLight,C.woodDark,C.wood);
  // CRT base, case and sloping glass.
  box(4.6,2.4,1.25,.85,43,2,'#8b839a','#423d50','#635b71');
  box(4.9,2.55,.55,.45,45,5,'#6a627e','#423d50','#51495f');
  box(4.48,2.25,1.6,.75,49,23,'#968aa8','#51495f','#736882');
  const screenY=3.035;
  poly([iso(4.62,screenY,52),iso(5.94,screenY,52),iso(5.94,screenY,69),iso(4.62,screenY,69)],'#122a29');
  for(let i=0;i<6;i++) line([iso(4.73,screenY+.01,65-i*2),iso(4.98+(i%3)*.26,screenY+.01,65-i*2)],i===0?'#a7e3ac':'#4e9c76');
  const led=iso(5.93,3.05,50);rect(led[0],led[1],1,1,C.green);
  // Keyboard and mug on the desk.
  box(4.52,3.25,1.55,.45,43,1,'#a399af','#61596d','#80758e');
  for(let i=0;i<6;i++){const p=iso(4.62+i*.22,3.45,45);rect(p[0],p[1],2,1,'#51495f');}
  box(3.3,3.3,.8,.6,43,1,'#ddd0b0','#a7997b','#b7aa8e');
  for(let i=0;i<3;i++)line([iso(3.4,3.5+i*.12,45),iso(3.85,3.5+i*.12,45)],'#7a7480');
  const mug=iso(6.45,3.35,45);rect(mug[0]-3,mug[1]-6,7,7,C.cream);rect(mug[0]-2,mug[1]-6,5,2,'#583a29');rect(mug[0]+4,mug[1]-4,2,4,'#bbac95');
  // Desk lamp: warm light is a few stepped, opaque pixel surfaces.
  const lp=iso(6.85,2.23,45);rect(lp[0]-4,lp[1]-1,9,2,'#61596e');rect(lp[0],lp[1]-22,2,22,'#a69bb0');
  rect(lp[0]-9,lp[1]-25,12,3,lamp?'#d8ac68':'#7e7167');rect(lp[0]-12,lp[1]-22,12,5,lamp?'#ffcf81':'#a89071');
  if(lamp){rect(lp[0]-12,lp[1]-17,12,2,'#ffe1a3');const p=iso(6.3,2.8,43);poly([[p[0]-10,p[1]],[p[0]+9,p[1]+9],[p[0]+17,p[1]+3],[p[0]-3,p[1]-7]],'#c99a60');}
  // Chair and player, seen over their shoulder, facing the computer.
  box(5,4.55,1.4,1.35,12,8,'#302b45','#1b1726','#231e32');
  box(5.05,5.52,1.35,.22,18,20,'#4a3c65','#302541','#382d50');
  const person=iso(5.6,4.95,33);
  rect(person[0]-6,person[1]-9,13,12,'#6553a1');rect(person[0]-8,person[1]-7,3,8,'#a889bf');rect(person[0]+6,person[1]-7,3,7,'#a889bf');
  rect(person[0]-5,person[1]-23,11,12,'#e6b18b');rect(person[0]-6,person[1]-25,12,6,'#d42a38');rect(person[0]-7,person[1]-21,15,3,'#a11e30');rect(person[0]-4,person[1]-18,9,4,'#382d30');
  // Console / arcade corner on the floor to the right.
  box(8,4.45,1.5,1.6,0,19,'#73667f','#352d43','#54475f');
  box(8.1,4.5,1.1,.55,19,4,'#aaa0ae','#5d5267','#82778f');
  const gp=iso(8.68,5.5,21);rect(gp[0]-7,gp[1]-3,15,6,'#b0a4b4');rect(gp[0]-4,gp[1]-2,2,4,'#302637');rect(gp[0]-5,gp[1]-1,4,2,'#302637');rect(gp[0]+4,gp[1]-1,2,2,C.red);
  // Stack of old cartridges beside it.
  for(let i=0;i<3;i++) box(8.15,6.4,.75,.85,i*3,3,['#7b68ee','#b58b45','#658878'][i],'#393043','#5b4d68');
  // Cat curled up on the warm floor.
  const cp=iso(3,7.3,2);rect(cp[0]-7,cp[1]-3,15,6,'#e6d8be');rect(cp[0]-8,cp[1]-5,6,5,'#c29160');rect(cp[0]-8,cp[1]-7,2,3,'#e6d8be');rect(cp[0]-4,cp[1]-7,2,3,'#e6d8be');rect(cp[0]+5,cp[1],5,2,'#c29160');
  if(pet){rect(cp[0]-1,cp[1]-14,2,2,'#ed91b6');rect(cp[0]+2,cp[1]-14,2,2,'#ed91b6');rect(cp[0],cp[1]-12,3,2,'#ed91b6');}
  else if(Math.floor(time/1500)%2===0){rect(cp[0]+3,cp[1]-14,4,1,'#9d97b3');rect(cp[0]+5,cp[1]-13,1,2,'#9d97b3');rect(cp[0]+3,cp[1]-11,4,1,'#9d97b3');}
  // A small carpet near the front cutaway.
  poly([iso(5.5,7.75,.5),iso(7.7,7.75,.5),iso(7.7,8.65,.5),iso(5.5,8.65,.5)],'#b69d75');
  line([iso(5.65,8,.7),iso(7.55,8,.7)],'#7b6350');
  // Steam is deliberately a two-frame pixel gesture, like the coffee game.
  for(let i=0;i<3;i++){const shift=Math.floor(time/600+i)%2;rect(mug[0]-1+shift,mug[1]-10-i*4,1,2,'#a59aa0');}
  if(!lamp) {ctx.fillStyle='#05041155';ctx.fillRect(0,0,384,280);}
  // Selection brackets are the only UI painted over the room itself.
  const pos=spotPositions[highlighted];
  if(pos){const [x,y]=pos;for(const sx of [-1,1])for(const sy of [-1,1]){rect(x+sx*19-(sx>0?4:0),y+sy*15,5,1,C.amber);rect(x+sx*19,y+sy*15-(sy>0?4:0),1,5,C.amber);}}
}

export function mountRoom(container, {onBooks, onComputer, onNow, onGames} = {}) {
  container.innerHTML = `<div class="room-frame"><div class="room-topline"><span><i class="live-dot"></i>MICHAEL'S ROOM</span><span>point & click · all doors open</span></div><div class="room-scene"><canvas width="384" height="280" aria-label="Isometric pixel room: Michael at a computer desk, a bookshelf on the left, project notes on the wall, a game console, and a sleeping cat."></canvas><div class="room-hotspots">${roomSpots.map(spot=>`<button type="button" class="room-hotspot" data-object="${spot.id}" aria-label="${spot.label}" style="left:${(spot.x-spot.w/2)/384*100}%;top:${(spot.y-spot.h/2)/280*100}%;width:${spot.w/384*100}%;height:${spot.h/280*100}%"><span>${spot.short}</span></button>`).join('')}</div></div><p class="room-hint" aria-live="polite"><span>⌖</span> Make yourself at home. Try the books or the computer.</p></div>`;
  const canvas=container.querySelector('canvas');
  const state={highlighted:'',lamp:true,pet:false,time:0};
  const hint=container.querySelector('.room-hint');
  const actions={books:onBooks,computer:onComputer,now:onNow,games:onGames,lamp:()=>{state.lamp=!state.lamp;hint.textContent=state.lamp?'The desk lamp is on. Back to building.':'Late-night mode. The monitor is still on.';},cat:()=>{state.pet=true;hint.textContent='A very small purr. A very good cat.';clearTimeout(petTimer);petTimer=setTimeout(()=>{state.pet=false;paintRoom(canvas,state);},2600);}};
  let petTimer;
  function activate(id){actions[id]?.();paintRoom(canvas,state);}
  container.querySelectorAll('[data-object]').forEach(button=>{
    const update=()=>{state.highlighted=button.dataset.object;hint.textContent=button.getAttribute('aria-label');paintRoom(canvas,state);};
    button.addEventListener('pointerenter',update);button.addEventListener('focus',update);
    button.addEventListener('pointerleave',()=>{state.highlighted='';paintRoom(canvas,state);});
    button.addEventListener('click',()=>activate(button.dataset.object));
  });
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible=false,frame=0,previous=0;
  function tick(time){frame=0;if(!visible||document.hidden)return;if(time-previous>180){previous=time;state.time=time;paintRoom(canvas,state);}frame=requestAnimationFrame(tick);}
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible&&!reduced&&!frame)frame=requestAnimationFrame(tick);else if(!visible){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'100px'});
  observer.observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else if(visible&&!reduced&&!frame)frame=requestAnimationFrame(tick);});
  paintRoom(canvas,state);
  return {activate};
}
