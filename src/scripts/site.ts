// Client behaviour. Replaces the old jQuery/Foundation/RoyalSlider/wiselinks stack.
// Runs once; per-page setup re-runs on every Astro page swap (astro:page-load).

const html = document.documentElement;

// The logo pulses while a page loads, and stops when the page has finished loading. That is all:
//  - first / direct visit: stop on the browser's own `load` event (or immediately if it already fired)
//  - clicking through to another page: stop as soon as the new page is swapped in (astro:after-swap)
// A failsafe timer means a stalled request can never leave it pulsing forever.
let loadingFailsafe: number | undefined;
function startLoading(maxMs: number) {
  html.dataset.loading = '';
  clearTimeout(loadingFailsafe);
  loadingFailsafe = window.setTimeout(stopLoading, maxMs);
}
function stopLoading() {
  clearTimeout(loadingFailsafe);
  delete html.dataset.loading;
}
startLoading(5000);
if (document.readyState === 'complete') stopLoading();
else window.addEventListener('load', stopLoading, { once: true });
// a page restored from the browser's back/forward cache comes back mid-pulse, with no new load event
window.addEventListener('pageshow', (e) => e.persisted && stopLoading());

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Resolves when the image has loaded (or failed, or `ms` has passed). */
function imageReady(img: HTMLImageElement, ms = 6000) {
  return new Promise<void>((resolve) => {
    if (img.complete && img.naturalWidth) return resolve();
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
    setTimeout(resolve, ms);
  });
}

let teardown: Array<() => void> = [];
const onCleanup = (fn: () => void) => teardown.push(fn);

/* ---------- Nav: solid bar once past [data-startchange] ---------- */

function initNavState() {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const target = document.querySelector<HTMLElement>('[data-startchange]');
  if (!nav) return;
  const isHome = document.body.dataset.page === 'home';
  const DEAD_ZONE = 24; // px of scroll between "turn on" and "turn off", so it can't chatter at the edge
  let threshold = 0;
  let active = false;
  let scrolled = false;

  // Layout is measured only when the page changes size, never while scrolling.
  const measure = () => {
    const top = target ? target.getBoundingClientRect().top + window.scrollY : 0;
    threshold = isHome ? top - 400 : top;
  };
  // Cheap enough (two comparisons) to run on every scroll event, so no frame-throttling needed.
  const update = () => {
    const y = window.scrollY;
    const nextActive = active ? y > threshold - DEAD_ZONE : y > threshold;
    if (nextActive !== active) {
      active = nextActive;
      nav.toggleAttribute('data-active', active);
    }
    // the scroll cue fades as soon as the visitor starts scrolling
    const nextScrolled = scrolled ? y > 20 : y > 40;
    if (nextScrolled !== scrolled) {
      scrolled = nextScrolled;
      html.toggleAttribute('data-scrolled', scrolled);
    }
  };
  const onResize = () => {
    measure();
    update();
  };
  // images loading change the page height, which moves the trigger point
  const observer = new ResizeObserver(onResize);
  observer.observe(document.body);

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  measure();
  update();
  onCleanup(() => {
    observer.disconnect();
    window.removeEventListener('scroll', update);
    window.removeEventListener('resize', onResize);
  });
}

/* ---------- Contact panel (header persists across pages, so bind once) ---------- */

/* ---------- Phone menu (hamburger) ---------- */

function setMenu(open: boolean) {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const btn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  if (!nav || !btn) return;
  nav.toggleAttribute('data-menu-open', open);
  btn.setAttribute('aria-expanded', String(open));
}

let contactCloseTimer: number | undefined;

function setContact(open: boolean) {
  clearTimeout(contactCloseTimer); // a manual open/close cancels any pending auto-close
  if (open) setMenu(false);
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const btn = document.querySelector<HTMLButtonElement>('[data-contact-toggle]');
  if (!nav || !btn) return;
  nav.toggleAttribute('data-contact-open', open);
  btn.setAttribute('aria-expanded', String(open));
  btn.querySelector<HTMLElement>('[data-label-closed]')!.hidden = open;
  btn.querySelector<HTMLElement>('[data-label-open]')!.hidden = !open;
  if (open) nav.querySelector<HTMLInputElement>('#name')?.focus({ preventScroll: true });
}
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('[data-menu-toggle]')) {
    const open = !document.querySelector('[data-nav]')!.hasAttribute('data-menu-open');
    if (open) setContact(false);
    setMenu(open);
  } else if (t.closest('[data-nav-link]')) {
    setMenu(false);
  }
  if (t.closest('[data-contact-toggle]')) {
    const open = !document.querySelector('[data-nav]')!.hasAttribute('data-contact-open');
    setContact(open);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.querySelector('[data-nav][data-contact-open]')) setContact(false);
});

/* ---------- Contact form: submit in place, no redirect ---------- */

document.addEventListener('submit', async (e) => {
  const form = (e.target as HTMLElement).closest<HTMLFormElement>('[data-contact-form]');
  if (!form) return;
  e.preventDefault();
  const button = form.querySelector<HTMLButtonElement>('[data-contact-submit]')!;
  const status = form.querySelector<HTMLElement>('[data-contact-status]')!;
  button.disabled = true;
  status.textContent = 'Sending…';
  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(String(res.status));
    form.reset();
    status.textContent = 'Thanks! I’ll be in touch soon.';
    // let the confirmation be read, then slide the panel shut and clear the message
    contactCloseTimer = window.setTimeout(() => {
      setContact(false);
      setTimeout(() => (status.textContent = ''), 600);
    }, 3000);
  } catch {
    status.textContent = 'Sorry, that didn’t send. Please email me directly instead.';
  } finally {
    button.disabled = false;
  }
});

/* ---------- Page-load indicator: logo pulses while navigating ---------- */

document.addEventListener('astro:before-preparation', () => {
  startLoading(10000);
  setContact(false);
  setMenu(false);
});
// the new page is on screen: the navigation is done, stop pulsing right away
document.addEventListener('astro:after-swap', stopLoading);
document.addEventListener('astro:before-swap', () => {
  teardown.forEach((fn) => fn());
  teardown = [];
  document.body.removeAttribute('data-movie');
});

/* ---------- Home hero: orange intro = preloader, then slideshow ---------- */

let introSeen = false;

async function initHero() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const slides = [...hero.querySelectorAll<HTMLElement>('[data-slide]')];
  let current = 0;
  let timer: number | undefined;
  let cancelled = false;
  onCleanup(() => {
    cancelled = true;
    clearTimeout(timer);
    html.removeAttribute('data-preloading'); // never leave the page locked behind us
  });

  // Scrolling stays locked until the slideshow starts (see "data-preloading" in global.css).
  // The intro always starts from the top, so a reload can't leave the visitor scrolled past it.
  html.setAttribute('data-preloading', '');
  window.scrollTo(0, 0);

  const reduce = reduceMotion.matches;
  setTimeout(() => !cancelled && hero.setAttribute('data-intro', ''), reduce ? 0 : 400);

  // Wait for the first slide and the first thumbnails, so the grid is ready when the intro lifts.
  const firstSlide = slides[0]?.querySelector('img');
  const thumbs = [...document.querySelectorAll<HTMLImageElement>('[data-card-img][loading="eager"]')];
  const assets = Promise.all([firstSlide, ...thumbs].filter(Boolean).map((i) => imageReady(i!)));
  const minShown = sleep(reduce ? 0 : introSeen ? 600 : 2500);
  await Promise.race([Promise.all([assets, minShown]), sleep(8000)]);
  if (cancelled) return;
  introSeen = true;

  hero.removeAttribute('data-intro');
  hero.setAttribute('data-running', '');
  html.removeAttribute('data-preloading'); // intro is done: unlock scrolling
  if (reduce || slides.length < 2) return;

  const go = async (next: number) => {
    const cur = slides[current];
    const nxt = slides[next];
    const img = nxt.querySelector('img')!;
    img.loading = 'eager';
    await imageReady(img, 1500);
    if (cancelled) return;
    nxt.style.transition = 'none';
    nxt.style.transform = 'translateX(100%)';
    nxt.setAttribute('data-current', '');
    void nxt.offsetWidth; // commit the start position before animating
    cur.style.transition = nxt.style.transition = 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)';
    cur.style.transform = 'translateX(-100%)';
    nxt.style.transform = 'translateX(0)';
    current = next;
    setTimeout(() => {
      cur.removeAttribute('data-current');
      cur.style.transform = cur.style.transition = '';
    }, 950);
  };
  const tick = async () => {
    if (!document.hidden) await go((current + 1) % slides.length);
    if (!cancelled) timer = window.setTimeout(tick, 3000);
  };
  timer = window.setTimeout(tick, 3000);
}

/* ---------- Case study: fullscreen image viewer ---------- */

function initLightbox() {
  const box = document.querySelector<HTMLElement>('[data-lightbox]');
  if (!box) return;
  const track = box.querySelector<HTMLElement>('[data-lb-track]')!;
  const slides = [...box.querySelectorAll<HTMLElement>('[data-lb-slide]')];
  let index = 0;

  const load = (i: number) => {
    const img = slides[i]?.querySelector<HTMLImageElement>('img[data-src]');
    if (img) {
      img.src = img.dataset.src!;
      img.removeAttribute('data-src');
    }
  };
  const show = (i: number, smooth = false) => {
    index = Math.max(0, Math.min(slides.length - 1, i));
    [index - 1, index, index + 1, index + 2].forEach(load);
    track.scrollTo({ left: index * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };
  const open = (i: number) => {
    box.setAttribute('data-open', '');
    html.style.overflow = 'hidden';
    show(i);
    track.focus({ preventScroll: true });
  };
  const close = () => {
    box.removeAttribute('data-open');
    html.style.overflow = '';
  };
  const isOpen = () => box.hasAttribute('data-open');

  const onThumb = (e: Event) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-thumb]');
    if (t) open(Number(t.dataset.thumb));
  };
  document.querySelector('[data-project]')?.addEventListener('click', onThumb);
  box.querySelector('[data-lb-close]')!.addEventListener('click', close);
  box.querySelector('[data-lb-prev]')!.addEventListener('click', () => show(index - 1, true));
  box.querySelector('[data-lb-next]')!.addEventListener('click', () => show(index + 1, true));
  track.addEventListener('scroll', () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== index) {
      index = i;
      [i - 1, i, i + 1, i + 2].forEach(load);
    }
  });
  const onKey = (e: KeyboardEvent) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(index + 1, true);
    else if (e.key === 'ArrowLeft') show(index - 1, true);
  };
  document.addEventListener('keydown', onKey);
  onCleanup(() => {
    document.removeEventListener('keydown', onKey);
    html.style.overflow = '';
  });
}

/* ---------- Related projects: a fresh random pick on every visit ---------- */

function initRelated() {
  const list = document.querySelector<HTMLElement>('[data-related]');
  if (!list) return;
  const count = Number(list.dataset.relatedCount) || 3;
  const items = [...list.children] as HTMLElement[];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  items.forEach((li, i) => {
    li.hidden = i >= count;
    list.appendChild(li);
  });
}

/* ---------- Vimeo: dim the page and hide the nav while a video plays ---------- */

async function initVimeo() {
  const iframe = document.querySelector<HTMLIFrameElement>('.embed-container iframe');
  if (!iframe) return;
  const { default: Player } = await import('@vimeo/player');
  const player = new Player(iframe);
  const set = (on: boolean) => document.body.toggleAttribute('data-movie', on);
  player.on('play', () => set(true));
  player.on('pause', () => set(false));
  player.on('ended', () => set(false));
  onCleanup(() => player.destroy().catch(() => {}));
}

/* ---------- Boot ---------- */

document.addEventListener('astro:page-load', () => {
  // footer year: the build supplies one, this keeps it current without a redeploy
  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));
  initNavState();
  initHero();
  initLightbox();
  initRelated();
  initVimeo();
});
