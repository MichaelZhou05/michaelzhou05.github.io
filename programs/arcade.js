const games = {
  race: {
    title: 'Nordschleife racing experiment', file: 'race.html',
    story: `<h2>A racing experiment you can drive</h2>
      <p>I built a browser racer and an offline runner that turns model-generated directions into replayable laps. Human controls and the runner use the same movement function, making the model’s route visible beside yours.</p>
      <p><strong>The engineering:</strong> shared simulation rules, sector-based observations, structured driving plans, and recorded positions replayed without live API calls.</p>
      <p>The saved laps took 95.933 simulated seconds for Sol, 102.867 for Jev, and 114.117 for Opus. Thinking time is excluded. The recordings use different controls and camera behavior, and each time comes from a single lap.</p>
      <p><a href="./race-method.html" target="_blank" rel="noopener">Method, recordings &amp; limitations</a>. Inspired by <a href="https://gbaeval.com" target="_blank" rel="noopener">GBA Eval</a>; its external benchmark results are separate from these recordings.</p>`,
  },
  vim: {
    title: 'Vim sprint: twelve editing challenges', file: 'vim.html',
    story: `<h2>Make editor practice feel like editing</h2>
      <p>I built a browser-based Neovim and NvChad trainer with a modal editing engine, a virtual Python project, lessons, and repair drills. This small companion sprint turns twelve fixed navigation and editing tasks into a timed course.</p>
      <p><strong>The engineering:</strong> counted motions, character finds, paragraph jumps, typo repairs, and undo. Your cursor stays where you leave it as the next task appears; the clock starts on your first key.</p>
      <p>The full trainer adds operators, text objects, simulated NvChad tools, and quizzes. Its tests replay lesson solutions through the editor engine. This sprint uses a smaller, separate engine; the displayed 58-second rival is a configured target.</p>
      <p><a href="https://michaelzhou05.github.io/learnNvim/" target="_blank" rel="noopener">Open the full trainer</a></p>`,
  },
};

/** Each game owns a browsing context. Removing it also stops its engine. */
export function mount(root) {
  root.innerHTML = `<div class="arcade-program">
    <header class="arcade-chrome">
      <div class="mac-titlebar"><h2>Cool stuff</h2></div>
      <nav class="arcade-toolbar mac-tabs" aria-label="Choose a game">
        <button type="button" data-game="race" aria-pressed="true" aria-controls="arcade-player">Nordschleife</button>
        <button type="button" data-game="vim" aria-pressed="false" aria-controls="arcade-player">Vim sprint</button>
        <button type="button" class="arcade-about" aria-expanded="false" aria-controls="arcade-story">About</button>
      </nav>
    </header>
    <div class="arcade-player" id="arcade-player"></div>
    <section class="arcade-story" id="arcade-story" aria-label="About this demo" hidden></section>
  </div>`;
  const program = root.querySelector('.arcade-program');
  const chrome = root.querySelector('.arcade-chrome');
  const player = root.querySelector('.arcade-player');
  const story = root.querySelector('.arcade-story');
  const about = root.querySelector('.arcade-about');
  const buttons = [...root.querySelectorAll('[data-game]')];
  let current = '';
  let pendingStart = null;
  const cancelStart = () => {
    if (pendingStart) pendingStart.frame.removeEventListener('load', pendingStart.callback);
    pendingStart = null;
  };
  const choose = id => {
    if (!games[id] || id === current) return;
    cancelStart();
    current = id;
    const frame = document.createElement('iframe');
    frame.src = new URL(games[id].file, import.meta.url).href;
    frame.title = games[id].title;
    frame.className = 'arcade-game-frame';
    frame.setAttribute('allow', 'fullscreen');
    frame.classList.add('mac-page-enter');
    // Remove the previous context before loading the next game.
    player.replaceChildren(frame);
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.game === id)));
    story.innerHTML = games[id].story;
    story.hidden = true;
    about.setAttribute('aria-expanded', 'false');
    program.scrollTop = 0;
  };
  const onClick = event => {
    const button = event.target.closest('[data-game]');
    if (button) choose(button.dataset.game);
    if (event.target.closest('.arcade-about')) {
      story.hidden = !story.hidden;
      about.setAttribute('aria-expanded', String(!story.hidden));
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      program.scrollTo({ top: story.hidden ? 0 : story.offsetTop - chrome.offsetHeight, behavior: reduceMotion ? 'instant' : 'smooth' });
    }
  };
  const bootRace = () => {
    choose('race');
    cancelStart();
    const frame = player.querySelector('iframe');
    const start = () => {
      pendingStart = null;
      frame.contentDocument?.getElementById('start-race')?.click();
    };
    if (frame.contentDocument?.getElementById('start-race')) start();
    else {
      pendingStart = { frame, callback: start };
      frame.addEventListener('load', start, { once: true });
    }
  };
  root.addEventListener('arcade:boot', bootRace);
  root.addEventListener('click', onClick);
  choose('race');
  return () => {
    cancelStart();
    root.removeEventListener('arcade:boot', bootRace);
    root.removeEventListener('click', onClick);
    player.replaceChildren();
    root.replaceChildren();
  };
}
