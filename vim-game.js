/**
 * race me in vim — the learn-neovim card's game, native to this page.
 *
 * The full trainer (michaelzhou05.github.io/learnNvim/) explains and teaches;
 * this is a race. One buffer, one fixed course of twelve marks — reach the
 * block, or repair the typo it points at — against Michael's lap time. The
 * course is identical for every visitor, which is the only reason the times
 * mean anything.
 *
 * The engine is a deliberately small vim: counted motions, f/t finds,
 * paragraph jumps, and exactly the repairs the course asks for (x, r, ciw)
 * plus u, because a botched edit with no undo is a run ruined by the game
 * rather than the driver. Arrows quietly alias to hjkl — a race should be
 * lost on speed, not on doctrine.
 */

const win = document.querySelector('.vim-window');
const screen = document.getElementById('vim-screen');
const buffer = document.getElementById('vim-buffer');
const modeEl = document.getElementById('vim-mode');
const hintEl = document.getElementById('vim-hint');
const progressEl = document.getElementById('vim-progress');
const clockEl = document.getElementById('vim-clock');
const rivalEl = document.getElementById('vim-rival');
const overlay = document.getElementById('vim-overlay');
const intro = document.getElementById('vim-intro');
const results = document.getElementById('vim-results');

if (win && screen && buffer) init();

function init() {
  const RIVAL = Number(win.dataset.rivalTime) || 60;
  const STORE_KEY = 'mz.vimrace';

  /* The set codebase — taskpy, the little todo manager the full trainer is
     built around. Fixed text, so the course below can point into it. */
  const CLEAN = [
    '"""taskpy — the tiny todo manager from the trainer."""',
    'from tasks.storage import load_tasks, save_tasks',
    'from tasks.utils import slugify, timestamp',
    '',
    'PRIORITIES = ("low", "normal", "high", "urgent")',
    '',
    'def add_task(title, priority="normal", tags=None):',
    '    tasks = load_tasks()',
    '    task = {',
    '        "id": slugify(title),',
    '        "title": title.strip(),',
    '        "priority": priority,',
    '        "created": timestamp(),',
    '        "done": False,',
    '    }',
    '    tasks.append(task)',
    '    save_tasks(tasks)',
    '    return task',
    '',
    'def complete(task_id):',
    '    for task in load_tasks():',
    '        if task["id"] == task_id:',
    '            task["done"] = True',
  ];

  /**
   * The course. A mark names a word on a line rather than a column, so the
   * buffer text above can be reworded without re-counting characters. Kinds:
   *   go   — put the cursor on the block
   *   r    — one wrong letter, replaced (built by swapping word[at] for `wrong`)
   *   x    — one extra letter, deleted  (built by doubling word[at])
   *   ciw  — one wrong word, retyped    (built by swapping the word for `wrong`)
   * The walk zig-zags a few lines at a time, up as often as down, so a lap
   * feels like editing rather than teleporting.
   */
  const COURSE = [
    { kind: 'go', row: 4, word: 'high' },
    { kind: 'r', row: 1, word: 'storage', at: 4, wrong: 'q' },
    { kind: 'go', row: 7, word: 'load_tasks' },
    { kind: 'x', row: 10, word: 'title', at: 3 },
    { kind: 'go', row: 14, word: '}' },
    { kind: 'ciw', row: 11, word: 'priority', wrong: 'proirity' },
    { kind: 'go', row: 16, word: 'save_tasks' },
    { kind: 'r', row: 12, word: 'created', at: 4, wrong: 'z' },
    { kind: 'go', row: 19, word: 'complete' },
    { kind: 'x', row: 20, word: 'load_tasks', at: 9 },
    { kind: 'go', row: 22, word: 'True' },
    { kind: 'ciw', row: 21, word: 'task_id', wrong: 'tsak_id' },
  ];

  const HINTS = {
    go: 'reach the block',
    r: 'wrong letter — r rewrites one',
    x: 'extra letter — x deletes',
    ciw: 'wrong word — ciw retypes it',
  };

  const S = {
    lines: [], row: 0, col: 0, want: 0, mode: 'normal',
    count: '', op: '', opPend: '', pendingG: false, pendingR: false,
    pendingFind: '', lastFind: null, history: [],
    mark: null, cleared: 0, keys: 0, t0: 0, timer: 0, running: false,
  };

  const cls = (ch) => (/\s/.test(ch) ? 0 : /\w/.test(ch) ? 1 : 2);
  const line = () => S.lines[S.row];
  const lineLen = () => line().length;
  const lastCol = (l) => Math.max(0, l.length - 1);
  const firstNonBlank = (l) => Math.max(0, l.search(/\S/));
  const clampRow = (r) => Math.max(0, Math.min(S.lines.length - 1, r));
  const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ----------------------------------------------------------- the course */

  function setMark(spec) {
    const start = CLEAN[spec.row].indexOf(spec.word);
    const mark = { ...spec, start, col: start };
    if (spec.kind === 'r') {
      mark.corrupt = spec.word.slice(0, spec.at) + spec.wrong + spec.word.slice(spec.at + 1);
      mark.col = start + spec.at;
    } else if (spec.kind === 'x') {
      mark.corrupt = spec.word.slice(0, spec.at) + spec.word[spec.at] + spec.word.slice(spec.at);
      mark.col = start + spec.at;
    } else if (spec.kind === 'ciw') {
      mark.corrupt = spec.wrong;
    }
    if (mark.corrupt) {
      mark.label = `${mark.corrupt} → ${spec.word}`;
      S.lines[spec.row] =
        CLEAN[spec.row].slice(0, start) + mark.corrupt + CLEAN[spec.row].slice(start + spec.word.length);
    }
    S.mark = mark;
    hintEl.textContent = HINTS[spec.kind];
    progressEl.textContent = `mark ${String(S.cleared + 1).padStart(2, '0')}/${COURSE.length}`;
  }

  function advance() {
    S.cleared += 1;
    if (S.cleared >= COURSE.length) finish();
    else setMark(COURSE[S.cleared]);
  }

  function checkGo() {
    if (S.mark?.kind === 'go' && S.row === S.mark.row && S.col === S.mark.col) advance();
  }

  function checkRepair() {
    if (S.mark && S.mark.kind !== 'go' && S.mode === 'normal' && S.lines[S.mark.row] === CLEAN[S.mark.row]) {
      advance();
    }
  }

  /* ----------------------------------------------------------- the engine */

  function pushHistory() {
    S.history.push({ lines: S.lines.slice(), row: S.row, col: S.col });
    if (S.history.length > 100) S.history.shift();
  }

  function undo() {
    const past = S.history.pop();
    if (!past) return;
    S.lines = past.lines;
    S.row = past.row;
    S.col = past.col;
    S.want = S.col;
  }

  function setMode(mode) {
    S.mode = mode;
    modeEl.textContent = mode === 'insert' ? '-- INSERT --' : '-- NORMAL --';
    modeEl.classList.toggle('is-insert', mode === 'insert');
  }

  function motionWord(kind) {
    let { row, col } = S;
    if (kind === 'w') {
      const l = S.lines[row];
      if (col < l.length && cls(l[col]) !== 0) {
        const c0 = cls(l[col]);
        while (col < l.length && cls(l[col]) === c0) col += 1;
      }
      for (;;) {
        const cur = S.lines[row];
        if (col >= cur.length) {
          if (row >= S.lines.length - 1) { col = lastCol(cur); break; }
          row += 1; col = 0;
          if (!S.lines[row].length) break; // a blank line is a stop
          continue;
        }
        if (cls(cur[col]) === 0) { col += 1; continue; }
        break;
      }
    } else if (kind === 'e') {
      col += 1;
      for (;;) {
        const cur = S.lines[row];
        if (col >= cur.length) {
          if (row >= S.lines.length - 1) { col = lastCol(cur); break; }
          row += 1; col = 0; continue;
        }
        if (cls(cur[col]) === 0) { col += 1; continue; }
        const c0 = cls(cur[col]);
        while (col + 1 < cur.length && cls(cur[col + 1]) === c0) col += 1;
        break;
      }
    } else { // b
      col -= 1;
      for (;;) {
        if (col < 0) {
          if (row === 0) { col = 0; break; }
          row -= 1; col = lastCol(S.lines[row]);
          if (!S.lines[row].length) { col = 0; continue; }
        }
        const cur = S.lines[row];
        if (!cur.length || cls(cur[col]) === 0) { col -= 1; continue; }
        const c0 = cls(cur[col]);
        while (col - 1 >= 0 && cls(cur[col - 1]) === c0) col -= 1;
        break;
      }
    }
    S.row = row;
    S.col = Math.max(0, Math.min(col, lastCol(S.lines[row])));
    S.want = S.col;
  }

  function motionPara(dir) {
    let r = S.row + dir;
    while (r > 0 && r < S.lines.length - 1 && S.lines[r].trim() !== '') r += dir;
    S.row = clampRow(r);
    S.col = 0;
    S.want = 0;
  }

  function doFind(type, ch) {
    const l = line();
    let idx;
    if (type === 'f' || type === 't') {
      idx = l.indexOf(ch, S.col + 1);
      if (idx !== -1 && type === 't') idx -= 1;
    } else {
      idx = l.lastIndexOf(ch, S.col - 1);
      if (idx !== -1 && type === 'T') idx += 1;
    }
    if (idx >= 0 && idx < l.length) { S.col = idx; S.want = idx; }
  }

  function wordBounds(row, col) {
    const l = S.lines[row];
    if (!l.length) return null;
    col = Math.min(col, lastCol(l));
    const c0 = cls(l[col]);
    if (c0 === 0) return null;
    let a = col;
    let b = col;
    while (a - 1 >= 0 && cls(l[a - 1]) === c0) a -= 1;
    while (b + 1 < l.length && cls(l[b + 1]) === c0) b += 1;
    return [a, b];
  }

  function deleteRange(a, b) { // inclusive, current line, lands insert mode
    pushHistory();
    S.lines[S.row] = line().slice(0, a) + line().slice(b + 1);
    S.col = a;
    S.want = a;
    setMode('insert');
  }

  function normalKey(k) {
    if (S.pendingR) {
      S.pendingR = false;
      if (k.length === 1 && lineLen()) {
        pushHistory();
        S.lines[S.row] = line().slice(0, S.col) + k + line().slice(S.col + 1);
        checkRepair();
      }
      return;
    }
    if (S.pendingFind) {
      const type = S.pendingFind;
      S.pendingFind = '';
      if (k.length === 1) { S.lastFind = { type, ch: k }; doFind(type, k); }
      checkGo();
      return;
    }
    if ((k >= '1' && k <= '9') || (k === '0' && S.count)) { S.count += k; return; }
    if (S.pendingG) {
      S.pendingG = false;
      if (k === 'g') {
        S.row = S.count ? clampRow(Number(S.count) - 1) : 0;
        S.col = firstNonBlank(line());
        S.want = S.col;
      }
      S.count = '';
      checkGo();
      return;
    }

    if (S.op === 'c') {
      if (k === 'i' && !S.opPend) { S.opPend = 'i'; return; }
      const inner = S.opPend === 'i';
      S.op = '';
      S.opPend = '';
      if (k === 'w') {
        const bounds = wordBounds(S.row, S.col);
        if (!bounds) return;
        deleteRange(inner ? bounds[0] : S.col, bounds[1]); // cw acts like ce
      }
      return;
    }

    const n = Math.max(1, Number(S.count || '1'));
    S.count = '';
    const move = (fn) => { for (let i = 0; i < n; i += 1) fn(); };

    switch (k) {
      case 'h': move(() => { S.col = Math.max(0, S.col - 1); }); S.want = S.col; break;
      case 'l': move(() => { S.col = Math.min(lastCol(line()), S.col + 1); }); S.want = S.col; break;
      case 'j': move(() => { S.row = clampRow(S.row + 1); }); S.col = Math.min(S.want, lastCol(line())); break;
      case 'k': move(() => { S.row = clampRow(S.row - 1); }); S.col = Math.min(S.want, lastCol(line())); break;
      case 'w': case 'b': case 'e': move(() => motionWord(k)); break;
      case '0': S.col = 0; S.want = 0; break;
      case '^': S.col = firstNonBlank(line()); S.want = S.col; break;
      case '$': S.col = lastCol(line()); S.want = Infinity; break;
      case '{': move(() => motionPara(-1)); break;
      case '}': move(() => motionPara(1)); break;
      case 'g': S.pendingG = true; S.count = String(n === 1 ? '' : n); break;
      case 'G':
        S.row = S.count || n > 1 ? clampRow(n - 1) : S.lines.length - 1;
        S.col = firstNonBlank(line());
        S.want = S.col;
        break;
      case 'f': case 'F': case 't': case 'T': S.pendingFind = k; break;
      case ';': if (S.lastFind) move(() => doFind(S.lastFind.type, S.lastFind.ch)); break;
      case ',':
        if (S.lastFind) {
          const flip = { f: 'F', F: 'f', t: 'T', T: 't' }[S.lastFind.type];
          move(() => doFind(flip, S.lastFind.ch));
        }
        break;
      case 'x':
        if (lineLen()) {
          pushHistory();
          S.lines[S.row] = line().slice(0, S.col) + line().slice(S.col + n);
          S.col = Math.min(S.col, lastCol(line()));
          S.want = S.col;
          checkRepair();
        }
        break;
      case 'r': S.pendingR = true; break;
      case 'c': S.op = 'c'; break;
      case 'i': pushHistory(); setMode('insert'); break;
      case 'a': pushHistory(); S.col = Math.min(lineLen(), S.col + 1); setMode('insert'); break;
      case 'u': move(undo); break;
      case 'Enter': S.row = clampRow(S.row + 1); S.col = firstNonBlank(line()); S.want = S.col; break;
      default: break;
    }
    checkGo();
  }

  function insertKey(k) {
    if (k === 'Escape' || k === 'Enter') {
      setMode('normal');
      S.col = Math.max(0, Math.min(S.col - 1, lastCol(line())));
      S.want = S.col;
      checkRepair();
      return;
    }
    if (k === 'Backspace') {
      if (S.col > 0) {
        S.lines[S.row] = line().slice(0, S.col - 1) + line().slice(S.col);
        S.col -= 1;
      }
      return;
    }
    if (k.length === 1) {
      S.lines[S.row] = line().slice(0, S.col) + k + line().slice(S.col);
      S.col += 1;
    }
  }

  /* ------------------------------------------------------------ the frame */

  function decorations(r) {
    const deco = new Map();
    const m = S.mark;
    if (m && m.row === r) {
      if (m.kind === 'go') deco.set(m.col, 'vim-block');
      else if (S.lines[r] !== CLEAN[r]) {
        // Only while the line still holds the exact planted typo — mid-repair
        // the columns have shifted and the label carries the goal alone.
        const planted = CLEAN[r].slice(0, m.start) + m.corrupt + CLEAN[r].slice(m.start + m.word.length);
        if (S.lines[r] === planted) {
          for (let c = m.start; c < m.start + m.corrupt.length; c += 1) deco.set(c, 'vim-bad');
        }
      }
    }
    if (r === S.row) {
      const base = deco.get(S.col);
      const cursor = S.mode === 'insert' ? 'vim-cursor vim-cursor--bar' : 'vim-cursor';
      deco.set(S.col, base ? `${base} ${cursor}` : cursor);
    }
    return deco;
  }

  function render() {
    const out = [];
    for (let r = 0; r < S.lines.length; r += 1) {
      const l = S.lines[r];
      const deco = decorations(r);
      let body;
      if (deco.size) {
        const upto = Math.max(l.length, ...[...deco.keys()].map((c) => c + 1));
        body = '';
        for (let c = 0; c < upto; c += 1) {
          const ch = c < l.length ? l[c] : ' ';
          const klass = deco.get(c);
          body += klass ? `<span class="${klass}">${esc(ch)}</span>` : esc(ch);
        }
      } else {
        body = esc(l);
      }
      let label = '';
      if (S.mark?.label && S.mark.row === r && S.lines[r] !== CLEAN[r]) {
        label = `<span class="vim-label" style="--c: ${S.mark.start}">${esc(S.mark.label)}</span>`;
      }
      out.push(`<div class="vim-line">${label}<span class="vim-gutter">${String(r + 1).padStart(3, ' ')}</span>${body}</div>`);
    }
    buffer.innerHTML = out.join('');
  }

  /* ------------------------------------------------------------- the race */

  function elapsed() {
    return S.t0 ? (performance.now() - S.t0) / 1000 : 0;
  }

  function reset() {
    S.lines = CLEAN.slice();
    S.row = 0; S.col = 0; S.want = 0;
    S.count = ''; S.op = ''; S.opPend = '';
    S.pendingG = false; S.pendingR = false; S.pendingFind = ''; S.lastFind = null;
    S.history = []; S.cleared = 0; S.keys = 0; S.t0 = 0;
    clearInterval(S.timer);
    setMode('normal');
    clockEl.textContent = 'you 0:00.0';
    setMark(COURSE[0]);
    render();
  }

  function finish() {
    S.running = false;
    S.mark = null;
    clearInterval(S.timer);
    const time = elapsed();
    clockEl.textContent = `you ${fmt(time)}`;
    hintEl.textContent = 'lap complete';

    const prev = Number(localStorage.getItem(STORE_KEY) || 0);
    const record = !prev || time < prev;
    if (record) localStorage.setItem(STORE_KEY, String(time));

    document.getElementById('vim-verdict').textContent =
      time < RIVAL ? 'YOU TAKE THE CROWN' : 'MICHAEL KEEPS IT';
    document.getElementById('vim-result-times').textContent =
      `you ${fmt(time)} — michael ${fmt(RIVAL)}`;
    document.getElementById('vim-result-keys').textContent =
      `${S.keys} keys · best ${fmt(record ? time : prev)}${record ? ' · new record' : ''}`;

    intro.hidden = true;
    results.hidden = false;
    overlay.classList.remove('hidden');
    document.getElementById('vim-again').focus();
  }

  function begin() {
    reset();
    S.running = true;
    overlay.classList.add('hidden');
    screen.focus();
  }

  const ARROWS = { ArrowLeft: 'h', ArrowDown: 'j', ArrowUp: 'k', ArrowRight: 'l' };

  screen.addEventListener('keydown', (e) => {
    if (!S.running) return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.key === 'Tab') return;
    const k = ARROWS[e.key] || e.key;
    if (k.length > 1 && k !== 'Escape' && k !== 'Backspace' && k !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation(); // this page has its own ideas about loose keystrokes
    S.keys += 1;
    if (!S.t0) {
      S.t0 = performance.now();
      S.timer = setInterval(() => { clockEl.textContent = `you ${fmt(elapsed())}`; }, 100);
    }
    if (S.mode === 'insert') insertKey(k);
    else normalKey(k);
    if (S.running || S.cleared >= COURSE.length) render();
  });

  document.getElementById('vim-start').addEventListener('click', begin);
  document.getElementById('vim-again').addEventListener('click', begin);

  rivalEl.textContent = `michael ${fmt(RIVAL)}`;
  document.getElementById('vim-rival-intro').textContent = fmt(RIVAL);
  reset();
}
