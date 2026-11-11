// Public-facing summaries draw on the August 2026 full-stack resume and firsthand project details.
// Earlier resume versions report different Duke metrics; do not mix evaluations.
const experiences = [
  {
    logo: 'draftkings-logo.svg', brand: 'draftkings',
    id: 'draftkings', short: 'DraftKings', name: 'DraftKings', area: 'Hornet · Data pipelines',
    role: 'Software engineering intern', dates: 'Jun–Aug 2026',
    tech: 'C# · Rust · Kafka · Snowflake · AWS S3',
  },
  {
    logo: 'duke-logo.svg', brand: 'duke',
    id: 'duke', short: 'Duke Med', name: 'Duke School of Medicine', area: 'Audio machine learning',
    role: 'Machine learning researcher', dates: 'Nov 2025–May 2026',
    heading: 'From mouse calls to research signals',
    problem: 'Researchers study disease-related changes in ultrasonic mouse calls. Preparing recordings and categorizing calls by hand slowed each experiment.',
    contribution: [
      'I built audio preprocessing and disease classifiers around existing call-detection tools, replacing manually categorized call features with learned audio features.',
      'I compared random forests, SVMs, and neural networks with group-aware cross-validation.',
    ],
    outcomes: [
      ['~30 min', 'Experiment preparation, down from more than 10 hours.'],
      ['Up to 86%', 'Disease-classification accuracy in lab evaluation.'],
    ],
    scope: 'These are research results on mouse recordings. They do not establish clinical performance or a deployed diagnostic tool.',
    detail: [
      'The preprocessing work covered eight hours of raw audio, using adaptive thresholding and Gaussian denoising to prepare sonograms.',
      'The archived pipeline uses SqueakOut for call segmentation and encoder features, then aggregates calls into recording-level predictions. SqueakOut is an existing model, not my own detector.',
      'The evaluation code groups recordings by litter, helping keep related animals from appearing on both sides of a validation split.',
    ],
    tech: 'Python · PyTorch · MATLAB · CUDA · scikit-learn',
  },
  {
    logo: 'us-army-logo.svg', brand: 'army',
    id: 'army', short: 'US Army', name: 'US Army DEVCOM', area: 'Resilient communication',
    role: 'Software engineering intern', dates: 'May–Aug 2025',
    heading: 'Keeping drone networks connected',
    problem: 'Radio interference can break communication between small drones. Changing channels helps only if the network stays coordinated and chooses useful channels.',
    contribution: [
      'I refactored Python and C++ software to add dynamic, anti-jamming channel hopping to Crazyflie nano-drones.',
      'I added risk constraints to reinforcement-learning channel selection to limit how long the network lost contact.',
    ],
    outcomes: [
      ['95.3%', 'Packet delivery under tested static and dynamic jamming conditions.'],
      ['30% less', 'Blackout time with safety constraints on channel selection.'],
    ],
    scope: 'Results describe the tested research conditions, not a guarantee for deployed drone networks.',
    detail: [
      'I designed a Bluetooth-based clock-synchronization protocol so drones could follow a shared channel-hopping schedule.',
      'My related 2022 JSSR abstract compares UCB1, EXP3, and epsilon-greedy channel-hopping algorithms.',
    ],
    tech: 'C++ · Python · Bluetooth · Reinforcement learning',
  },
  {
    logo: 'gmu-logo.png', brand: 'gmu',
    id: 'gmu', short: 'GMU', name: 'GMU Wireless Cyber Center', area: 'Wireless security',
    role: 'Cybersecurity research intern', dates: 'Jun–Aug 2024',
    heading: 'Testing drone security on real hardware',
    problem: 'Consumer drones depend on wireless links and onboard firmware. The lab investigated how weaknesses in those systems could compromise control.',
    contribution: [
      'I built a Python and Aircrack-ng test harness to evaluate controller-disconnection and takeover weaknesses on lab-owned drones.',
      'I reverse engineered Parrot Bebop firmware and demonstrated persistent root access through an exposed service.',
    ],
    outcomes: [
      ['80%', 'Takeover success in the tested UAV setup.'],
      ['Root access', 'Demonstrated on the lab’s Parrot Bebop drone.'],
    ],
    scope: 'Testing used lab-owned hardware in a closed research environment. The success rate applies to that setup.',
    detail: [
      'The work covered both the 802.11 wireless link and the drone’s firmware, testing separate routes to loss of control.',
    ],
    tech: 'Python · C++ · 802.11 · Firmware analysis',
  },
];

function brandLogo(job, className = '') {
  return `<span class="work-brand work-brand-${job.brand} ${className}"><img src="./assets/programs/work/${job.logo}" alt="${job.short} logo" width="112" height="56" decoding="async"></span>`;
}

const counterPageSize = 16;
const counterNumber = new Intl.NumberFormat('en-US');

function generateCounterRuns() {
  // Seeded, illustrative box scores. Shared minutes and shot volume link the stats within a run.
  let seed = 1729;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }

  function madeShots(attempts, probability) {
    let made = 0;
    for (let shot = 0; shot < attempts; shot++) {
      if (random() < probability) made++;
    }
    return made;
  }

  return Array.from({ length: 10000 }, () => {
    const minutes = Math.round(22 + 9 * (random() + random()));
    const usage = minutes / 35 * (.72 + .56 * random());
    const twoAttempts = Math.round(13 * usage + 5 * random());
    const threeAttempts = Math.round(8 * usage + 3 * random());
    const freeAttempts = Math.round(5 * usage + 5 * random() - 2);
    const twos = madeShots(twoAttempts, .54);
    const threes = madeShots(threeAttempts, .36);
    const freeThrows = madeShots(freeAttempts, .79);
    const points = twos * 2 + threes * 3 + freeThrows;
    const rebounds = madeShots(minutes, .21);
    const assists = madeShots(minutes, .17);
    const turnovers = madeShots(minutes, .08);
    return { minutes, points, twos, twoAttempts, threes, threeAttempts, freeThrows, freeAttempts, rebounds, assists, turnovers };
  });
}

const counterRuns = generateCounterRuns();
const counterPageCount = Math.ceil(counterRuns.length / counterPageSize);

const counterFilters = {
  points: { label: '25+ points', matches: run => run.points >= 25 },
  threes: { label: '3+ threes', matches: run => run.threes >= 3 },
  both: { label: 'Both', matches: run => run.points >= 25 && run.threes >= 3 },
};

for (const filter of Object.values(counterFilters)) {
  filter.count = counterRuns.filter(filter.matches).length;
  filter.percent = (filter.count / counterRuns.length * 100).toFixed(2);
}

const counterColumns = [
  ['PTS', 'Points', 'points'],
  ['3PM', 'Three-pointers made', 'threes'],
  ['Match', 'Matches selected condition'],
  ['MIN', 'Minutes played', 'minutes'],
  ['3PA', 'Three-pointers attempted', 'threeAttempts'],
  ['2PM', 'Two-pointers made', 'twos'],
  ['2PA', 'Two-pointers attempted', 'twoAttempts'],
  ['FTM', 'Free throws made', 'freeThrows'],
  ['FTA', 'Free throws attempted', 'freeAttempts'],
  ['FT%', 'Free-throw percentage'],
  ['REB', 'Rebounds', 'rebounds'],
  ['AST', 'Assists', 'assists'],
  ['TOV', 'Turnovers', 'turnovers'],
];

function counterResult(filter) {
  return `${counterNumber.format(filter.count)} of ${counterNumber.format(counterRuns.length)} runs match · ${filter.percent}%`;
}

function counterRange(pageNumber) {
  const start = (pageNumber - 1) * counterPageSize;
  return [start, Math.min(start + counterPageSize, counterRuns.length)];
}

function counterRows(pageNumber, filter) {
  const [start, end] = counterRange(pageNumber);
  return counterRuns.slice(start, end).map((run, index) => {
    const match = filter.matches(run);
    const freePercent = run.freeAttempts ? `${(run.freeThrows / run.freeAttempts * 100).toFixed(1)}%` : '—';
    return `<tr data-match="${match}">
      <th scope="row">${start + index + 1}</th>
      ${counterColumns.map(([label, , key]) => `<td>${key ? run[key] : label === 'Match' ? (match ? 'Yes' : 'No') : freePercent}</td>`).join('')}
    </tr>`;
  }).join('');
}

function counterExample() {
  return `<figure class="dk-example">
    <figcaption><strong>Basketball simulation matrix</strong><span>${counterNumber.format(counterRuns.length)} synthetic runs × 12 stats</span></figcaption>
    <fieldset class="dk-filters">
      <legend>Share of all runs meeting each condition</legend>
      ${Object.entries(counterFilters).map(([key, { label, percent }]) => `
        <label>
          <input type="radio" name="dk-counter-filter" value="${key}" data-counter-filter${key === 'both' ? ' checked' : ''}>
          <span class="dk-bar-row">
            <span>${label}</span>
            <span class="dk-bar-track" aria-hidden="true"><span style="width: ${percent}%"></span></span>
            <span class="dk-bar-value">${percent}%</span>
          </span>
        </label>`).join('')}
    </fieldset>
    <output class="dk-counter-result" data-counter-result aria-live="polite">${counterResult(counterFilters.both)}</output>
    <div class="dk-matrix-toolbar">
      <span data-counter-range aria-live="polite">Runs 1–${counterPageSize}</span>
      <div class="dk-matrix-pagination">
        <button type="button" data-counter-step="-1" aria-label="Previous page of runs" disabled>‹</button>
        <label>Page <input type="number" min="1" max="${counterPageCount}" value="1" data-counter-page></label>
        <span>of ${counterPageCount}</span>
        <button type="button" data-counter-step="1" aria-label="Next page of runs">›</button>
      </div>
    </div>
    <div class="dk-matrix" role="region" aria-label="Counters matrix, scroll horizontally for more stats" tabindex="0">
      <table aria-label="Synthetic basketball stats by simulation run">
        <thead><tr><th scope="col">Run</th>${counterColumns.map(([label, description]) => `<th scope="col" title="${description}" aria-label="${description}">${label}</th>`).join('')}</tr></thead>
        <tbody data-counter-rows>${counterRows(1, counterFilters.both)}</tbody>
      </table>
    </div>
  </figure>`;
}

function ticketFlow(label, before, after) {
  return `<dl class="dk-flow-compare" aria-label="${label}">
    ${[['Before', before], ['After', after]].map(([phase, [input, output]]) => `
      <div><dt>${phase}</dt><dd><span>${input}</span><span class="dk-flow-arrow" aria-hidden="true">→</span><span>${output}</span></dd></div>
    `).join('')}
  </dl>`;
}

function draftkingsExperience(job) {
  return `<section class="dk-overview">
      <h4 class="dk-section-title">Hornet · True Price data pipelines</h4>
      <p>Hornet maintained the data flowing into and out of DraftKings’ models across seven sports.</p>
      <ol class="dk-pipeline" role="list" aria-label="True Price simulation and probability flow">
        <li><strong>Game data</strong><span>Model inputs</span></li>
        <li><strong>Monte Carlo model</strong><span>Simulation counters</span></li>
        <li><strong>Rust service</strong><span>Single-game probabilities</span></li>
      </ol>
      <p>The models ran thousands of simulations per matchup. The resulting matrices of player stats, including minutes, points, threes, and rebounds, were called <strong>counters</strong>. The Rust service estimated joint probabilities using stats from the same simulated game. A made three also contributes to the player’s point total, so the two outcomes are related.</p>
      <details class="dk-counter-detail">
        <summary>Example counters and joint probability</summary>
        <p>Each row is a synthetic box score for one player. Select a bar to highlight matching runs. The joint probability uses runs that meet both thresholds in the same row.</p>
        ${counterExample()}
      </details>
    </section>

    <section class="dk-tickets">
      <h4 class="dk-section-title">Major tickets</h4>
      <section class="dk-ticket">
        <h5>Backtesting API migration from S3 to Snowflake</h5>
        <p>The old endpoint downloaded and scanned S3 objects to find matching counters. The data team enabled lookup by calculation UUID in Snowflake. I exposed it in the API and kept the original sport ID, time range, and live/pre-live filters in Swagger UI.</p>
        ${ticketFlow('Backtesting request paths', ['Sport, time, or game-state filters', 'Download and scan S3 objects'], ['Calculation UUID or existing filters', 'Query counters in Snowflake SQL'])}
        <p class="dk-result"><strong>63% lower</strong> endpoint latency</p>
      </section>

      <section class="dk-ticket">
        <h5>Market Making V2 cutover and Kafka topic retirement</h5>
        <p>I migrated market making from parallel V1 and V2 flows to the existing V2 pipeline. I ensured test coverage for every Kafka topic in the pipeline and coordinated with other teams to retire legacy and unused topic flows.</p>
        ${ticketFlow('Market-making feed cutover', ['V1 sportsbook risk flag + V2 game data', 'Parallel market-making flows'], ['V2 game data only', 'Single market-making flow'])}
        <p>The V2 feed gave traders the underlying game data the sports models received.</p>
        <p class="dk-result"><strong>24% better</strong> memory efficiency in the market-making pricing service</p>
      </section>

      <section class="dk-ticket">
        <h5>On-call service catalog</h5>
        <p>I built a searchable catalog across seven runbooks and repositories. Thirteen on-call engineers used it to understand service responsibilities and find troubleshooting guidance.</p>
      </section>
    </section>

    <details class="work-detail">
      <summary>Game-state and Kafka fixes</summary>
      <p>I added a removal event so downstream services could clear stale state when a game left the feed. I also moved Kafka message types into shared contracts and updated consumers to resolve a message-reading error.</p>
    </details>
    <p class="work-tech"><b>Tools</b> ${job.tech}</p>`;
}

function dukeVisuals() {
  const source = 'https://github.com/DrCoffey/DeepSqueak/wiki/Main-Window';
  const image = './assets/programs/work/deepsqueak-reference-ui.png';
  return `<section class="work-duke-visuals" aria-label="DeepSqueak interface and ultrasonic vocalizations">
    <h4>From recordings to detected calls</h4>
    <p class="work-visual-intro">Reference images from the DeepSqueak authors’ public guide, separate from my Duke study results.</p>
    <figure class="work-reference-figure">
      <a class="work-reference-image work-reference-full" href="${image}" target="_blank" rel="noopener" aria-label="Open full-size DeepSqueak interface image">
        <img src="${image}" alt="Annotated DeepSqueak interface with call statistics, spectrograms, detection boxes, and review controls." width="1634" height="962" loading="lazy" decoding="async">
      </a>
      <figcaption><b>DeepSqueak interface.</b> Review detected calls, inspect their shape, and accept or reject detections.</figcaption>
    </figure>
    <figure class="work-reference-figure">
      <a class="work-reference-image work-reference-usvs" href="${image}" target="_blank" rel="noopener" aria-label="Open full-size source for the ultrasonic call close-up">
        <img src="${image}" alt="Close-up of ultrasonic vocalizations: bright curved tracks show sound energy across time and frequency; green call boxes are retained from the original screenshot." width="1634" height="962" loading="lazy" decoding="async">
      </a>
      <figcaption><b>Ultrasonic vocalizations (USVs).</b> Bright tracks show the calls’ changing frequency over time. Close-up of the upper spectrogram.</figcaption>
    </figure>
    <figure class="work-reference-figure">
      <a class="work-reference-image work-reference-detections" href="${image}" target="_blank" rel="noopener" aria-label="Open full-size source for the detection overview">
        <img src="${image}" alt="A longer spectrogram with green boxes marking detected vocalizations and a highlighted window connecting the overview to the close-up." width="1634" height="962" loading="lazy" decoding="async">
      </a>
      <figcaption><b>Detections across a recording.</b> Green boxes mark candidate calls; the highlighted region connects the overview to the detailed view.</figcaption>
    </figure>
    <p class="work-visual-source">All three views use the same published screenshot; the close-ups retain its original detection boxes. <a href="${source}" target="_blank" rel="noopener noreferrer">DeepSqueak guide and image credit</a>. Select any image to see the full-size original.</p>
  </section>`;
}

function armyPublication() {
  // The supplied abstract is earlier GMU ASSIP work, published in 2022.
  return `<aside class="work-publication" aria-label="Related published abstract">
    <h4>Related published abstract</h4>
    <a href="https://journals.gmu.edu/jssr/article/view/3436" target="_blank" rel="noopener noreferrer">Reinforcement Learning Based Channel Hopping: Implementation on Nano Drones</a>
    <p>Journal of Student-Scientists’ Research, 2022. Earlier GMU ASSIP work.</p>
  </aside>`;
}

function armyVisuals() {
  const assets = './assets/programs/work/';
  return `<section class="work-army-visuals" aria-label="Crazyflie hardware and jammer-test plots">
    <h4>The hardware</h4>
    <div class="work-hardware-pair">
      <figure class="work-reference-figure">
        <a class="work-reference-image work-hardware-photo" href="${assets}army-crazyflie-2-1.jpg" target="_blank" rel="noopener" aria-label="Open full-size Crazyflie 2.1 drone photo">
          <img src="${assets}army-crazyflie-2-1.jpg" alt="Bitcraze Crazyflie 2.1 nano-drone with four propellers and an exposed central circuit board." width="585" height="585" loading="lazy" decoding="async">
        </a><figcaption><b>Crazyflie 2.1.</b> Programmable nano-drone.</figcaption>
      </figure>
      <figure class="work-reference-figure">
        <a class="work-reference-image work-hardware-photo" href="${assets}army-crazyradio-pa.jpg" target="_blank" rel="noopener" aria-label="Open full-size Crazyradio PA USB radio photo">
          <img src="${assets}army-crazyradio-pa.jpg" alt="Bitcraze Crazyradio PA USB radio adapter with an external antenna." width="393" height="457" loading="lazy" decoding="async">
        </a><figcaption><b>Crazyradio.</b> USB radio link; PA model shown.</figcaption>
      </figure>
    </div>
    <p class="work-visual-source">Reference photos: <a href="https://www.bitcraze.io/products/old-products/crazyflie-2-1/" target="_blank" rel="noopener noreferrer">Crazyflie</a> and <a href="https://www.bitcraze.io/products/old-products/crazyradio-pa/" target="_blank" rel="noopener noreferrer">Crazyradio</a> by Bitcraze, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>.</p>
    <h4>Testing with a jammer</h4>
    <figure class="work-reference-figure">
      <a class="work-reference-image work-test-plot" href="${assets}army-ucb1-with-jammer.png" target="_blank" rel="noopener" aria-label="Open full-size UCB1 action chart with jammer">
        <img src="${assets}army-ucb1-with-jammer.png" alt="UCB1 action chart with a jammer, showing the number of selections for each of 25 numbered channels." width="640" height="480" loading="lazy" decoding="async">
      </a><figcaption><b>UCB1 with a jammer.</b> Action counts show how often the algorithm selected each channel during this run.</figcaption>
    </figure>
    <figure class="work-reference-figure">
      <a class="work-reference-image work-test-plot" href="${assets}army-radio-test-with-jammer.png" target="_blank" rel="noopener" aria-label="Open full-size radio test plot with jammer">
        <img src="${assets}army-radio-test-with-jammer.png" alt="Radio test with a jammer: acknowledgment rate by channel, with a sharp dip around channels 15 to 25 and an RSSI scale on the right." width="640" height="480" loading="lazy" decoding="async">
      </a><figcaption><b>Radio test with a jammer.</b> Acknowledgment rate across channels, with an RSSI scale on the right.</figcaption>
    </figure>
    <p class="work-visual-source">My test plots, shown as supplied. They illustrate individual runs rather than the aggregate results above. Select any image to open the full-size version.</p>
  </section>`;
}

function gmuVisuals() {
  const assets = './assets/programs/work/';
  return `<section class="work-gmu-visuals" aria-label="Parrot Bebop reference photos">
    <h4>The Parrot Bebop</h4>
    <div class="work-hardware-pair">
      <figure class="work-reference-figure">
        <a class="work-reference-image" href="${assets}gmu-parrot-bebop-front.jpg" target="_blank" rel="noopener" aria-label="Enlarge the Parrot Bebop drone photo">
          <img src="${assets}gmu-parrot-bebop-front.jpg" alt="Yellow Parrot Bebop quadcopter with its nose-mounted camera and detached propeller guards." width="960" height="640" loading="lazy" decoding="async">
        </a>
        <figcaption>The first-generation Bebop, the model I tested.</figcaption>
      </figure>
      <figure class="work-reference-figure">
        <a class="work-reference-image" href="${assets}gmu-parrot-bebop-detail.jpg" target="_blank" rel="noopener" aria-label="Enlarge the Bebop and controller photo">
          <img src="${assets}gmu-parrot-bebop-detail.jpg" alt="A Parrot Bebop beside its handheld controller and antenna." width="500" height="750" loading="lazy" decoding="async">
        </a>
        <figcaption>Bebop with its controller.</figcaption>
      </figure>
    </div>
    <p class="work-visual-source">Reference photos by WEi WEi, resized. <a href="https://commons.wikimedia.org/wiki/File:PARROT_(15838362350).jpg" target="_blank" rel="noopener noreferrer">Drone photo</a> · <a href="https://commons.wikimedia.org/wiki/File:PARROT_(15838187838).jpg" target="_blank" rel="noopener noreferrer">Controller photo</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener noreferrer">CC BY 2.0</a></p>
  </section>`;
}

export function mount(root) {
  const controller = new AbortController();
  let selected = 0;

  root.innerHTML = `<section class="work-program" aria-label="Work experience">
    <header class="mac-titlebar"><h2>Work experience</h2></header>
    <div class="work-layout">
      <nav class="work-index" aria-label="Choose a role">${experiences.map((job, index) => `
        <button type="button" data-work-role="${index}" aria-pressed="${index === 0}" aria-controls="work-role-detail" aria-label="${job.name}: ${job.role}">
          ${brandLogo(job, 'work-index-logo')}<b>${job.short}</b><span class="work-area">${job.area}</span>
        </button>`).join('')}
      </nav>
      <label class="work-compact"><span>Role</span><select class="mac-control" data-work-compact aria-label="Choose a role">${experiences.map((job, index) => `<option value="${index}">${job.short}</option>`).join('')}</select></label>
      <div class="work-page mac-pane" id="work-role-detail" tabindex="0" role="region"></div>
    </div>
  </section>`;
  const page = root.querySelector('.work-page');

  function render() {
    const job = experiences[selected];
    root.querySelectorAll('[data-work-role]').forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === selected));
    });
    root.querySelector('[data-work-compact]').value = String(selected);
    page.setAttribute('aria-label', `${job.name} experience`);
    const isDraftKings = job.id === 'draftkings';
    page.innerHTML = `<article class="work-document mac-page-enter${isDraftKings ? ' dk-story' : ''}"><header class="work-identity">
        ${brandLogo(job)}<div><h3 class="mac-document-title">${job.name}</h3><p class="work-role">${job.role}</p><p class="work-dates">${job.dates}</p></div>
      </header>
      ${isDraftKings ? draftkingsExperience(job) : `<h4 class="work-subject">${job.heading}</h4><p>${job.problem}</p>
      ${job.id === 'army' ? armyPublication() : ''}
      <h4 class="work-section-title">My contribution</h4>
      <ul class="work-contribution">${job.contribution.map(item => `<li>${item}</li>`).join('')}</ul>
      <dl class="work-outcomes" aria-label="Results">${job.outcomes.map(([value, description]) => `<div><dt>${value}</dt><dd>${description}</dd></div>`).join('')}</dl>
      <p class="work-scope">${job.scope}</p>
      ${job.id === 'duke' ? dukeVisuals() : ''}
      ${job.id === 'army' ? armyVisuals() : ''}
      ${job.id === 'gmu' ? gmuVisuals() : ''}
      <details class="work-detail"><summary>Technical detail</summary>
        <div>${job.detail.map(item => `<p>${item}</p>`).join('')}<p class="work-tech"><b>Tools</b> ${job.tech}</p></div>
      </details>`}</article>`;
    page.scrollTop = 0;
  }

  function select(index) {
    if (selected === index) return;
    selected = index;
    render();
  }

  function renderCounterRows(pageNumber) {
    const selectedFilter = page.querySelector('[data-counter-filter]:checked');
    page.querySelector('[data-counter-rows]').innerHTML = counterRows(pageNumber, counterFilters[selectedFilter.value]);
  }

  function setCounterPage(requestedPage) {
    const pageNumber = Math.max(1, Math.min(counterPageCount, Math.trunc(requestedPage) || 1));
    const [start, end] = counterRange(pageNumber);
    page.querySelector('[data-counter-page]').value = pageNumber;
    page.querySelector('[data-counter-range]').textContent = `Runs ${counterNumber.format(start + 1)}–${counterNumber.format(end)}`;
    page.querySelector('[data-counter-step="-1"]').disabled = pageNumber === 1;
    page.querySelector('[data-counter-step="1"]').disabled = pageNumber === counterPageCount;
    renderCounterRows(pageNumber);
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-work-role]');
    if (button) select(Number(button.dataset.workRole));
    const step = event.target.closest('[data-counter-step]');
    if (step) setCounterPage(Number(page.querySelector('[data-counter-page]').value) + Number(step.dataset.counterStep));
  }, { signal: controller.signal });

  root.addEventListener('change', event => {
    if (event.target.matches('[data-work-compact]')) select(Number(event.target.value));
    if (event.target.matches('[data-counter-page]')) setCounterPage(Number(event.target.value));
    if (event.target.matches('[data-counter-filter]')) {
      const filter = counterFilters[event.target.value];
      renderCounterRows(Number(page.querySelector('[data-counter-page]').value));
      page.querySelector('[data-counter-result]').textContent = counterResult(filter);
    }
  }, { signal: controller.signal });

  // Native buttons support Tab/Enter; arrows also browse the four roles.
  root.addEventListener('keydown', event => {
    const button = event.target.closest('[data-work-role]');
    if (!button || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = Number(button.dataset.workRole);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? experiences.length - 1 :
      (current + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + experiences.length) % experiences.length;
    select(next);
    root.querySelector(`[data-work-role="${next}"]`).focus();
  }, { signal: controller.signal });

  render();
  return () => {
    controller.abort();
    root.replaceChildren();
  };
}
