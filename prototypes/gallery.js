import { concepts } from './content.js';
import { spriteSvg, SPRITES } from '../sprites.js';
import { paintRoom } from './room.js';
const icon=name=>spriteSvg(SPRITES[name]?name:'chest',{scale:2,color:'#b8a9ff'});
const mini = {
  room:'<canvas id="room-preview" width="384" height="280" aria-label="Isometric pixel desk room"></canvas>',
  cartridges:`<span class="mini-carts">${['book','sparkle','chest','dpad'].map(name=>`<i>${icon(name)}</i>`).join('')}</span>`,
  workbench:'<span class="mini-terminal">$ ls\nexperience/  building-now/\npast-projects/  cool-stuff/\n$ cat about.md ▌</span>',
  overworld:`<span class="mini-world">${['book','chest','page','dpad'].map(name=>`<i>${icon(name)}</i>`).join('')}</span>`,
  bookshelf:`<span class="mini-books">${['book','sparkle','chest','dpad'].map(name=>`<i>${icon(name)}</i>`).join('')}</span>`,
  fieldboard:`<span class="mini-board">${['page','book','dpad'].map(name=>`<i>${icon(name)}</i>`).join('')}</span>`,
};
const order=['room','cartridges','workbench','overworld','bookshelf','fieldboard'];
document.getElementById('concept-gallery').innerHTML=order.map(id=>{
  const c=concepts.find(c=>c.id===id);
  return `<article class="concept-card${id==='room'?' featured':''}"><a class="concept-preview" href="./${id}.html?focus=1#explore" aria-label="Try ${c.name}">${mini[id]}</a><div class="concept-copy">${id==='room'?'<p class="concept-badge">YOUR IDEA / ISOMETRIC EDITION</p>':''}<h2>${c.name}</h2><p class="concept-tag">${c.tag}</p><p class="concept-description">${c.description}</p><div class="concept-links"><a href="./${id}.html?focus=1#explore">try this concept →</a><a href="./${id}.html#explore">view in the full site ↗</a></div></div></article>`;
}).join('');
paintRoom(document.getElementById('room-preview'),{time:0,lamp:true});
