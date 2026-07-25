/**
 * Chrome for the page itself: the sidebar index tracks whatever section you are
 * reading, and a small button appears once "back to top" stops being a short trip.
 * Kept out of app.js so navigation still works if the race module fails to load.
 */

const indexLinks = [...document.querySelectorAll('#site-index a[href^="#"]')];
const sections = indexLinks
  .map((link) => ({ link, section: document.querySelector(link.getAttribute('href')) }))
  .filter((pair) => pair.section);

/* ------------------------------------------------------------- scroll spy */

if (sections.length) {
  let current = null;

  const setCurrent = (link) => {
    if (link === current) return;
    current?.removeAttribute('aria-current');
    link?.setAttribute('aria-current', 'true');
    current = link;
  };

  /**
   * Whichever tracked section covers the reading line — a third of the way down
   * the viewport — is the one you are actually looking at. Falling back to the
   * last section above the line keeps long sections lit while you scroll them.
   */
  const update = () => {
    const line = window.innerHeight / 3;
    let active = sections[0];

    sections.forEach((pair) => {
      if (pair.section.getBoundingClientRect().top <= line) active = pair;
    });

    const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 2;
    setCurrent(atBottom ? sections[sections.length - 1].link : active.link);
  };

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
}

/* ----------------------------------------------------------- back to top */

const toTop = document.getElementById('to-top');

if (toTop) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const toggleTopButton = () => {
    toTop.classList.toggle('is-in', window.scrollY > window.innerHeight * 0.9);
  };

  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  window.addEventListener('scroll', toggleTopButton, { passive: true });
  toggleTopButton();
}
