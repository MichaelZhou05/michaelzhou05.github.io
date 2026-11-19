/**
 * Umami analytics, tagged links and interaction events.
 *
 * Loaded with `defer` in <head>, so it runs after parsing but before the
 * page's module scripts, which lets it hear the first `diskchange`.
 *
 * Tagged links: append ?utm_source=<tag> (or ?ref=<tag>) to any page URL,
 * e.g. https://michaelzhou05.github.io/?utm_source=google-tmatch
 * The tag is remembered in localStorage and attached to every later event
 * from that browser, so return visits stay attributed.
 *
 * Exclude yourself: open the site once with ?notrack on each of your own
 * browsers (?track turns it back on).
 */
(() => {
  // Umami Cloud → Settings → Websites → your site → Website ID.
  const WEBSITE_ID = 'PASTE-UMAMI-WEBSITE-ID';
  const HOST = 'michaelzhou05.github.io';

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) {
      try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch {}
    },
  };
  const params = new URLSearchParams(location.search);

  // Umami itself also honours the `umami.disabled` flag.
  if (params.has('notrack')) store.set('umami.disabled', '1');
  if (params.has('track')) store.set('umami.disabled', null);
  if (store.get('umami.disabled') === '1') {
    window.mzTrack = () => {};
    return;
  }

  const live = location.hostname === HOST && !WEBSITE_ID.startsWith('PASTE');
  const tag = (params.get('ref') || params.get('utm_source') || '').trim().toLowerCase().slice(0, 60);
  const previousRef = store.get('mz:ref');
  const lastSeen = Number(store.get('mz:last')) || 0;
  const ref = tag || previousRef;
  if (tag) store.set('mz:ref', tag);
  store.set('mz:last', String(Date.now()));

  const queue = [];
  function track(name, data = {}) {
    const payload = ref ? {...data, ref} : data;
    if (!live) return console.debug('[track]', name, payload);
    if (window.umami) window.umami.track(name, payload);
    else if (queue.length < 50) queue.push([name, payload]);
  }
  window.mzTrack = track;

  if (live) {
    const script = document.createElement('script');
    script.src = 'https://cloud.umami.is/script.js';
    script.defer = true;
    script.dataset.websiteId = WEBSITE_ID;
    script.dataset.domains = HOST;
    script.onload = () => {
      // Session data makes every visit from a tagged browser filterable by ref.
      if (ref) try { window.umami.identify({ref}); } catch {}
      for (const [name, data] of queue.splice(0)) window.umami.track(name, data);
    };
    document.head.append(script);
  }

  // Arrivals from a tagged link, and later visits from a tagged browser.
  if (tag) track('tagged-visit', {source: tag, returning: previousRef === tag});
  else if (ref && Date.now() - lastSeen > 30 * 60 * 1000) track('tagged-return', {source: ref});

  const label = el => (el.getAttribute('aria-label') || el.textContent || el.title || '')
    .replace(/\s+/g, ' ').trim().slice(0, 80);
  const where = el => el.closest('.mac-program')?.dataset.disk
    || el.closest('section[id]')?.id
    || location.pathname.replace(/^\/|\.html$/g, '') || 'home';

  // Macintosh disks: macintosh.js announces every program that finishes loading.
  document.addEventListener('diskchange', event => {
    if (event.detail?.id) track('program-open', {program: event.detail.id});
  });

  document.addEventListener('click', event => {
    const el = event.target.closest('a[href], button, summary');
    if (!el || el.closest('.mac-disks')) return; // disk picks are covered by program-open
    const from = where(el);

    if (el.matches('a')) {
      const url = new URL(el.href, location.href);
      if (/\.pdf$/i.test(url.pathname)) return track('resume-open', {from});
      if (url.protocol === 'mailto:') return track('email-click', {from});
      if (url.origin !== location.origin) {
        return track('outbound-link', {host: url.hostname, label: label(el), from});
      }
      if (url.pathname === location.pathname && url.search === location.search) return; // in-page jump
      return track('internal-link', {to: url.pathname + url.search + url.hash, from});
    }
    track('button-click', {label: label(el), from});
  });

  // Which homepage sections actually scroll into view.
  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        seen.unobserve(entry.target);
        track('section-view', {section: entry.target.id});
      }
    }, {rootMargin: '-40% 0px -40% 0px'}); // crosses the middle of the viewport, however tall
    document.querySelectorAll('main section[id]').forEach(section => seen.observe(section));
  }

  // Engagement milestones: visible time plus at least one real interaction,
  // which also filters out link-preview bots and email security scanners.
  let interacted = false;
  for (const type of ['pointerdown', 'keydown', 'scroll', 'touchstart']) {
    addEventListener(type, () => { interacted = true; }, {passive: true, capture: true});
  }
  const milestones = [30, 120, 300];
  let visible = 0;
  const timer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    visible += 5;
    if (interacted && visible >= milestones[0]) {
      track('engaged', {seconds: milestones.shift()});
      if (!milestones.length) clearInterval(timer);
    }
  }, 5000);
})();
