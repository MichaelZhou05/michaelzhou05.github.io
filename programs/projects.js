import { projects } from './project-stories.js';

const readerUrl = id => new URL(`../projects.html?project=${id}`, import.meta.url).href;
const fields = [
  { id: 'department', name: 'Department', value: 'Parks & recreation', source: 'The department is normalized to a consistent metadata field.' },
  { id: 'record', name: 'Record type', value: 'Facility inspection', source: 'The document’s record type becomes a structured category.' },
  { id: 'retention', name: 'Retention period', value: '3 years after closure', source: 'The retention condition stays attached to the original excerpt.' },
];

function extractionExample(field) {
  return `<figure class="extraction-example">
    <div class="project-demo-intro"><strong>Trace a field to its source</strong><span>Illustrative example</span></div>
    <div class="extraction-demo">
      <div class="extraction-paper">
        <p class="extraction-paper-title">Sample records policy</p>
        <p>Department<br><mark data-excerpt="department" class="${field === 'department' ? 'is-source' : ''}">Parks &amp; recreation</mark></p>
        <p>Record category<br><mark data-excerpt="record" class="${field === 'record' ? 'is-source' : ''}">Facility inspection</mark></p>
        <p>Retention requirement<br><mark data-excerpt="retention" class="${field === 'retention' ? 'is-source' : ''}">Keep for 3 years after closure.</mark></p>
        <span class="extraction-page">Sample document · Page 1</span>
      </div>
      <div class="extraction-output">
        <p>Select a normalized field</p>
        ${fields.map(item => `<button type="button" data-field="${item.id}" aria-pressed="${item.id === field}"><span>${item.name}</span><strong>${item.value}</strong></button>`).join('')}
      </div>
    </div>
    <p class="extraction-explanation" aria-live="polite">${fields.find(item => item.id === field).source}</p>
    <figcaption>A fictional records policy illustrates how a structured field can stay linked to its source.</figcaption>
  </figure>`;
}

function walkthrough({ name, videoId, videoStart }) {
  const watch = `https://www.youtube.com/watch?v=${videoId}${videoStart ? `&amp;t=${videoStart}s` : ''}`;
  return `<div class="project-video">
    <button class="mac-control" type="button" data-play-video>Load demo video</button>
    <a href="${watch}" target="_blank" rel="noopener noreferrer">Watch the ${name} demo on YouTube</a>
  </div>`;
}

function article(project, { fullPage, field }) {
  const title = fullPage ? 'h1' : 'h3';
  const heading = fullPage ? 'h2' : 'h4';
  const link = section => `#${project.id}-${section}`;
  return `<article class="project-story mac-page-enter" data-project="${project.id}">
    <header class="project-heading">
      <${title} class="mac-document-title">${project.name}</${title}>
      <p class="project-subtitle">${project.subtitle}</p>
      ${fullPage ? `<p class="project-intro">${project.intro}</p>` :
        `<a class="project-reader-link" href="${readerUrl(project.id)}">Open full-page case study <span aria-hidden="true">↗</span></a>`}
    </header>
    ${project.hero}
    ${fullPage ? '' : `<p class="project-intro project-intro-inset">${project.intro}</p>`}
    <aside class="project-ownership" aria-label="Project contribution">
      <strong>My role</strong><p>${project.role}</p>
    </aside>
    <nav class="project-contents" aria-label="In this case study">
      <strong>In this case study</strong>
      <ul>${project.sections.map(section => `<li><a href="${link(section.id)}">${section.nav}</a></li>`).join('')}
        <li><a href="${link('demo')}">Video demo</a></li></ul>
    </nav>
    ${project.sections.map(section => `<section class="project-section" id="${project.id}-${section.id}"${fullPage ? '' : ' tabindex="-1"'}>
      <${heading}>${section.title}</${heading}>
      ${section.body}
      ${section.extractionExample ? extractionExample(field) : ''}
    </section>`).join('')}
    <section class="project-section" id="${project.id}-demo"${fullPage ? '' : ' tabindex="-1"'}>
      <${heading}>Video demo</${heading}>
      ${walkthrough(project)}
      ${project.links ? `<div class="project-links">${project.links}</div>` : ''}
    </section>
  </article>`;
}

export function mount(root, { fullPage = false, projectId } = {}) {
  const events = new AbortController();
  let selected = projects.find(project => project.id === projectId) ?? projects[0];
  let field = 'retention';

  root.classList.add('projects-program');
  root.innerHTML = fullPage
    ? `<header class="project-reader-bar">
        <a href="./#projects">← Portfolio</a>
        <nav aria-label="Project case studies">${projects.map(project =>
          `<a href="${readerUrl(project.id)}"${project === selected ? ' aria-current="page"' : ''}>${project.tab}</a>`).join('')}</nav>
      </header>
      <div id="project-document" class="project-document"></div>`
    : `<header class="mac-titlebar"><h2>Past projects</h2></header>
      <nav class="project-index mac-tabs" aria-label="Choose a project">${projects.map(project =>
        `<button type="button" data-record="${project.id}" aria-pressed="${project === selected}" aria-controls="project-document">${project.tab}</button>`).join('')}</nav>
      <div class="project-document mac-pane" id="project-document" tabindex="0" role="region"></div>`;
  const documentArea = root.querySelector('.project-document');

  function render() {
    root.querySelectorAll('[data-record]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.record === selected.id));
    });
    if (!fullPage) documentArea.setAttribute('aria-label', `${selected.name} project details`);
    documentArea.innerHTML = article(selected, { fullPage, field });
  }

  root.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const sectionLink = event.target.closest('.project-contents a');
    if (sectionLink && !fullPage && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      const section = document.getElementById(sectionLink.hash.slice(1));
      if (section) {
        event.preventDefault();
        const top = section.getBoundingClientRect().top - documentArea.getBoundingClientRect().top;
        documentArea.scrollTop += top - 12;
        section.focus({ preventScroll: true });
      }
      return;
    }

    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-record')) {
      const next = projects.find(project => project.id === button.dataset.record);
      if (!next || next === selected) return;
      selected = next;
      render();
      documentArea.scrollTop = 0;
    } else if (button.hasAttribute('data-field')) {
      field = button.dataset.field;
      const example = button.closest('.extraction-example');
      example.querySelectorAll('[data-field]').forEach(control => {
        control.setAttribute('aria-pressed', String(control.dataset.field === field));
      });
      example.querySelectorAll('[data-excerpt]').forEach(excerpt => {
        excerpt.classList.toggle('is-source', excerpt.dataset.excerpt === field);
      });
      example.querySelector('.extraction-explanation').textContent = fields.find(item => item.id === field).source;
    } else if (button.hasAttribute('data-play-video')) {
      const start = selected.videoStart ? `?start=${selected.videoStart}` : '';
      button.outerHTML = `<iframe class="project-player" src="https://www.youtube-nocookie.com/embed/${selected.videoId}${start}"
        title="${selected.name} demo" width="560" height="315" referrerpolicy="strict-origin-when-cross-origin"
        allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
      root.querySelector('.project-player')?.focus();
    }
  }, { signal: events.signal });
  render();

  if (fullPage) {
    document.title = `${selected.name} case study | Michael Zhou`;
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }

  return () => {
    events.abort();
    root.classList.remove('projects-program');
    root.replaceChildren();
  };
}
