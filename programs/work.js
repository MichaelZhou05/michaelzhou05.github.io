// Public-facing summaries checked against the August 2026 full-stack resume.
// Earlier resume versions report different Duke metrics; do not mix evaluations.
const experiences = [
  {
    logo: 'draftkings-logo.svg', brand: 'draftkings',
    id: 'draftkings', short: 'DraftKings', name: 'DraftKings', area: 'Hornet · Data pipelines',
    role: 'Software engineering intern', dates: 'Jun–Aug 2026',
    heading: 'The data pipelines behind True Price',
    problem: 'I interned on Hornet, the data pipeline team behind DraftKings’ True Price platform. Hornet connected live sports and market data to the pricing models and services that estimate what a contract is worth as a game unfolds. The team also made past model outputs available for backtesting, so engineers could evaluate pricing changes against historical data.',
    contribution: [
      'I sped up backtesting by rebuilding the API that retrieves past pricing-model outputs. Instead of scanning S3 on every request, it looked up each result in Snowflake by calculation ID.',
      'I added support for external market feeds to the live pricing service and merged six Kafka consumer paths into one. This gave the service a shared path for processing incoming updates and reduced its memory use.',
      'I built a searchable service catalog that pulled answers from seven runbooks and repositories. Thirteen on-call engineers used it to find out what services did and where to look when something broke.',
    ],
    outcomes: [
      ['63% lower', 'API endpoint latency after replacing S3 scans.'],
      ['24% better', 'Memory efficiency in the market-making pricing service.'],
    ],
    scope: 'DraftKings’ market-making launch traded more than $30 million in contracts during July.',
    detail: [
      'I updated the game-state mapper to publish a removal event when a game dropped out of the feed, so downstream services could clear the stale state.',
      'I fixed a Kafka message-reading error by moving the affected message types into shared contracts and updating the consumers to use them.',
    ],
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

function pricingPipeline() {
  const stages = ['Live data feeds', 'Sports ML models', 'Trader input', 'Market making'];
  return `<figure class="work-pipeline" aria-label="Simplified prediction-market pricing pipeline">
    <div class="work-pipeline-heading"><h4>Prediction-market pricing</h4></div>
    <div class="work-flow-chart" role="img" aria-label="Live feeds supply sports machine-learning models. Their outputs inform trader input and market making. Trader input also feeds back into the pipeline.">
      <div class="work-flow-stages">${stages.map((stage, index) => `<div class="work-flow-node${index === 3 ? ' work-flow-output' : ''}">${stage}${index < 3 ? '<svg class="work-flow-link" viewBox="0 0 22 12" aria-hidden="true"><path class="work-flow-route" d="M0 6 H19"/><path d="m15 2 4 4-4 4"/></svg>' : ''}</div>`).join('')}</div>
      <svg class="work-flow-return work-flow-return-wide" viewBox="0 0 1000 58" preserveAspectRatio="none" aria-hidden="true"><path class="work-flow-route" d="M625 0 V28 Q625 38 610 38 H140 Q125 38 125 28 V0"/><path d="m118 7 7-7 7 7"/></svg>
      <svg class="work-flow-return work-flow-return-narrow" viewBox="0 0 44 290" aria-hidden="true"><path class="work-flow-route" d="M44 188 H17 Q10 188 10 181 V35 Q10 28 17 28 H44"/><path d="m37 23 7 5-7 5"/></svg>
      <span class="work-flow-feedback">Trader feedback</span>
    </div>
    <figcaption>Hornet worked on the data layer that supplies pricing models and makes their outputs available to downstream services.</figcaption>
  </figure>`;
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
    <header class="work-heading"><h2>Work experience</h2><span>2024–2026</span></header>
    <div class="work-layout">
      <nav class="work-index" aria-label="Choose a role">${experiences.map((job, index) => `
        <button type="button" data-work-role="${index}" aria-pressed="${index === 0}" aria-controls="work-role-detail" aria-label="${job.name}: ${job.role}">
          ${brandLogo(job, 'work-index-logo')}<b>${job.short}</b><span>${job.area}</span>
        </button>`).join('')}
      </nav>
      <label class="work-compact"><span>Role</span><select data-work-compact aria-label="Choose a role">${experiences.map((job, index) => `<option value="${index}">${job.short}</option>`).join('')}</select></label>
      <article class="work-page" id="work-role-detail" tabindex="0"></article>
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
    page.innerHTML = `<header class="work-identity">
        ${brandLogo(job)}<div><h3>${job.name}</h3><p class="work-role">${job.role}</p><p class="work-dates">${job.dates}</p></div>
      </header>
      <h4 class="work-subject">${job.heading}</h4><p>${job.problem}</p>
      ${job.id === 'army' ? armyPublication() : ''}
      <h4 class="work-section-title">My contribution</h4>
      <ul class="work-contribution">${job.contribution.map(item => `<li>${item}</li>`).join('')}</ul>
      <dl class="work-outcomes" aria-label="Results">${job.outcomes.map(([value, description]) => `<div><dt>${value}</dt><dd>${description}</dd></div>`).join('')}</dl>
      <p class="work-scope">${job.scope}</p>
      ${job.id === 'draftkings' ? pricingPipeline() : ''}
      ${job.id === 'duke' ? dukeVisuals() : ''}
      ${job.id === 'army' ? armyVisuals() : ''}
      ${job.id === 'gmu' ? gmuVisuals() : ''}
      <details class="work-detail"><summary>Technical detail</summary>
        <div>${job.detail.map(item => `<p>${item}</p>`).join('')}<p class="work-tech"><b>Tools</b> ${job.tech}</p></div>
      </details>`;
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

  render();
  return () => {
    controller.abort();
    root.replaceChildren();
  };
}
