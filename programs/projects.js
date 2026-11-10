/** Public portfolio stories. Sample demos never call project backends or expose source datasets. */
const asset = name => new URL(`../assets/programs/projects/${name}`, import.meta.url).href;
const records = [
  {
    id: 'playground', name: 'Playground AI', tab: 'Playground',
    videoId: '1ns7t31nPWY',
    summary: 'A course assistant that shows its sources.',
    purpose: 'Students ask questions about their course PDFs and notes. Instructors explore how course concepts connect and where students need help.',
    contribution: 'I built citation-backed answers, a NetworkX / vis.js knowledge graph, and a K-means module that groups student questions to surface curriculum gaps.',
    outcome: 'Duke OIT adopted the Canvas application, as reported in my résumé.',
    tech: 'Python, Flask, Vertex AI, NetworkX, vis.js, Terraform',
  },
  {
    id: 'amdahl', name: 'Amdahl', tab: 'Amdahl',
    videoId: '0XdME2cXink', videoStart: 115,
    summary: 'Turn mixed-format records into usable data.',
    purpose: 'Small government agencies spend time finding and normalizing information across documents. Amdahl connects document retrieval and extraction to citation-backed analysis.',
    contribution: 'My contribution was automated document extraction and standardized metadata pipelines. The wider team built the consulting workflow around that foundation.',
    outcome: 'My résumé reports 10,000+ pages processed and an 85% reduction in manual retention-analysis time. Amdahl also placed in the top 10% of LeapYear applicants.',
    tech: 'Python, LangChain, ChromaDB',
  },
];

function projectVideo({ name, videoId, videoStart }) {
  const embed = `https://www.youtube.com/embed/${videoId}${videoStart ? `?start=${videoStart}` : ''}`;
  const watch = `https://www.youtube.com/watch?v=${videoId}${videoStart ? `&amp;t=${videoStart}s` : ''}`;
  return `<figure class="project-visual">
    <iframe class="project-player" src="${embed}" title="${name} demo" width="560" height="315" loading="lazy"
      referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
    <figcaption><a href="${watch}" target="_blank" rel="noopener noreferrer">Watch the ${name} demo on YouTube</a></figcaption>
  </figure>`;
}

const fields = [
  { id: 'department', name: 'Department', value: 'Parks & recreation', source: 'The department is normalized to a consistent metadata field.' },
  { id: 'record', name: 'Record type', value: 'Facility inspection', source: 'The document’s record type becomes a structured category.' },
  { id: 'retention', name: 'Retention period', value: '3 years after closure', source: 'The retention condition stays attached to its source, not just a number.' },
];
function amdahlVisual(field, view) {
  if (view === 'sketch') return `<figure class="project-visual amdahl-visual"><div class="project-demo-intro"><strong>Original team architecture sketch</strong><button type="button" data-amdahl-view="sample">Back to sample</button></div><a href="${asset('amdahl-original-workflow.png')}" target="_blank" rel="noopener noreferrer" aria-label="Open original Amdahl architecture sketch at full size"><img class="amdahl-sketch" src="${asset('amdahl-original-workflow.png')}" alt="Original Amdahl design sketch connecting email intake, clarification, research, analysis, quality assurance, and report delivery." width="1285" height="712"></a><figcaption>Design artifact from the team’s website project. My contribution centered on extraction and metadata. Select the image to enlarge.</figcaption></figure>`;
  return `<figure class="project-visual amdahl-visual"><div class="project-demo-intro"><strong>From document to record</strong><span>Illustrative data, no live AI</span></div>
    <div class="extraction-demo"><div class="extraction-paper"><p class="extraction-paper-title">Sample records policy</p><p>Department<br><mark class="${field === 'department' ? 'is-source' : ''}">Parks & recreation</mark></p><p>Record category<br><mark class="${field === 'record' ? 'is-source' : ''}">Facility inspection</mark></p><p>Retention requirement<br><mark class="${field === 'retention' ? 'is-source' : ''}">Keep for 3 years after closure.</mark></p><span class="extraction-page">Sample document · Page 1</span></div>
    <div class="extraction-output"><p>Select a field to trace its source</p>${fields.map(item => `<button type="button" data-field="${item.id}" aria-pressed="${item.id === field}"><span>${item.name}</span><strong>${item.value}</strong></button>`).join('')}</div></div>
    <p class="extraction-explanation" aria-live="polite">${fields.find(item => item.id === field).source}</p>
    <div class="project-demo-actions"><button type="button" data-amdahl-view="sketch">See original architecture sketch</button></div>
    <figcaption>A simplified explanation of extraction and metadata. All records here are invented examples, not government records or real extraction output.</figcaption></figure>`;
}

export function mount(root) {
  const events = new AbortController();
  let selected = 0;
  let field = 'retention';
  let amdahlView = 'sample';
  root.classList.add('projects-program');
  root.innerHTML = `<nav class="project-index" aria-label="Past projects">${records.map((record, index) => `<button type="button" data-record="${index}" aria-pressed="${index === 0}">${record.tab}</button>`).join('')}</nav><div class="project-document" tabindex="0" aria-label="Project details"></div>`;
  const documentArea = root.querySelector('.project-document');
  function render() {
    const record = records[selected];
    const isAmdahl = record.id === 'amdahl';
    root.querySelectorAll('[data-record]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.record) === selected)));
    documentArea.innerHTML = `<article class="project-story">
      <header class="project-heading"><h3>${record.name}</h3><p class="project-summary">${record.summary}</p></header>
      ${projectVideo(record)}
      <p class="project-purpose">${record.purpose}</p>
      <section class="project-note"><h4>What I built</h4><p>${record.contribution}</p></section>
      <section class="project-note"><h4>Evidence &amp; outcome</h4><p>${record.outcome}</p></section>
      <p class="project-tech">${record.tech}</p>
      ${isAmdahl ? `<div data-visual>${amdahlVisual(field, amdahlView)}</div>
      <div class="project-links"><a href="https://amdahl.app/" target="_blank" rel="noopener noreferrer">Project website</a><a href="https://github.com/AaravMohanty/Amdahl" target="_blank" rel="noopener noreferrer">Public repository</a></div>` :
      '<p class="project-access">The course application requires Canvas access.</p>'}
    </article>`;
  }
  function refreshVisual(focusSelector) {
    const scroll = documentArea.scrollTop;
    root.querySelector('[data-visual]').innerHTML = amdahlVisual(field, amdahlView);
    root.querySelector(focusSelector)?.focus({ preventScroll: true });
    documentArea.scrollTop = scroll;
  }
  root.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-record')) {
      const next = Number(button.dataset.record);
      if (next === selected) return;
      selected = next;
      render();
      documentArea.scrollTop = 0;
    } else if (button.hasAttribute('data-field')) {
      field = button.dataset.field;
      refreshVisual(`[data-field="${field}"]`);
    } else if (button.hasAttribute('data-amdahl-view')) {
      amdahlView = button.dataset.amdahlView;
      refreshVisual('[data-amdahl-view]');
    }
  }, { signal: events.signal });
  render();
  return () => {
    events.abort();
    root.classList.remove('projects-program');
    root.replaceChildren();
  };
}
