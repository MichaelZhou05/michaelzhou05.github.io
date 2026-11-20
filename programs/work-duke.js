// Duke page: disease background, genotypes, DeepSqueak reference views, call-type sketches,
// the classifier pipeline, and a litter-split explainer.
// Call sketches and the litter toy are illustrative drawings, not lab data. Real figures appear only in the stat lines.

const deepsqueakGuide = 'https://github.com/DrCoffey/DeepSqueak/wiki/Main-Window';
const deepsqueakImage = './assets/programs/work/deepsqueak-reference-ui.png';

const genotypes = [
  { name: 'Wildtype', alleles: ['+', '+'], label: 'Healthy', note: 'Two working copies of GALC.' },
  { name: 'Heterozygous', alleles: ['+', 'twi'], label: 'Healthy', note: 'A carrier. One working copy is enough.' },
  { name: 'Twitcher', alleles: ['twi', 'twi'], label: 'Krabbe', note: 'No working GALC. Develops the disease.', sick: true },
];

function genotypeStrip() {
  return `<figure class="du-geno">
    <ul class="du-geno-cards">${genotypes.map(g => `
      <li class="${g.sick ? 'is-sick' : ''}">
        <span class="du-geno-name">${g.name}</span>
        <span class="du-alleles" aria-label="GALC alleles ${g.alleles.join(' and ')}">${g.alleles.map(a => `<i class="${a === '+' ? 'is-ok' : 'is-mut'}">${a}</i>`).join('')}</span>
        <span class="du-geno-note">${g.note}</span>
        <b class="du-geno-label">${g.label}</b>
      </li>`).join('')}
    </ul>
    <figcaption>Krabbe is recessive, so carriers stay healthy. The classifier groups wildtype and heterozygous pups as <b>healthy</b> and predicts <b>twitcher</b> against them.</figcaption>
  </figure>`;
}

function deepsqueakViews() {
  return `<div class="du-ds">
    <figure class="work-reference-figure">
      <a class="work-reference-image work-reference-full" href="${deepsqueakImage}" target="_blank" rel="noopener" aria-label="Open full-size DeepSqueak interface image">
        <img src="${deepsqueakImage}" alt="Annotated DeepSqueak interface with call statistics, spectrograms, detection boxes, and review controls." width="1634" height="962" loading="lazy" decoding="async">
      </a>
      <figcaption><b>DeepSqueak.</b> The standard tool for finding calls. It turns audio into a spectrogram, boxes each call, and lets a researcher accept or reject it.</figcaption>
    </figure>
    <figure class="work-reference-figure">
      <a class="work-reference-image work-reference-usvs" href="${deepsqueakImage}" target="_blank" rel="noopener" aria-label="Open full-size source for the ultrasonic call close-up">
        <img src="${deepsqueakImage}" alt="Close-up of ultrasonic vocalizations: bright curved tracks show sound energy across time and frequency; green call boxes are retained from the original screenshot." width="1634" height="962" loading="lazy" decoding="async">
      </a>
      <figcaption><b>A call, up close.</b> Time runs left to right and pitch runs bottom to top. Each bright track is one call.</figcaption>
    </figure>
    <figure class="work-reference-figure">
      <a class="work-reference-image work-reference-detections" href="${deepsqueakImage}" target="_blank" rel="noopener" aria-label="Open full-size source for the detection overview">
        <img src="${deepsqueakImage}" alt="A longer spectrogram with green boxes marking detected vocalizations and a highlighted window connecting the overview to the close-up." width="1634" height="962" loading="lazy" decoding="async">
      </a>
      <figcaption><b>Detections across a recording.</b> Green boxes mark calls. One recording holds hundreds of them.</figcaption>
    </figure>
    <p class="work-visual-source">All three views crop one public screenshot from the <a href="${deepsqueakGuide}" target="_blank" rel="noopener noreferrer">DeepSqueak guide</a> (image credit: the DeepSqueak authors). They are not results from the Duke study. Select any image for the full-size original.</p>
  </div>`;
}

// Sketches of the call categories from Scattoni et al. (2008). viewBox: time → x, pitch ↑ = smaller y.
const callTypes = [
  ['Upward', '<path d="M8 32C24 30 40 22 52 10"/>'],
  ['Downward', '<path d="M8 10C24 12 40 22 52 32"/>'],
  ['Flat', '<path d="M8 21C20 20 40 22 52 21"/>'],
  ['Chevron', '<path d="M8 32C20 4 40 4 52 32"/>'],
  ['Short', '<path d="M26 22 34 19"/>'],
  ['Complex', '<path d="M6 26C10 12 16 12 20 24S30 34 34 20 46 8 54 16"/>'],
  ['Two-syllable', '<path d="M8 28H28"/><path class="du-jump" d="M28 28V14"/><path d="M28 14C38 13 46 15 52 16"/>'],
  ['Frequency steps', '<path d="M6 30H20"/><path d="M20 21H36"/><path d="M36 11H54"/>'],
  ['Composite', '<path d="M8 28C24 26 40 27 52 25"/><path d="M14 14C26 10 38 12 48 16"/>'],
  ['Harmonics', '<path d="M8 30C24 28 38 24 52 22"/><path class="du-harm" d="M8 14C24 12 38 8 52 6"/>'],
];

function callGallery() {
  return `<figure class="du-calls">
    <ul>${callTypes.map(([name, path]) => `<li><svg viewBox="0 0 60 40" aria-hidden="true">${path}</svg><span>${name}</span></li>`).join('')}</ul>
    <figcaption>Call types that researchers sort USVs into, after Scattoni et al. (2008). Hand-drawn sketches.</figcaption>
  </figure>`;
}

const nodes = [
  { id: 'audio', x: 10, y: 20, title: 'Recording', sub: '7-day-old pup',
    note: 'A pup is briefly separated from its nest and recorded with an ultrasonic microphone.' },
  { id: 'spec', x: 160, y: 20, title: 'Spectrogram', sub: '30–130 kHz', mine: true,
    note: 'I turned raw audio into denoised spectrograms, the time-by-pitch images every later step reads.' },
  { id: 'detect', x: 310, y: 20, title: 'Find calls', sub: 'SqueakOut masks',
    note: 'SqueakOut, a pretrained segmentation model, marks the pixels that belong to calls. A sliding window covers the whole recording.' },
  { id: 'crop', x: 460, y: 20, title: 'Call crops', sub: '300 ms · 512×512', mine: true,
    note: 'Each call becomes a fixed 300 ms window, padded or cropped, so every pixel means the same time and pitch across the dataset.' },
  { id: 'encoder', x: 460, y: 140, title: 'Encoder', sub: 'frozen MobileNetV2',
    note: 'The first half of SqueakOut. Trained to find calls, it already compresses each call’s shape into a 96-number vector. Its weights stay frozen.' },
  { id: 'pool', x: 310, y: 140, title: 'Pool calls', sub: 'mean · SWE · attn', mine: true,
    note: 'A recording has hundreds of calls. Pooling turns them into one vector: an average, a sliced-Wasserstein embedding, or attention that learns which calls matter.' },
  { id: 'head', x: 160, y: 140, title: 'Classifier head', sub: 'MLP · SVM · forest', mine: true,
    note: 'The new layer on top. A small neural network, an SVM, and a random forest each predict the label from the pooled vector.' },
  { id: 'out', x: 10, y: 140, title: 'Prediction', sub: 'twitcher | healthy',
    note: 'One label per pup. Wildtype and heterozygous pups count as healthy.' },
];

const defaultNote = 'Select a box to see what it does. Filled boxes are the parts I built.';

function pipelineMap() {
  const w = 130, h = 54;
  const boxes = nodes.map(n => `
    <g class="du-node${n.mine ? ' is-mine' : ''}" data-du-node="${n.id}" tabindex="0" role="button" aria-label="${n.title}: ${n.note}">
      <rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="4"/>
      <text x="${n.x + w / 2}" y="${n.y + 23}" class="du-node-title">${n.title}</text>
      <text x="${n.x + w / 2}" y="${n.y + 40}" class="du-node-sub">${n.sub}</text>
    </g>`).join('');
  const list = nodes.map(n => `<li class="${n.mine ? 'is-mine' : ''}"><b>${n.title}</b> ${n.note}</li>`).join('');

  return `<figure class="du-map">
    <svg viewBox="0 0 600 214" role="group" aria-label="Classifier pipeline: recording, spectrogram, call detection, call crops, frozen encoder, pooling, classifier head, prediction.">
      <defs><marker id="du-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 8 4 0 8z"/></marker></defs>
      <g class="du-wires" marker-end="url(#du-arrow)">
        <path d="M140 47H156"/><path d="M290 47H306"/><path d="M440 47H456"/>
        <path d="M525 74V136"/>
        <path d="M460 167H444"/><path d="M310 167H294"/><path d="M160 167H144"/>
      </g>
      <text x="533" y="110" class="du-wire-label">per call</text>
      <text x="300" y="207" class="du-wire-label" text-anchor="middle">per recording</text>
      ${boxes}
    </svg>
    <ol class="du-map-list">${list}</ol>
    <figcaption><span class="du-swatch" aria-hidden="true"></span>Built by me <span class="du-swatch is-pre" aria-hidden="true"></span>Pretrained SqueakOut or input <output class="du-map-note" data-du-note aria-live="polite">${defaultNote}</output></figcaption>
  </figure>`;
}

// Six made-up litters. 1 = twitcher, 0 = healthy. Which pups land in the test set under each split.
const litters = [[1, 0, 0, 1, 0], [0, 1, 0, 0], [1, 0, 1, 0, 0], [0, 0, 1, 0], [1, 0, 0, 0, 1], [0, 1, 0, 0]];
const randomTest = new Set(['0-1', '1-3', '2-0', '3-2', '4-4', '5-1', '2-3']);
const groupedTest = new Set([2, 5]);

function litterRows(mode) {
  return litters.map((pups, li) => `<li><span class="du-litter-name">Litter ${li + 1}</span>${pups.map((sick, pi) => {
    const test = mode === 'grouped' ? groupedTest.has(li) : randomTest.has(`${li}-${pi}`);
    return `<i class="${sick ? 'is-sick' : ''}${test ? ' is-test' : ''}" title="${sick ? 'Twitcher' : 'Healthy'}, ${test ? 'test' : 'train'}"></i>`;
  }).join('')}</li>`).join('');
}

const litterNotes = {
  random: 'Random split: siblings land on both sides. The model can score well by recognizing a litter’s recording session instead of the disease.',
  grouped: 'Grouped split: whole litters are held out, so test pups come from litters the model never saw.',
};

function litterDemo() {
  return `<figure class="du-litters" data-du-litters>
    <div class="du-chips" role="group" aria-label="Choose a split">
      <button type="button" data-du-split="random" aria-pressed="false">Random split</button>
      <button type="button" data-du-split="grouped" aria-pressed="true">Split by litter</button>
    </div>
    <ul class="du-litter-rows" data-du-rows aria-hidden="true">${litterRows('grouped')}</ul>
    <p class="du-legend" aria-hidden="true"><i class="is-sick"></i>Twitcher <i></i>Healthy <i class="is-test"></i>Test set</p>
    <figcaption data-du-split-note aria-live="polite">${litterNotes.grouped}</figcaption>
  </figure>`;
}

export function dukeExperience(job) {
  return `<section class="du-intro">
      <h4 class="du-h">The disease</h4>
      <p><b>Krabbe disease</b> is a rare inherited disorder that destroys the myelin insulating nerve cells. Treatment works best before symptoms start, so early detection matters. The lab studies the <b>twitcher mouse</b>, which carries a natural mutation in the same gene, <i>GALC</i>. Twitcher pups look normal until about their third week.</p>
      ${genotypeStrip()}
    </section>

    <section class="du-block">
      <h4 class="du-h">The question</h4>
      <p>Mouse pups separated from the nest call for their mother with <b>ultrasonic vocalizations (USVs)</b>, between 30 and 130 kHz, well above human hearing. Changes in these calls can be an early sign of neurological disease. The project asks whether a model can pick out twitcher pups from their calls at 7 days old.</p>
    </section>

    <section class="du-block">
      <h4 class="du-h"><span class="du-badge">1</span>Finding the calls</h4>
      <p>Labs detect calls with tools like DeepSqueak, then sort each one by shape and compare counts between groups. That sorting was done by hand and took more than 10 hours per experiment.</p>
      ${deepsqueakViews()}
      ${callGallery()}
    </section>

    <section class="du-block">
      <h4 class="du-h"><span class="du-badge">2</span>From detector to classifier</h4>
      <p>SqueakOut is a pretrained autoencoder that segments mouse calls. Its encoder half already compresses each call into a feature vector. I froze that encoder and added a classification head on top, so call shapes are learned from the spectrogram instead of labeled by hand. Every call in a recording is encoded, the vectors are pooled into one, and the head predicts twitcher or healthy.</p>
      ${pipelineMap()}
      <p class="du-stat"><b>~30 min</b> to prepare an experiment, down from 10+ hours</p>
    </section>

    <section class="du-block">
      <h4 class="du-h"><span class="du-badge">3</span>Testing it honestly</h4>
      <p>Pups from the same litter share parents, a cage and a recording session. If siblings appear in both training and test data, accuracy looks better than it is. I split folds by litter and compared random forests, SVMs and neural networks with cross-validation.</p>
      ${litterDemo()}
      <p class="du-stat"><b>Up to 86%</b> disease-classification accuracy in lab evaluation</p>
      <p class="du-scope">${job.scope}</p>
    </section>

    <details class="work-detail du-detail"><summary>Technical detail</summary>
      <div>${job.detail.map(item => `<p>${item}</p>`).join('')}</div>
    </details>
    <p class="work-tech"><b>Tools</b> ${job.tech}</p>`;
}

export function bindDuke(page, signal) {
  const note = () => page.querySelector('[data-du-note]');
  const show = el => {
    const n = nodes.find(n => n.id === el.dataset.duNode);
    if (n && note()) note().textContent = n.note;
  };

  page.addEventListener('pointerover', e => { const el = e.target.closest?.('[data-du-node]'); if (el) show(el); }, { signal });
  page.addEventListener('focusin', e => { const el = e.target.closest?.('[data-du-node]'); if (el) show(el); }, { signal });
  page.addEventListener('click', e => {
    const node = e.target.closest('[data-du-node]');
    if (node) show(node);

    const split = e.target.closest('[data-du-split]');
    if (split) {
      const mode = split.dataset.duSplit;
      page.querySelectorAll('[data-du-split]').forEach(b => b.setAttribute('aria-pressed', String(b === split)));
      page.querySelector('[data-du-rows]').innerHTML = litterRows(mode);
      page.querySelector('[data-du-split-note]').textContent = litterNotes[mode];
    }
  }, { signal });
}
