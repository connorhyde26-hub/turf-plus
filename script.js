/* ── Progressive enhancement: animations only run when .visible is added by JS ── */

/* ── NAVBAR: scroll state + active link highlighting ── */
const navbar = document.getElementById('navbar');
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

function updateNav() {
  const scrolled = window.scrollY > 60;
  navbar.classList.toggle('scrolled', scrolled);

  // Highlight active nav link based on scroll position
  let current = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 120) {
      current = section.id;
    }
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

/* ── HAMBURGER MENU ── */
// Selected by class, not id — the generated HTML only ever carries
// class="hamburger" / class="mobile-menu" (per the AI prompt's markup spec),
// so using getElementById here would silently fail to find either element.
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    mobileMenu.setAttribute('aria-hidden', String(!isOpen));
  });

  // Close menu when a link is clicked
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
    });
  });
}

/* ── SMOOTH SCROLL for anchor links ── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ── SCROLL REVEAL via IntersectionObserver ── */
const revealEls = document.querySelectorAll('.reveal');
const isEmbedded =
  window.self !== window.top ||
  new URLSearchParams(window.location.search).has('embed');

const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.05,
    rootMargin: '0px 0px 0px 0px',
  }
);

function revealIfInView(el) {
  const rect = el.getBoundingClientRect();
  const inView = rect.top < window.innerHeight && rect.bottom > 0;
  if (inView) {
    el.classList.add('visible');
    revealObserver.unobserve(el);
    return true;
  }
  return false;
}

revealEls.forEach(el => {
  revealIfInView(el);
  revealObserver.observe(el);
});

function refreshReveals() {
  revealEls.forEach(el => revealIfInView(el));
}

window.addEventListener('load', refreshReveals);
requestAnimationFrame(() => requestAnimationFrame(refreshReveals));

if (isEmbedded) {
  document.querySelectorAll('#hero .reveal').forEach(el => {
    el.classList.add('visible');
    revealObserver.unobserve(el);
  });
}

/* ── ANIMATED COUNTERS ── */
const counters = document.querySelectorAll('.count');
let countersStarted = false;

function animateCounter(el) {
  // Support both explicit data-target="N" and reading the element's own text
  // (Claude-generated HTML often omits data-target, which caused parseInt(undefined) = NaN)
  const raw = (el.dataset.target ?? el.textContent).trim();
  const target = parseFloat(raw);
  if (isNaN(target) || target <= 0) return;

  // Preserve decimal places found in the source value (e.g. "4.9" → 1 decimal)
  const decimalPlaces = raw.includes('.') ? (raw.split('.')[1]?.length || 1) : 0;

  const duration = 1600;
  const step = 16;
  const increment = target / (duration / step);
  let current = 0;

  const tick = () => {
    current = Math.min(current + increment, target);
    el.textContent = decimalPlaces > 0
      ? current.toFixed(decimalPlaces)
      : Math.floor(current);
    if (current < target) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function startCounters() {
  if (countersStarted) return;
  countersStarted = true;
  counters.forEach(animateCounter);
}

const heroSection = document.getElementById('hero');
const counterObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        startCounters();
        counterObserver.disconnect();
      }
    });
  },
  { threshold: isEmbedded ? 0.1 : 0.5 }
);

if (heroSection) {
  counterObserver.observe(heroSection);
  if (isEmbedded) {
    const heroRect = heroSection.getBoundingClientRect();
    if (heroRect.top < window.innerHeight && heroRect.bottom > 0) {
      startCounters();
      counterObserver.disconnect();
    }
  }
}

/* ── GALLERY LIGHTBOX + VIEW MORE ── */
// Gallery images — read directly from the DOM. No padding/guessing: the
// lightbox should only ever navigate through photos that actually exist.
const galleryImages = Array.from(document.querySelectorAll('.gallery-item img')).map(img => ({
  src: img.src,
  alt: img.alt,
}));

const lightbox = document.getElementById('lightbox');
const lbImg    = document.getElementById('lbImg');
const lbClose  = document.getElementById('lbClose');
const lbPrev   = document.getElementById('lbPrev');
const lbNext   = document.getElementById('lbNext');
let currentIdx = 0;

function openLightbox(idx) {
  currentIdx = idx;
  showLightboxImage();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function showLightboxImage() {
  const img = galleryImages[currentIdx];
  if (!img) return;
  lbImg.src = img.src;
  lbImg.alt = img.alt;
}

function changeLightbox(dir) {
  if (!galleryImages.length) return;
  currentIdx = (currentIdx + dir + galleryImages.length) % galleryImages.length;
  showLightboxImage();
}

document.querySelectorAll('.gallery-item').forEach((item) => {
  item.addEventListener('click', () => openLightbox(Number(item.dataset.idx)));
});

// "View More Photos" expands the grid in place (reveals tiles 7+ via CSS);
// it never needs to exist if there are 6 or fewer photos total.
const galleryGrid = document.querySelector('.gallery-grid');
const galleryViewMore = document.getElementById('galleryViewMore');
if (galleryViewMore && galleryGrid) {
  if (galleryImages.length <= 6) {
    galleryViewMore.closest('.gallery-footer')?.remove();
  } else {
    galleryViewMore.addEventListener('click', () => {
      const expanded = galleryGrid.classList.toggle('expanded');
      galleryViewMore.textContent = expanded ? 'View Fewer Photos' : 'View More Photos';
      if (expanded) {
        // These tiles were display:none, so the reveal observer never had a
        // chance to fire on them — show them immediately instead of waiting
        // on a re-layout that may not trigger a new intersection callback.
        galleryGrid.querySelectorAll('.gallery-item.reveal').forEach(el => el.classList.add('visible'));
      } else {
        document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

if (lightbox && lbImg && lbClose && lbPrev && lbNext) {
  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', e => { e.stopPropagation(); changeLightbox(-1); });
  lbNext.addEventListener('click', e => { e.stopPropagation(); changeLightbox(1); });

  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') changeLightbox(-1);
    if (e.key === 'ArrowRight') changeLightbox(1);
  });
}

/* ── CONTACT FORM ── */
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

contactForm.addEventListener('submit', async e => {
  e.preventDefault();

  const btn = contactForm.querySelector('button[type="submit"]');
  const defaultLabel = btn.textContent;
  btn.textContent = 'Sending…';
  btn.disabled = true;

  try {
    const response = await fetch(contactForm.action, {
      method: 'POST',
      body: new FormData(contactForm),
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      contactForm.reset();
      formSuccess.classList.add('show');
      setTimeout(() => formSuccess.classList.remove('show'), 6000);
    } else {
      const data = await response.json().catch(() => ({}));
      alert(data.error || 'Something went wrong. Please try again or call us directly.');
    }
  } catch {
    alert('Could not send your message. Please try again or call us directly.');
  } finally {
    btn.textContent = defaultLabel;
    btn.disabled = false;
  }
});

/* ── REVIEW SEE MORE ── */
document.querySelectorAll('.review-body').forEach(body => {
  const text = body.querySelector('.review-text');
  const toggle = body.querySelector('.review-toggle');
  if (!text || !toggle) return;

  text.classList.add('is-clamped');

  const syncToggle = () => {
    if (!text.classList.contains('is-clamped')) {
      toggle.hidden = false;
      toggle.textContent = 'See less';
      return;
    }

    const overflowing = text.scrollHeight > text.clientHeight + 1;
    if (overflowing) {
      toggle.hidden = false;
      toggle.textContent = 'See more';
    } else {
      text.classList.remove('is-clamped');
      toggle.hidden = true;
    }
  };

  syncToggle();
  window.addEventListener('resize', syncToggle);

  toggle.addEventListener('click', () => {
    text.classList.toggle('is-clamped');
    toggle.textContent = text.classList.contains('is-clamped') ? 'See more' : 'See less';
  });
});
