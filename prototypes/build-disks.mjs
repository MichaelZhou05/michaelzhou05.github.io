import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const source=await readFile(resolve(here,'../index.html'),'utf8');
const start=source.indexOf('        <section id="race"'),end=source.indexOf('        <section id="contact"');
if(start<0||end<0)throw new Error('Homepage section boundaries not found.');
for(const id of ['graphite','platinum','studio']){
  let html=source.slice(0,start)+`        <section id="explore" class="panel disk-fullsite-panel"><div id="disk-study" data-only="${id}"><noscript>This disk prototype needs JavaScript. <a href="../index.html">Read the original portfolio</a>.</noscript></div></section>\n\n`+source.slice(end);
  html=html.replaceAll('src="./','src="../').replaceAll('href="./','href="../')
    .replace('<title>Michael Zhou // student &amp; builder</title>',`<title>${id==='studio'?'Night Shift':id[0].toUpperCase()+id.slice(1)} // Michael Zhou disk prototype</title>`)
    .replace('<link rel="stylesheet" href="../styles.css" />','<link rel="stylesheet" href="../styles.css" />\n    <link rel="stylesheet" href="./disk-studies.css" />')
    .replace('<body id="top">','<body id="top" class="disk-fullsite">')
    .replace('    <script type="module" src="../app.js"></script>','    <script type="module" src="./disk-studies.js"></script>')
    .replace('    <script type="module" src="../vim-game.js"></script>\n','');
  await writeFile(resolve(here,`disk-${id}.html`),html);
}
console.log('Built three disk insertion prototypes in the complete site.');
