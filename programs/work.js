import { draftkingsExperience, bindDraftkings } from './work-draftkings.js';
import { dukeExperience, bindDuke } from './work-duke.js';

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
    scope: 'These are research results on mouse recordings. They do not establish clinical performance or a deployed diagnostic tool.',
    detail: [
      'Preprocessing covered eight hours of raw audio, using adaptive thresholding and Gaussian denoising to prepare spectrograms.',
      'Calls are detected with a sliding window over each recording. SqueakOut segmentation masks become call boxes, and calls split across window edges are merged.',
      'Each call is encoded by the frozen MobileNetV2 backbone. The backbone can be tapped at 32 to 1,280 dimensions. The 96-dimension layer limits overfitting on a small dataset. Hand-crafted features such as duration, pitch slope and bandwidth can be concatenated per call.',
      'A 2×2×2 ablation on Duke’s H200 cluster crossed noise augmentation, encoder-only versus combined features, and sliced-Wasserstein versus average pooling. Jobs ran as SLURM arrays.',
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
    const story = { draftkings: ['dk-story', draftkingsExperience], duke: ['du-story', dukeExperience] }[job.id];
    page.innerHTML = `<article class="work-document mac-page-enter${story ? ` ${story[0]}` : ''}"><header class="work-identity">
        ${brandLogo(job)}<div><h3 class="mac-document-title">${job.name}</h3><p class="work-role">${job.role}</p><p class="work-dates">${job.dates}</p></div>
      </header>
      ${story ? story[1](job) : `<h4 class="work-subject">${job.heading}</h4><p>${job.problem}</p>
      ${job.id === 'army' ? armyPublication() : ''}
      <h4 class="work-section-title">My contribution</h4>
      <ul class="work-contribution">${job.contribution.map(item => `<li>${item}</li>`).join('')}</ul>
      <dl class="work-outcomes" aria-label="Results">${job.outcomes.map(([value, description]) => `<div><dt>${value}</dt><dd>${description}</dd></div>`).join('')}</dl>
      <p class="work-scope">${job.scope}</p>
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

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-work-role]');
    if (button) select(Number(button.dataset.workRole));
  }, { signal: controller.signal });

  root.addEventListener('change', event => {
    if (event.target.matches('[data-work-compact]')) select(Number(event.target.value));
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

  bindDraftkings(page, controller.signal);
  bindDuke(page, controller.signal);
  render();
  return () => {
    controller.abort();
    root.replaceChildren();
  };
}
