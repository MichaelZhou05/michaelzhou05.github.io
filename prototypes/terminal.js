import { entries, sections } from './content.js';

const aliases = { work: 'experience', experience: 'experience', now: 'now', 'building-now': 'now', projects: 'projects', 'past-projects': 'projects', fun: 'fun', 'cool-stuff': 'fun' };
const directories = { experience: 'experience', now: 'building-now', projects: 'past-projects', fun: 'cool-stuff' };
const safe = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** A browser-local portfolio filesystem; input is text, never executed as code. */
export function mountTerminal(container, { onOpen = () => {}, onExit = () => {} } = {}) {
  let cwd = '/home/michael';
  let historyIndex = 0;
  const history = [];
  const home = '/home/michael';
  const files = {};
  for (const [section, list] of Object.entries(entries)) {
    for (const entry of list) files[`${home}/${directories[section]}/${entry.id}.md`] = `# ${entry.title}\n${entry.meta}\n\n${entry.description}\n\n${entry.body}\n\n${entry.stats.join(' · ')}\n${entry.tech}`;
  }
  files[`${home}/about.md`] = 'Michael Zhou\nDuke ’28 · Electrical & Computer Engineering + Computer Science\n\nI mostly code in C++, Python, and C#, plus Rust when latency matters.\nEspresso geek. Six of seven continents in 2025.\n\nmichael.zhou@duke.edu';
  files[`${home}/README.md`] = 'Welcome to my corner of the internet.\n\nexperience/     internships and research\nbuilding-now/   Auto Research\npast-projects/  things I have built\ncool-stuff/     the racing eval and Vim game\n\nTry: cd experience\n     ls\n     cat draftkings.md\n\nUse open experience to switch to the visual reader.';
  const resolve = (path = '.') => {
    const absolute = path.startsWith('~') ? home + path.slice(1) : path.startsWith('/') ? path : `${cwd}/${path}`;
    const parts = [];
    for (const part of absolute.split('/')) {
      if (part === '..') parts.pop();
      else if (part && part !== '.') parts.push(part);
    }
    return '/' + parts.join('/');
  };
  const isDir = path => path === '/' || path === '/home' || path === home || Object.values(directories).some(d => path === `${home}/${d}`);
  const list = path => {
    const prefix = path === '/' ? '/' : path + '/';
    const result = new Set();
    Object.keys(files).forEach(file => {
      if (!file.startsWith(prefix)) return;
      const rest = file.slice(prefix.length);
      const [part] = rest.split('/');
      result.add(part + (rest.includes('/') ? '/' : ''));
    });
    return [...result].sort();
  };
  const sectionAt = path => Object.entries(directories).find(([, directory]) => path === `${home}/${directory}` || path.startsWith(`${home}/${directory}/`))?.[0];
  container.innerHTML = `<div class="shell-terminal"><div class="terminal-output" role="log" aria-label="Terminal output" aria-live="polite"></div><form class="terminal-form"><label class="terminal-prompt" for="${container.id}-input"></label><input id="${container.id}-input" class="terminal-input" aria-label="Terminal command" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="submit" class="terminal-run">↵<span class="sr-only">Run command</span></button></form><div class="terminal-shortcuts" aria-label="Terminal shortcuts"><button type="button" data-command="help">help</button><button type="button" data-command="ls">ls</button><button type="button" data-command="cat ~/README.md">readme</button><button type="button" data-command="open now">current build ↗</button></div></div>`;
  const output = container.querySelector('.terminal-output');
  const input = container.querySelector('input');
  const prompt = container.querySelector('.terminal-prompt');
  const promptText = () => `michael@portfolio:${cwd.replace(home, '~')}$`;
  function print(text, type = '') {
    const line = document.createElement('pre');
    line.className = type;
    line.textContent = text;
    output.append(line);
    while (output.children.length > 65) output.firstChild.remove();
    output.scrollTop = output.scrollHeight;
  }
  function run(raw) {
    const command = raw.trim();
    if (!command) return;
    history.push(command);
    historyIndex = history.length;
    print(`${promptText()} ${command}`, 'terminal-echo');
    const [verb, ...args] = command.split(/\s+/);
    const arg = args.join(' ');
    switch (verb) {
      case 'help':
        print('ls [path]        list the files\ncd [directory]   move around (.. and ~ work)\npwd              show your location\ncat <file>       read a file\ntree             show the collection\nopen <section>   open the visual reader\nwhoami           a short introduction\necho <text>      say something\nhistory          previous commands\nclear            clear the screen\nexit             return to the room\n\nTab completes paths. ↑/↓ browses command history.\nSections: experience, now, projects, fun'); break;
      case 'ls': {
        const target = resolve(args.find(a => !a.startsWith('-')) || '.');
        print(isDir(target) ? list(target).join('  ') || '(empty)' : files[target] ? target.split('/').pop() : `ls: ${arg}: no such file or directory`); break;
      }
      case 'cd': {
        const target = resolve(arg || '~');
        if (isDir(target)) cwd = target;
        else print(`cd: ${arg}: no such directory`, 'terminal-error');
        break;
      }
      case 'pwd': print(cwd); break;
      case 'cat': {
        if (!arg) { print('usage: cat <filename>', 'terminal-error'); break; }
        const target = resolve(arg);
        print(files[target] ?? (isDir(target) ? `cat: ${arg}: is a directory` : `cat: ${arg}: no such file`)); break;
      }
      case 'tree': print('~\n├── about.md\n├── README.md\n' + Object.entries(directories).map(([key, dir], index) => `${index === 3 ? '└' : '├'}── ${dir}/\n${entries[key].map(e => `${index === 3 ? ' ' : '│'}   └── ${e.id}.md`).join('\n')}`).join('\n')); break;
      case 'open': {
        const target = aliases[arg] || sectionAt(resolve(arg || '.'));
        if (target) { print(`Opening ${sections[target].title}…`, 'terminal-success'); onOpen(target); }
        else print('usage: open experience | now | projects | fun', 'terminal-error');
        break;
      }
      case 'whoami': print(files[`${home}/about.md`]); break;
      case 'uname': print('Portfolio GNU/Linux · pixel kernel 0.1 · browser-local shell'); break;
      case 'date': print(new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }).format(new Date()) + ' HKT'); break;
      case 'echo': print(arg); break;
      case 'history': print(history.map((c, i) => `${String(i + 1).padStart(3)}  ${c}`).join('\n')); break;
      case 'clear': output.replaceChildren(); break;
      case 'exit': onExit(); break;
      case 'sudo': print('Nice try. You already have all the permissions you need to read this portfolio.'); break;
      case 'neofetch': print('       /\\        michael@portfolio\n      /  \\       -----------------\n     / /\\ \\      OS: Portfolio Linux\n    / ____ \\     Shell: browser-local\n   /_/    \\_\\    Build: Auto Research\n                  Coffee: probably'); break;
      case 'man': print('A small shell for exploring my portfolio. Type help for the supported commands.'); break;
      default: print(`${verb}: command not found. Type help to look around.`, 'terminal-error');
    }
    prompt.textContent = promptText();
    input.value = '';
  }
  container.querySelector('form').addEventListener('submit', event => { event.preventDefault(); run(input.value); });
  container.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => { run(button.dataset.command); input.focus({ preventScroll: true }); }));
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
      input.value = history[historyIndex] || '';
      input.setSelectionRange(input.value.length, input.value.length);
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const match = input.value.match(/^(.*?)([^\s]*)$/);
      const word = match[2];
      const slash = word.lastIndexOf('/');
      const base = slash >= 0 ? word.slice(0, slash + 1) : '';
      const partial = slash >= 0 ? word.slice(slash + 1) : word;
      const choices = list(resolve(base || '.')).filter(name => name.startsWith(partial));
      if (choices.length === 1) input.value = match[1] + base + choices[0];
      else if (choices.length) print(choices.join('  '));
    }
    if (event.ctrlKey && event.key === 'l') { event.preventDefault(); output.replaceChildren(); }
  });
  prompt.textContent = promptText();
  print('Portfolio Linux 0.1 · welcome, visitor', 'terminal-success');
  print('Local portfolio shell. Type help, or start with ls.');
  print('Tip: cat README.md');
  return { run, focus: () => input.focus({ preventScroll: true }), print, escape: safe };
}
