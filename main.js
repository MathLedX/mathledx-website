/* MathLedX — Shared JS */

/* ── Mobile menu ── */
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.classList.toggle('open');
    mobileMenu.classList.toggle('open', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen);
  });
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menuToggle.classList.remove('open');
      mobileMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ── Nav scroll shadow ── */
const nav = document.querySelector('.nav');
if (nav) {
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── Fade-up on scroll ── */
const fadeEls = document.querySelectorAll('.fade-up');
if (fadeEls.length) {
  // Large rootMargin ensures elements trigger as soon as they exist in the
  // extended virtual viewport — works correctly for both scrolling and
  // full-page screenshot captures.
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px 200px 0px' });
  fadeEls.forEach(el => obs.observe(el));

  // Ensure all elements become visible (fallback for full-page captures)
  setTimeout(() => {
    fadeEls.forEach(el => el.classList.add('visible'));
  }, 100);
}
