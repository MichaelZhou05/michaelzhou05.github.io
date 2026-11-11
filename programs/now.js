const STORE_KEY = 'mz-auto-research-visitor-note';
const ARTICLE = 'https://rekursiv.ai/blog/autoautoresearch/';
const FIGURE = './assets/programs/now/rekursiv-research-time.svg';
const strategies = {
  greedy: { title: 'Greedy', detail: 'Always edit the best version so far. Keep a change only if its validation score improves.', path: 'M30 63 H110 L190 30 H270', nodes: [0, 1, 2, 4] },
  tree: { title: 'Best-first', detail: 'Keep valid alternatives, including non-improvements. Expand the best eligible branch, with a cap on repeated attempts.', path: 'M30 63 H110 M110 63 L190 30 H270 M110 63 L190 96 H270', nodes: [0, 1, 2, 3, 4, 5] },
  adaptive: { title: 'Adaptive', detail: 'Start greedy. When progress stalls, switch to taking turns across a bounded set of promising branches.', path: 'M30 63 H110 M110 63 L190 30 H270 M110 63 L190 96 H270', nodes: [0, 1, 2, 3, 4, 5] },
};

/** The disk owns only its display; every listener is released on ejection. */
export function mount(root) {
  const events = new AbortController();
  let page = 'project';
  let strategy = 'greedy';
  let note = '';
  let storageAvailable = true;
  try { note = (localStorage.getItem(STORE_KEY) || '').slice(0, 4000); } catch { storageAvailable = false; }
  root.classList.add('now-program');
  root.innerHTML = `<header class="mac-titlebar"><h2>Building now · AutoResearch</h2></header>
    <nav class="now-nav mac-tabs" aria-label="AutoResearch pages"><button type="button" data-page="project" aria-pressed="true" aria-controls="now-sheet">Project</button><button type="button" data-page="evidence" aria-pressed="false" aria-controls="now-sheet">Evidence</button><button type="button" data-page="notes" aria-pressed="false" aria-controls="now-sheet">Your notes</button></nav>
    <div class="now-sheet mac-pane" id="now-sheet" tabindex="0" role="region" aria-label="AutoResearch project"></div>`;
  const sheet = root.querySelector('.now-sheet');

  function strategyDrawing() {
    const current = strategies[strategy];
    const isAdaptive = strategy === 'adaptive';
    return `<svg viewBox="0 0 300 126" role="img" aria-label="${current.title} search: ${strategy === 'greedy' ? 'one improving path' : isAdaptive ? 'one path, then branching after stagnation' : 'alternative branches remain available'}">
      <path class="now-tree-base" d="M30 63 H110 M110 63 L190 30 H270 M110 63 L190 96 H270"/>
      <path class="now-tree-active${isAdaptive ? ' now-tree-adaptive' : ' now-tree-trace'}" pathLength="1" d="${current.path}"/>
      ${isAdaptive ? '<path class="now-tree-active now-tree-trace" pathLength="1" d="M30 63 H110"/>' : ''}
      ${[[30, 63], [110, 63], [190, 30], [190, 96], [270, 30], [270, 96]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="7" class="${current.nodes.includes(i) ? 'now-node-active' : 'now-node'}"/>`).join('')}
      <text x="30" y="88" text-anchor="middle">Start</text><text x="110" y="38" text-anchor="middle">${isAdaptive ? 'Stalls' : 'Edit'}</text><text x="230" y="64" text-anchor="middle">Try again</text>
    </svg>`;
  }

  function diagram() {
    return `<figure class="now-loop"><figcaption>One agent. Three ways to choose what to try next.</figcaption>
      <div class="now-loop-content">
        <div class="now-strategies" role="group" aria-label="Explore research strategies">${Object.entries(strategies).map(([key, item]) => `<button class="mac-control" type="button" data-strategy="${key}" aria-pressed="${key === strategy}">${item.title}</button>`).join('')}</div>
        <div class="now-loop-drawing"><div data-strategy-drawing>${strategyDrawing()}</div><p class="now-strategy-detail" aria-live="polite">${strategies[strategy].detail}</p></div>
        <p class="now-caption">Conceptual paths, not measured results. Each attempt: choose a version, propose an edit, evaluate, record, repeat.</p>
      </div>
    </figure>`;
  }

  function render() {
    root.querySelectorAll('.now-nav [data-page]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.page === page)));
    sheet.setAttribute('aria-label', `AutoResearch ${page === 'notes' ? 'visitor notes' : page}`);
    const documentArea = document.createElement('article');
    documentArea.className = 'now-document mac-page-enter';
    sheet.replaceChildren(documentArea);
    if (page === 'project') {
      documentArea.innerHTML = `<h3 class="mac-document-title">How should an AI choose its next experiment?</h3>
        <p class="now-lead">I’m building a benchmark to compare how AI agents improve a small language model: follow the best idea, explore alternatives, or switch when progress stalls.</p>
        ${diagram()}
        <section class="now-section"><h4>Why this matters</h4><p>Training runs cost time and compute. A useful research agent needs to choose the next experiment well, and learn from attempts that fail.</p></section>
        <section class="now-section"><h4>What I’m building</h4><p>My focus is the comparison harness around <a href="https://github.com/karpathy/autoresearch" target="_blank" rel="noopener noreferrer">Karpathy’s AutoResearch</a>. The study design holds the model, tools, feedback, and budget constant so the search strategy is the variable.</p><p>The implementation separates proposal generation, evaluation, and search decisions. Its logs retain parent–child history, scores, failures, timing, and usage. <a href="https://github.com/qrzou/FML-bench" target="_blank" rel="noopener noreferrer">FML-Bench</a> informs the study design; transfer to language-model pretraining is the open question.</p></section>
        <section class="now-section"><h4>Where it stands</h4><dl class="now-progress"><div><dt>Working locally</dt><dd>Three search policies, deterministic CPU dry runs, trajectory logs, summary metrics, path/hash checks, and unit tests.</dd></div><div><dt>Next</dt><dd>Isolated GPU execution, protected held-out evaluation, live model integration, and a frozen study protocol. Slurm launch templates are in place.</dd></div></dl><p class="now-status">Scaffold stage. No measured GPU comparison or winning strategy yet.</p></section>
        <button class="mac-control" type="button" data-page="evidence">See research context and open questions</button>`;
    } else if (page === 'evidence') {
      documentArea.innerHTML = `<h3 class="mac-document-title">The question behind the benchmark</h3><p class="now-lead">This external campaign shows why experiment history matters. My benchmark asks how to compare search strategies under matched conditions.</p>
        <figure class="now-evidence"><div class="now-figure-heading"><h4>Rekursiv’s NanoChat campaign</h4><span>External research</span></div><button class="mac-control now-graph-toggle" type="button" data-graph-zoom aria-pressed="false">Enlarge graph labels</button><div class="now-graph-viewport" tabindex="0" role="region" aria-label="Rekursiv research graph; scroll to read when enlarged"><a class="now-graph-link" href="${FIGURE}" target="_blank" rel="noopener noreferrer" aria-label="Open Rekursiv’s graph at full size"><img src="${FIGURE}" width="834" height="600" alt="Rekursiv’s experiments over elapsed research hours. Bits per byte generally falls as research proceeds; a line tracks the best score so far. Lower is better; two idle gaps are removed."></a></div><figcaption><strong>Rekursiv’s results, not mine.</strong> Points are completed experiments; the line tracks the best score so far. Lower bits per byte (BPB) is better. Two idle gaps are removed in the original figure.</figcaption><p class="now-caption">Figure 3b, <a href="${ARTICLE}" target="_blank" rel="noopener noreferrer">(auto)²-research</a>, September 14, 2026. Dan Kondratyuk, Junpeng Lao, Ming-Chang Chiu, and Joshua V. Dillon at rekursiv.ai. <a href="${FIGURE}" target="_blank" rel="noopener noreferrer">Open full-size graph</a>.</p></figure>
        <section class="now-section"><h4>How it relates to my work</h4><p>Their campaign is useful context for preserving failed experiments and research history. It does not establish which of my three policies works best. That needs a controlled comparison.</p></section>
        <section class="now-section"><h4>What I need to answer next</h4><ul class="now-questions"><li>When does exploring another branch beat refining the best version?</li><li>How should stalled progress trigger a change in strategy?</li><li>Do improvements survive fresh training seeds and held-out evaluation?</li></ul><p>The draft protocol tracks quality, failures, time, and compute. Budgets, seeds, dataset snapshots, and the primary endpoint still need to be frozen before confirmatory runs.</p></section>
        <details class="now-source-note"><summary>About the local evidence</summary><p>The current repo implements the benchmark scaffold and synthetic dry runs. Synthetic scores verify control flow; they are not model-quality results. Production isolation and GPU evaluation remain planned work.</p><p>My <a href="https://github.com/MichaelZhou05/autoresearch" target="_blank" rel="noopener noreferrer">public AutoResearch fork</a> preserves the upstream training setup. The benchmark scaffold described here was verified from my local checkout.</p></details>`;
    } else {
      documentArea.innerHTML = `<h3 class="mac-document-title">Your scratchpad</h3><p class="now-lead">Save a question for yourself as you explore the project.</p><label class="now-note-label" for="auto-research-note">Your note</label><textarea id="auto-research-note" maxlength="4000" placeholder="What would you test next?" spellcheck="true"></textarea><div class="now-note-actions"><span data-note-count></span><button class="mac-control" type="button" data-clear-note>Clear note</button></div><p class="now-caption" data-storage-status></p>`;
      sheet.querySelector('textarea').value = note;
      updateNoteStatus();
    }
    sheet.scrollTop = 0;
  }

  function updateNoteStatus() {
    sheet.querySelector('[data-note-count]').textContent = `${note.length} / 4000`;
    sheet.querySelector('[data-storage-status]').textContent = storageAvailable ? 'Saved only in this browser. Nothing is sent to Michael.' : 'Browser storage is unavailable. This note lasts until you leave the disk. Nothing is sent to Michael.';
  }
  function saveNote(value) {
    note = value;
    try { localStorage.setItem(STORE_KEY, note); } catch { storageAvailable = false; }
    updateNoteStatus();
  }
  root.addEventListener('click', event => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton && pageButton.dataset.page !== page) {
      const fromSheet = sheet.contains(pageButton);
      page = pageButton.dataset.page;
      render();
      if (fromSheet) sheet.focus({ preventScroll: true });
    }
    const strategyButton = event.target.closest('[data-strategy]');
    if (strategyButton && strategyButton.dataset.strategy !== strategy) {
      strategy = strategyButton.dataset.strategy;
      sheet.querySelectorAll('[data-strategy]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.strategy === strategy));
      });
      const drawing = sheet.querySelector('[data-strategy-drawing]');
      drawing.classList.add('is-tracing');
      drawing.innerHTML = strategyDrawing();
      sheet.querySelector('.now-strategy-detail').textContent = strategies[strategy].detail;
    }
    const zoomButton = event.target.closest('[data-graph-zoom]');
    if (zoomButton) {
      const enlarged = zoomButton.getAttribute('aria-pressed') !== 'true';
      zoomButton.setAttribute('aria-pressed', String(enlarged));
      zoomButton.textContent = enlarged ? 'Fit graph to display' : 'Enlarge graph labels';
      sheet.querySelector('.now-graph-viewport').classList.toggle('is-enlarged', enlarged);
    }
    if (event.target.closest('[data-clear-note]')) {
      saveNote('');
      sheet.querySelector('textarea').value = '';
      sheet.querySelector('textarea').focus();
    }
  }, { signal: events.signal });
  root.addEventListener('input', event => {
    if (event.target.matches('#auto-research-note')) saveNote(event.target.value);
  }, { signal: events.signal });
  render();
  return () => {
    events.abort();
    root.classList.remove('now-program');
    root.replaceChildren();
  };
}
