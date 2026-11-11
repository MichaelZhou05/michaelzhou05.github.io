import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { concepts } from './content.js';

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(here, '../index.html'), 'utf8');
const raceStart = source.indexOf('        <section id="race"');
const contactStart = source.indexOf('        <section id="contact"');
if (raceStart < 0 || contactStart < 0) throw new Error('Could not locate homepage boundaries.');
const raceEnd = source.indexOf('        <section id="projects"');
const race = source.slice(raceStart, raceEnd);
const vimStart = source.indexOf('          <article class="work work-feature">');
const vimEnd = source.indexOf('          </article>', vimStart) + '          </article>'.length;
const vim = source.slice(vimStart, vimEnd);
const relocate = html => html.replaceAll('src="./', 'src="../').replaceAll('href="./', 'href="../');

await mkdir(here, { recursive: true });
for (const concept of concepts) {
  const options = concepts.map(c => `<option value="${c.id}"${c.id === concept.id ? ' selected' : ''}>${c.name}</option>`).join('');
  let html = source.slice(0, raceStart) + `
        <section id="explore" class="panel prototype-panel" data-concept="${concept.id}">
          <noscript><p>This interactive prototype needs JavaScript. <a href="../index.html#experience">Read the original portfolio</a>.</p></noscript>
          <div id="prototype-app"></div>
        </section>
\n` + source.slice(contactStart);
  html = relocate(html)
    .replace('<title>Michael Zhou // student &amp; builder</title>', `<title>${concept.name} // Michael Zhou prototype</title>`)
    .replace('<link rel="stylesheet" href="../styles.css" />', '<link rel="stylesheet" href="../styles.css" />\n    <link rel="stylesheet" href="./prototype.css" />')
    .replace('<body id="top">', `<body id="top" class="prototype-page" data-prototype="${concept.id}">
    <nav class="prototype-switcher" aria-label="Prototype concepts"><a href="./index.html">← prototype lab</a><label>concept <select id="concept-picker">${options}</select></label><a href="#explore">jump to prototype ↓</a></nav>`)
    .replace('    <script type="module" src="../app.js"></script>', '    <script type="module" src="./prototype.js"></script>')
    .replace('    <script type="module" src="../vim-game.js"></script>\n', '');
  await writeFile(resolve(here, `${concept.id}.html`), html);
}
const gamePage = (title, content, script) => `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="stylesheet" href="../styles.css"><link rel="stylesheet" href="./prototype.css"></head>
<body class="game-embed"><main>${relocate(content)}</main><script type="module" src="../${script}"></script></body></html>`;
await writeFile(resolve(here, 'race.html'), gamePage('Nordschleife eval', race, 'app.js'));
await writeFile(resolve(here, 'vim.html'), gamePage('Race me in Vim', vim, 'vim-game.js'));
console.log('Built six complete prototype pages and two original game embeds.');
