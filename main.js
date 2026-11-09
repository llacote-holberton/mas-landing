// MAS landing page v2: navigation, one-shot figures and the lazy hero globe.
(() => {
  'use strict';

  const GLOBE_MIN_WIDTH = 1001;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function setUpMenu() {
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('site-nav');
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  }

  function setUpActiveLink() {
    const links = [...document.querySelectorAll('#site-nav a')];
    const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        links.forEach((link) => link.classList.toggle('active', link.hash === '#' + entry.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((section) => observer.observe(section));
  }

  // The ring and the bars fill once, the first time the stake section is seen.
  function setUpOneShotFigures() {
    const stake = document.getElementById('enjeu');
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        stake.classList.add('is-visible');
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(stake);
  }

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Cannot load ' + source));
      document.head.append(script);
    });
  }

  // WHY: three.js weighs ~590 kB; it must never delay the first paint, and
  // phones, reduced-motion users and data savers get the static hero only.
  function globeIsWanted() {
    const saveData = navigator.connection && navigator.connection.saveData;
    return innerWidth >= GLOBE_MIN_WIDTH && !reducedMotion.matches && !saveData;
  }

  function loadGlobeWhenIdle() {
    if (!globeIsWanted()) return;
    const start = () => loadScript('vendor/three.min.js')
      .then(() => loadScript('globe.js'))
      .catch((error) => console.warn('[MAS] globe disabled:', error.message));
    const whenIdle = window.requestIdleCallback || ((callback) => setTimeout(callback, 300));
    whenIdle(start, { timeout: 2000 });
  }

  setUpMenu();
  if ('IntersectionObserver' in window) {
    setUpActiveLink();
    setUpOneShotFigures();
  } else {
    document.getElementById('enjeu').classList.add('is-visible');
  }
  if (document.readyState === 'complete') loadGlobeWhenIdle();
  else addEventListener('load', loadGlobeWhenIdle, { once: true });
})();
