// DraftKings page: plain-language story, pipeline map, and three small explainers.
// Numbers in the toys are illustrative; real figures appear only in the card text.

const nodes = [
  { id: 'data', x: 10, y: 20, title: 'Game data', sub: 'stats · venue · weather',
    note: 'Player, team, venue and weather feeds.' },
  { id: 'ingest', x: 220, y: 20, title: 'Hornet services', sub: 'aggregate + route', hornet: true,
    note: 'Hornet services that clean and aggregate incoming data, then route it to each sport’s model.' },
  { id: 'models', x: 430, y: 20, title: 'Sport models', sub: 'Monte Carlo sims',
    note: 'One ML model per sport. Each simulates the game possession by possession, thousands of times.' },
  { id: 'pricing', x: 430, y: 140, title: 'Hornet services', sub: 'same-game parlay math', hornet: true,
    note: 'Hornet services that read the counters and compute joint probabilities for same-game parlays.' },
  { id: 'traders', x: 220, y: 140, title: 'Traders', sub: 'review + override',
    note: 'Traders review prices and apply short- or long-term overrides, which feed back in as model inputs.' },
  { id: 'backtest', x: 10, y: 250, title: 'Backtesting API', sub: 'look up past counters', hornet: true, pin: 1,
    note: 'Looks up the counters behind any past price. Card ① below.' },
  { id: 'book', x: 220, y: 250, title: 'Sportsbook', sub: '+ margin → live odds',
    note: 'Adds margin and shading, then posts live odds on DraftKings.' },
  { id: 'mm', x: 430, y: 250, title: 'Market making', sub: '5 prediction exchanges', hornet: true, pin: 2,
    note: 'Quotes the true price on five prediction exchanges. Card ② below.' },
];

const defaultNote = 'Select a box to see what it does. Numbered boxes are where my main projects sit.';

function pipelineMap() {
  const w = 160, h = 54;
  const boxes = nodes.map(n => `
    <g class="dk-node${n.hornet ? ' is-hornet' : ''}" data-dk-node="${n.id}" tabindex="0" role="button" aria-label="${n.title}: ${n.note}">
      <rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="4"/>
      <text x="${n.x + w / 2}" y="${n.y + 23}" class="dk-node-title">${n.title}</text>
      <text x="${n.x + w / 2}" y="${n.y + 40}" class="dk-node-sub">${n.sub}</text>
      ${n.pin ? `<circle cx="${n.x + w - 2}" cy="${n.y + 2}" r="11" class="dk-pin"/><text x="${n.x + w - 2}" y="${n.y + 6.5}" class="dk-pin-num">${n.pin}</text>` : ''}
    </g>`).join('');

  const list = nodes.map(n => `<li class="${n.hornet ? 'is-hornet' : ''}"><b>${n.pin ? `${'①②'[n.pin - 1]} ` : ''}${n.id === 'ingest' ? 'Hornet: data in' : n.id === 'pricing' ? 'Hornet: prices out' : n.title}</b> ${n.note.replace(/ Card [①②] below\./, '')}</li>`).join('');

  return `<figure class="dk-map">
    <svg viewBox="0 0 600 314" role="group" aria-label="True Price pipeline. Hornet owns the services before and after the sport models.">
      <defs><marker id="dk-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 8 4 0 8z"/></marker></defs>
      <g class="dk-wires" marker-end="url(#dk-arrow)">
        <path d="M172 47H216"/><path d="M382 47H426"/><path d="M510 76V136"/>
        <path d="M428 167H384"/><path class="is-loop" d="M300 138V78"/>
        <path d="M90 222V246" marker-end="url(#dk-arrow)"/><path d="M300 222V246"/><path d="M510 222V246"/>
      </g>
      <path class="dk-wires" d="M510 196V222M90 222H510"/>
      <text x="518" y="111" class="dk-wire-label">counters</text>
      <text x="308" y="112" class="dk-wire-label">overrides</text>
      ${boxes}
    </svg>
    <ol class="dk-map-list">${list}</ol>
    <figcaption><span class="dk-swatch" aria-hidden="true"></span>Hornet services <output class="dk-map-note" data-dk-note aria-live="polite">${defaultNote}</output></figcaption>
  </figure>`;
}

// Twenty hand-made box scores for one player. Points and threes move together; rebounds less so.
const games = [
  [31, 4, 6], [18, 1, 9], [27, 3, 5], [22, 2, 7], [34, 5, 8], [15, 0, 10], [26, 1, 9], [20, 3, 4], [29, 4, 6], [17, 1, 6],
  [24, 2, 8], [30, 3, 7], [19, 2, 5], [25, 2, 6], [21, 1, 11], [28, 4, 5], [16, 0, 7], [23, 2, 6], [12, 1, 4], [20, 1, 7],
];
const outcomes = {
  pts: { label: '25+ points', col: 0, test: v => v >= 25 },
  threes: { label: '3+ threes', col: 1, test: v => v >= 3 },
  reb: { label: '8+ rebounds', col: 2, test: v => v >= 8 },
};
const hit = (game, key) => outcomes[key].test(game[outcomes[key].col]);
const pct = x => `${Math.round(x * 100)}%`;

function counterMath(picked) {
  const [a, b] = picked;
  const pa = games.filter(g => hit(g, a)).length / games.length;
  const pb = games.filter(g => hit(g, b)).length / games.length;
  const both = games.filter(g => hit(g, a) && hit(g, b)).length / games.length;
  return `<div><dt>${outcomes[a].label}</dt><dd>${pct(pa)}</dd></div>
    <div><dt>${outcomes[b].label}</dt><dd>${pct(pb)}</dd></div>
    <div><dt>Multiply them</dt><dd>${pct(pa * pb)}</dd></div>
    <div class="is-answer"><dt>Both in the same sim</dt><dd>${pct(both)}</dd></div>`;
}

function counterRows(picked) {
  return games.map((g, i) => {
    const match = picked.every(key => hit(g, key));
    return `<tr${match ? ' class="is-match"' : ''}><th scope="row">${i + 1}</th>${Object.keys(outcomes).map(key =>
      `<td${picked.includes(key) && hit(g, key) ? ' class="is-hit"' : ''}>${g[outcomes[key].col]}</td>`).join('')}</tr>`;
  }).join('');
}

function countersDemo() {
  const picked = ['pts', 'threes'];
  return `<figure class="dk-counters" data-dk-counters>
    <div class="dk-chips" role="group" aria-label="Pick two outcomes">
      ${Object.entries(outcomes).map(([key, o]) => `<button type="button" data-dk-outcome="${key}" aria-pressed="${picked.includes(key)}">${o.label}</button>`).join('')}
    </div>
    <div class="dk-counters-body">
      <div class="dk-counters-table"><table aria-label="Twenty simulated games for one player">
        <thead><tr><th scope="col">Sim</th><th scope="col">PTS</th><th scope="col">3PM</th><th scope="col">REB</th></tr></thead>
        <tbody data-dk-rows>${counterRows(picked)}</tbody>
      </table></div>
      <dl class="dk-counters-math" data-dk-math aria-live="polite">${counterMath(picked)}</dl>
    </div>
    <figcaption>Pick two outcomes. Twenty sims for one player, illustrative numbers. Real counters hold thousands of sims and dozens of stats.</figcaption>
  </figure>`;
}

function hexId(seed) {
  let s = seed * 2654435761 >>> 0;
  let out = '';
  for (let i = 0; i < 8; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; out += (s >>> 28).toString(16); }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

function backtestDemo() {
  const target = hexId(77);
  const pile = Array.from({ length: 36 }, (_, i) => {
    const id = i === 23 ? target : hexId(i + 3);
    const min = String((i * 7) % 60).padStart(2, '0');
    return `<li${i === 23 ? ' class="is-target"' : ''}><span>${id}</span><span>NBA · pre-live · 19:${min}</span></li>`;
  }).join('');
  return `<div class="dk-lookup" data-dk-lookup>
    <section class="dk-lookup-panel">
      <h6>Before</h6>
      <div class="dk-fake-fields" aria-hidden="true"><span>Pre-live ▾</span><span>NBA ▾</span><span>Nov 3, 7–9pm ▾</span></div>
      <button type="button" class="dk-run" data-dk-run="before">Search S3</button>
      <div class="dk-lookup-out" data-dk-out="before" hidden>
        <p><b>214 matches.</b> Yours is <code>${target}</code>. Good luck.</p>
        <ul class="dk-pile">${pile}</ul>
      </div>
    </section>
    <section class="dk-lookup-panel">
      <h6>After</h6>
      <div class="dk-fake-fields" aria-hidden="true"><span class="is-id">calc_id = ${target}</span></div>
      <button type="button" class="dk-run" data-dk-run="after">Query Snowflake</button>
      <div class="dk-lookup-out" data-dk-out="after" hidden>
        <p><b>1 match.</b></p>
        <ul class="dk-pile"><li class="is-target"><span>${target}</span><span>NBA · pre-live · 19:41</span></li></ul>
      </div>
    </section>
  </div>`;
}

const exchanges = ['Kalshi', 'Polymarket', 'CME', 'Rothera', 'DK Exchange'];
const spreads = [[-1, 1], [-2, 2], [-1, 1], [-1, 2], [-1, 1]];

function quoteRows(price, suspended) {
  return exchanges.map((name, i) => {
    const [lo, hi] = spreads[i];
    return `<li${suspended ? ' class="is-pulled"' : ''}><span>${name}</span><span class="dk-quote">${suspended ? '— pulled —' : `${price + lo}¢ / ${price + hi}¢`}</span></li>`;
  }).join('');
}

function marketDemo() {
  return `<figure class="dk-fanout" data-dk-fanout>
    <div class="dk-fanout-grid">
      <div class="dk-true-price"><small>True price</small><b data-dk-price>63%</b><small>Lakers win</small></div>
      <ul class="dk-exchanges" data-dk-quotes aria-live="polite">${quoteRows(63, false)}</ul>
    </div>
    <button type="button" class="dk-run" data-dk-injury>Star player injured</button>
    <figcaption data-dk-fanout-note>One price, mapped to each exchange’s listing, with bid / ask quotes.</figcaption>
  </figure>`;
}

export function draftkingsExperience(job) {
  return `<section class="dk-intro">
      <h5 class="dk-sub">How a bet gets priced</h5>
      <p>DraftKings prices every bet from a <b>true price</b>, the probability of an outcome before any margin is added. Player, team, venue and weather data feed a model built for each sport.</p>
      <p>The model simulates the game possession by possession, thousands of times. The output is a matrix of simulated stats called <b>counters</b>. Same-game parlay pricing reads joint probabilities from the counters and sends them to the sportsbook, to traders and to prediction-market exchanges.</p>
      <h5 class="dk-sub">My team</h5>
      <p><b>Hornet</b> is the 12-person team that runs the pipeline around the models. It ingests and routes the data going in and turns the counters into prices coming out. Over the summer I shipped work at three points in that pipeline.</p>
    </section>
    ${pipelineMap()}

    <section class="dk-block">
      <h4 class="dk-h">Why counters</h4>
      <p>A same-game parlay needs every leg to hit in the same game, and the legs are related: a player who hits threes is also scoring points. Counting simulations where both happen captures that. Multiplying the separate odds does not.</p>
      ${countersDemo()}
    </section>

    <section class="dk-block" id="dk-card-1">
      <h4 class="dk-h"><span class="dk-badge">1</span>Backtesting API</h4>
      <h5 class="dk-sub">What it does</h5>
      <p>Traders, engineers and product teams use this endpoint to pull the counters behind a specific price, usually to debug it.</p>
      <h5 class="dk-sub">The old version</h5>
      <p>It searched S3 by game state, sport and time window, returned every match, and left the caller to find the right run by hand. It also broke on edge cases.</p>
      <h5 class="dk-sub">The rebuild</h5>
      <p>The data team had made counters queryable in Snowflake. I rebuilt the endpoint on top of that with lookup by calculation ID, the unique ID on every model run. The old filters still work for browsing.</p>
      ${backtestDemo()}
      <p class="dk-stat"><b>−63%</b> endpoint latency</p>
    </section>

    <section class="dk-block" id="dk-card-2">
      <h4 class="dk-h"><span class="dk-badge">2</span>Market making V2</h4>
      <h5 class="dk-sub">What it does</h5>
      <p>DraftKings also makes markets on prediction exchanges by quoting buy and sell prices on event contracts.</p>
      <h5 class="dk-sub">Why V2</h5>
      <p>V1 reused the sportsbook’s output directly, which held up for two exchanges. V2 was designed for five: Kalshi, Polymarket, CME, Rothera and DraftKings’ own exchange. It maps each true price to each exchange’s listing, attaches a tradability state to every probability, and makes ownership of suspensions explicit so the system knows when to pull quotes and when to stay in the book.</p>
      ${marketDemo()}
      <h5 class="dk-sub">My part</h5>
      <p>I finished the cutover. I moved every remaining flow from V1 to V2, removed the legacy components and retired the unused Kafka topics with the teams that consumed them. I also brought V2 to full test coverage and kept benchmarks passing throughout.</p>
      <p class="dk-stat"><b>−24%</b> memory in the pricing service, on benchmark</p>
    </section>

    <section class="dk-block dk-also">
      <h4 class="dk-h">Also shipped</h4>
      <ul class="dk-also-list">
        <li>A game-removal event so services on both sides of the model clear stale state when a game leaves the feed.</li>
        <li>Shared contracts for Kafka message types, which fixed a deserialization error.</li>
        <li>A searchable catalog of 7 runbooks and repos for the on-call rotation.</li>
      </ul>
    </section>
    <p class="work-tech"><b>Tools</b> ${job.tech}</p>`;
}

export function bindDraftkings(page, signal) {
  let picked = ['pts', 'threes'];
  let injuryTimer = 0;
  const note = () => page.querySelector('[data-dk-note]');

  function showNode(el) {
    const n = nodes.find(n => n.id === el.dataset.dkNode);
    if (n && note()) note().textContent = n.note;
  }

  function activateNode(el) {
    showNode(el);
    const n = nodes.find(n => n.id === el.dataset.dkNode);
    if (n?.pin) page.querySelector(`#dk-card-${n.pin}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  page.addEventListener('pointerover', e => { const el = e.target.closest?.('[data-dk-node]'); if (el) showNode(el); }, { signal });
  page.addEventListener('focusin', e => { const el = e.target.closest?.('[data-dk-node]'); if (el) showNode(el); }, { signal });
  page.addEventListener('keydown', e => {
    const el = e.target.closest?.('[data-dk-node]');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); activateNode(el); }
  }, { signal });

  page.addEventListener('click', e => {
    const node = e.target.closest('[data-dk-node]');
    if (node) activateNode(node);

    const chip = e.target.closest('[data-dk-outcome]');
    if (chip) {
      const key = chip.dataset.dkOutcome;
      if (!picked.includes(key)) {
        picked = [picked[1], key];
        page.querySelectorAll('[data-dk-outcome]').forEach(b => b.setAttribute('aria-pressed', String(picked.includes(b.dataset.dkOutcome))));
        page.querySelector('[data-dk-rows]').innerHTML = counterRows(picked);
        page.querySelector('[data-dk-math]').innerHTML = counterMath(picked);
      }
    }

    const run = e.target.closest('[data-dk-run]');
    if (run) {
      const out = page.querySelector(`[data-dk-out="${run.dataset.dkRun}"]`);
      out.hidden = false;
      run.disabled = true;
    }

    if (e.target.closest('[data-dk-injury]')) {
      const btn = e.target.closest('[data-dk-injury]');
      const quotes = page.querySelector('[data-dk-quotes]');
      const price = page.querySelector('[data-dk-price]');
      const caption = page.querySelector('[data-dk-fanout-note]');
      clearTimeout(injuryTimer);
      if (btn.dataset.dkInjury === 'reset') {
        quotes.innerHTML = quoteRows(63, false);
        price.textContent = '63%';
        caption.textContent = 'One price, mapped to each exchange’s listing, with bid / ask quotes.';
        btn.textContent = 'Star player injured';
        btn.dataset.dkInjury = '';
        return;
      }
      btn.disabled = true;
      quotes.innerHTML = quoteRows(0, true);
      price.textContent = '…';
      caption.textContent = 'Danger signal: quotes pulled on every exchange while the model reprices.';
      injuryTimer = setTimeout(() => {
        quotes.innerHTML = quoteRows(48, false);
        price.textContent = '48%';
        caption.textContent = 'Repriced. Quotes return at the new true price.';
        btn.textContent = 'Reset';
        btn.disabled = false;
        btn.dataset.dkInjury = 'reset';
      }, 1800);
    }
  }, { signal });

  signal.addEventListener('abort', () => clearTimeout(injuryTimer));
}
