/**
 * Chrome for the page itself: the sidebar index tracks whatever section you are
 * reading, and a small button appears once "back to top" stops being a short trip.
 * Kept out of app.js so navigation still works if the race module fails to load.
 */

/* -------------------------------------------------------- reload position */

/**
 * A reload should always start at the top. Left to its own devices the browser
 * restores the previous scroll position, and any #fragment lingering in the URL
 * from an index click re-anchors the page partway down. Fresh visits to a
 * shared #fragment link still anchor normally.
 */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const navEntry = performance.getEntriesByType('navigation')[0];
if (navEntry && navEntry.type !== 'navigate') {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
}

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

/* -------------------------------------------------------------- marquee */

/**
 * The ticker loops by sliding the track half its own width, so the half that
 * scrolls off is replaced by an identical half. That only reads as continuous
 * while a half is at least as wide as the viewport — otherwise the tail runs
 * out mid-sentence and you watch empty bar until the loop comes back around.
 * The HTML only ships two copies, so wide windows get topped up here, and the
 * duration is rewritten from the measured width to keep the speed constant.
 */

const marqueeTrack = document.querySelector('.marquee-track');

if (marqueeTrack?.firstElementChild && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const unit = marqueeTrack.firstElementChild;
  const SPEED = 31; // px per second, the pace the old fixed 46s loop scrolled at
  let copiesPerHalf = 0;

  const fill = () => {
    const width = unit.getBoundingClientRect().width;
    if (!width) return;

    // One copy of slack past the viewport so the seam lands off-screen. Copies
    // only ever get added — dropping them would jump the text mid-scroll.
    const needed = Math.ceil(window.innerWidth / width) + 1;
    if (needed > copiesPerHalf) {
      copiesPerHalf = needed;
      while (marqueeTrack.children.length < copiesPerHalf * 2) {
        marqueeTrack.append(unit.cloneNode(true));
      }
    }

    marqueeTrack.style.animationDuration = `${(copiesPerHalf * width) / SPEED}s`;
  };

  fill();
  window.addEventListener('resize', fill);
  // Webfonts land after first paint and change how wide a copy measures.
  document.fonts?.ready.then(fill);
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
