/* =========================================================
   MILK ROAD — script.js
   Interatividade completa · Acessível · Performance-first
   ========================================================= */

'use strict';

// ─── Utilitário: Executar quando DOM estiver pronto ───
function ready(fn) {
  if (document.readyState !== 'loading') { fn(); }
  else { document.addEventListener('DOMContentLoaded', fn); }
}

ready(function () {
  initNavbar();
  initMobileMenu();
  initScrollAnimations();
  initCounters();
  initSearchFilters();
  initMapTooltips();
  initTestimonialsSlider();
  initNewsletterForm();
  initSmoothScroll();
  initActiveNavLinks();
});


/* ═══════════════════════════════════════════════════════
   1. NAVBAR — scroll behavior
   ═══════════════════════════════════════════════════════ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  let lastScroll = 0;

  function handleScroll() {
    const currentScroll = window.scrollY;

    // Adiciona classe quando rola para baixo
    if (currentScroll > 16) {
      navbar.classList.add('is-scrolled');
    } else {
      navbar.classList.remove('is-scrolled');
    }

    lastScroll = currentScroll;
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Estado inicial
}


/* ═══════════════════════════════════════════════════════
   2. MENU MOBILE — hamburger toggle
   ═══════════════════════════════════════════════════════ */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navMenu   = document.getElementById('navMenu');
  if (!hamburger || !navMenu) return;

  function closeMenu() {
    hamburger.classList.remove('is-open');
    navMenu.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function openMenu() {
    hamburger.classList.add('is-open');
    navMenu.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  hamburger.addEventListener('click', function () {
    const isOpen = hamburger.classList.contains('is-open');
    if (isOpen) { closeMenu(); } else { openMenu(); }
  });

  // Fechar ao clicar em link do menu
  navMenu.querySelectorAll('.navbar__link').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  // Fechar ao clicar fora
  document.addEventListener('click', function (e) {
    if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
      closeMenu();
    }
  });

  // Fechar ao pressionar Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenu(); }
  });
}


/* ═══════════════════════════════════════════════════════
   3. ANIMAÇÕES DE SCROLL — IntersectionObserver
   ═══════════════════════════════════════════════════════ */
function initScrollAnimations() {
  const elements = document.querySelectorAll('[data-animate]');
  if (!elements.length) return;

  // Verifica preferência de redução de movimento
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    elements.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay || '0', 10);
        setTimeout(function () {
          entry.target.classList.add('is-visible');
        }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -60px 0px'
  });

  elements.forEach(function (el) { observer.observe(el); });
}


/* ═══════════════════════════════════════════════════════
   4. CONTADOR ANIMADO — social proof numbers
   ═══════════════════════════════════════════════════════ */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animateCounter(el, target, duration) {
    if (prefersReduced) { el.textContent = '+' + target.toLocaleString('pt-BR'); return; }

    const start = performance.now();
    const suffix = el.closest('.hero__stat') ? '+' : '';

    function update(currentTime) {
      const elapsed  = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      const value    = Math.floor(eased * target);
      el.textContent = suffix + value.toLocaleString('pt-BR');
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const el     = entry.target;
        const target = parseInt(el.dataset.count, 10);
        animateCounter(el, target, 1800);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(function (el) { observer.observe(el); });
}


/* ═══════════════════════════════════════════════════════
   5. FILTROS DE BUSCA — tags interativas
   ═══════════════════════════════════════════════════════ */
function initSearchFilters() {
  const tags   = document.querySelectorAll('.tag[data-produto]');
  const select = document.getElementById('select-produto');
  const btnBuscar = document.getElementById('btn-buscar');

  if (!tags.length) return;

  tags.forEach(function (tag) {
    tag.addEventListener('click', function () {
      // Remove ativo de todas as tags
      tags.forEach(function (t) { t.classList.remove('tag--active'); });
      // Adiciona no clicado
      tag.classList.add('tag--active');
      // Atualiza o select
      if (select) {
        const produto = tag.dataset.produto;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].value === produto) {
            select.value = produto;
            break;
          }
        }
      }
      // Feedback visual no botão
      if (btnBuscar) {
        btnBuscar.style.transform = 'scale(1.05)';
        setTimeout(function () { btnBuscar.style.transform = ''; }, 200);
      }
    });
  });

  // Botão de busca
  if (btnBuscar) {
    btnBuscar.addEventListener('click', function (e) {
      e.preventDefault();
      const estado  = document.getElementById('select-estado')  ? document.getElementById('select-estado').value  : '';
      const produto = document.getElementById('select-produto')  ? document.getElementById('select-produto').value : '';
      const porte   = document.getElementById('select-porte')   ? document.getElementById('select-porte').value   : '';

      // Feedback visual
      const originalHTML = btnBuscar.innerHTML;
      btnBuscar.innerHTML = '<i class="ph ph-spinner"></i> Buscando...';
      btnBuscar.disabled  = true;

      setTimeout(function () {
        btnBuscar.innerHTML  = originalHTML;
        btnBuscar.disabled   = false;
        // Rola para seção de produtores
        const target = document.getElementById('produtores');
        if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      }, 900);
    });
  }
}


/* ═══════════════════════════════════════════════════════
   6. TOOLTIPS DO MAPA — hover nos dots
   ═══════════════════════════════════════════════════════ */
function initMapTooltips() {
  const dots    = document.querySelectorAll('.map-dot[data-estado]');
  const tooltip = document.getElementById('mapTooltip');
  if (!dots.length || !tooltip) return;

  const tooltipBg     = tooltip.querySelector('.map-tooltip__bg');
  const tooltipEstado = tooltip.querySelector('.map-tooltip__estado');
  const tooltipCount  = tooltip.querySelector('.map-tooltip__count');

  dots.forEach(function (dot) {
    dot.addEventListener('mouseenter', function () {
      const estado = dot.dataset.estado;
      const count  = dot.dataset.count;
      const cx     = parseFloat(dot.getAttribute('cx'));
      const cy     = parseFloat(dot.getAttribute('cy'));

      tooltipEstado.textContent = estado;
      tooltipCount.textContent  = count + ' produtores';

      // Posição: alinhar acima do dot
      let tx = cx - 80;
      let ty = cy - 60;
      if (tx < 5)   { tx = 5; }
      if (ty < 5)   { ty = 5; }

      tooltip.setAttribute('transform', 'translate(' + tx + ',' + ty + ')');
      tooltip.style.display = 'block';
    });

    dot.addEventListener('mouseleave', function () {
      tooltip.style.display = 'none';
    });
  });
}


/* ═══════════════════════════════════════════════════════
   7. SLIDER DE DEPOIMENTOS (mobile)
   ═══════════════════════════════════════════════════════ */
function initTestimonialsSlider() {
  const cards  = document.querySelectorAll('.testimonial-card');
  const dots   = document.querySelectorAll('.testimonials-dot');
  const track  = document.getElementById('testimonialsTrack');
  if (!cards.length || !dots.length || !track) return;

  let current     = 0;
  let autoplayTimer;

  function isMobile() {
    return window.innerWidth < 768;
  }

  function showCard(index) {
    if (!isMobile()) return;

    current = (index + cards.length) % cards.length;

    cards.forEach(function (card, i) {
      card.style.display = (i === current) ? 'block' : 'none';
    });

    dots.forEach(function (dot, i) {
      dot.classList.toggle('testimonials-dot--active', i === current);
      dot.setAttribute('aria-selected', String(i === current));
    });
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(function () {
      showCard(current + 1);
    }, 4000);
  }

  function stopAutoplay() {
    if (autoplayTimer) { clearInterval(autoplayTimer); }
  }

  // Dots click
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      const index = parseInt(dot.dataset.index, 10);
      showCard(index);
      stopAutoplay();
      startAutoplay();
    });
  });

  // Touch/swipe
  let touchStartX = 0;
  track.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
    stopAutoplay();
  }, { passive: true });

  track.addEventListener('touchend', function (e) {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      showCard(current + (diff > 0 ? 1 : -1));
    }
    startAutoplay();
  }, { passive: true });

  // Pausar no hover
  track.addEventListener('mouseenter', stopAutoplay);
  track.addEventListener('mouseleave', startAutoplay);

  // Init
  function setupSlider() {
    if (isMobile()) {
      showCard(0);
      startAutoplay();
    } else {
      // Desktop: mostrar todos
      cards.forEach(function (card) { card.style.display = ''; });
      stopAutoplay();
    }
  }

  setupSlider();
  window.addEventListener('resize', setupSlider);
}


/* ═══════════════════════════════════════════════════════
   8. FORMULÁRIO DE NEWSLETTER
   ═══════════════════════════════════════════════════════ */
function initNewsletterForm() {
  const form    = document.getElementById('newsletterForm');
  const input   = document.getElementById('newsletter-email');
  const success = document.getElementById('newsletterSuccess');
  const btn     = document.getElementById('btn-newsletter');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = input ? input.value.trim() : '';
    if (!email || !isValidEmail(email)) {
      // Shake no input
      if (input) {
        input.style.animation = 'none';
        input.offsetHeight; // reflow
        input.style.animation = '';
        input.style.borderColor = '#e74c3c';
        input.focus();
        setTimeout(function () {
          if (input) input.style.borderColor = '';
        }, 2000);
      }
      return;
    }

    // Estado de loading
    if (btn) {
      btn.innerHTML = '<i class="ph ph-spinner"></i> Enviando...';
      btn.disabled  = true;
    }

    // Simula envio (substituir por chamada real de API)
    setTimeout(function () {
      if (input)   { input.value = ''; }
      if (btn) {
        btn.innerHTML = 'Quero receber →';
        btn.disabled  = false;
      }
      if (success) {
        success.removeAttribute('hidden');
        setTimeout(function () {
          if (success) { success.setAttribute('hidden', ''); }
        }, 6000);
      }
    }, 1200);
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


/* ═══════════════════════════════════════════════════════
   9. SMOOTH SCROLL — links âncora
   ═══════════════════════════════════════════════════════ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}


/* ═══════════════════════════════════════════════════════
   10. ACTIVE NAV LINKS — highlight via scroll spy
   ═══════════════════════════════════════════════════════ */
function initActiveNavLinks() {
  const sections = document.querySelectorAll('section[id], footer[id]');
  const links    = document.querySelectorAll('.navbar__link');
  if (!sections.length || !links.length) return;

  function updateActiveLink() {
    let currentId = '';
    const offset  = window.innerHeight * 0.35;

    sections.forEach(function (section) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= offset && rect.bottom > offset) {
        currentId = section.id;
      }
    });

    links.forEach(function (link) {
      const href = link.getAttribute('href');
      if (href === '#' + currentId) {
        link.style.color = 'var(--color-primary)';
        link.style.fontWeight = '600';
      } else {
        link.style.color = '';
        link.style.fontWeight = '';
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();
}


/* ═══════════════════════════════════════════════════════
   11. EFEITO RIPPLE nos botões
   ═══════════════════════════════════════════════════════ */
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  const rect   = btn.getBoundingClientRect();
  const x      = e.clientX - rect.left;
  const y      = e.clientY - rect.top;
  const ripple = document.createElement('span');

  ripple.style.cssText = [
    'position:absolute',
    'width:1px', 'height:1px',
    'background:rgba(255,255,255,0.4)',
    'border-radius:50%',
    'transform:scale(0)',
    'left:' + x + 'px',
    'top:' + y + 'px',
    'pointer-events:none',
    'transition:transform 0.5s ease, opacity 0.5s ease',
  ].join(';');

  // Garante posicionamento relativo no botão
  if (!btn.style.position) { btn.style.position = 'relative'; }
  btn.style.overflow = 'hidden';

  btn.appendChild(ripple);
  requestAnimationFrame(function () {
    ripple.style.transform = 'scale(200)';
    ripple.style.opacity   = '0';
  });

  setTimeout(function () { ripple.remove(); }, 600);
});
