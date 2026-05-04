/* MathLedX — Shared JS */

(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const nav = document.querySelector('.nav');

  function trackEvent(eventName, payload) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...payload,
      ts: Date.now(),
    });
  }

  function setMenuState(isOpen) {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.classList.toggle('open', isOpen);
    mobileMenu.classList.toggle('open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    body.classList.toggle('menu-open', isOpen);

    if (isOpen) {
      trackEvent('menu_opened', { location: window.location.pathname });
      const firstLink = mobileMenu.querySelector('a, button');
      if (firstLink) firstLink.focus();
    } else {
      menuToggle.focus();
    }
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = !menuToggle.classList.contains('open');
      setMenuState(isOpen);
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuState(false));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.classList.contains('open')) {
        setMenuState(false);
      }
    });
  }

  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const fadeEls = document.querySelectorAll('.fade-up');
  if (fadeEls.length) {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      fadeEls.forEach((el) => el.classList.add('visible'));
    } else {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px 120px 0px' });

      fadeEls.forEach((el) => obs.observe(el));
      setTimeout(() => fadeEls.forEach((el) => el.classList.add('visible')), 250);
    }
  }

  document.querySelectorAll('[data-track]').forEach((el) => {
    el.addEventListener('click', () => {
      trackEvent('cta_click', {
        id: el.getAttribute('data-track'),
        label: el.textContent.trim().slice(0, 80),
        location: window.location.pathname,
      });
    });
  });

  const trackedForms = document.querySelectorAll('form[data-track-form]');
  trackedForms.forEach((form) => {
    form.addEventListener('submit', () => {
      trackEvent('form_submit', {
        id: form.getAttribute('data-track-form'),
        location: window.location.pathname,
      });
    });
  });
})();
