/**
 * Napalm Sunrise — Theme JS
 * Mobile menu, cart drawer, scroll animations
 */

(function () {
  'use strict';

  /* ===== Mobile Menu ===== */
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', isOpen);
    });
  }

  /* ===== Cart Drawer ===== */
  const cartDrawer = document.querySelector('[data-cart-drawer]');
  const cartToggle = document.querySelector('[data-cart-toggle]');
  const cartCloseButtons = document.querySelectorAll('[data-cart-drawer-close]');

  function openCartDrawer(e) {
    if (!cartDrawer) return;
    if (e) e.preventDefault();
    cartDrawer.classList.add('is-open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('is-open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (cartToggle) {
    cartToggle.addEventListener('click', openCartDrawer);
  }

  cartCloseButtons.forEach(function (btn) {
    btn.addEventListener('click', closeCartDrawer);
  });

  /* Close on Escape */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeCartDrawer();
      if (nav) {
        nav.classList.remove('is-open');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
      }
    }
  });

  /* ===== Scroll Fade-In ===== */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reducedMotion) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.fade-target').forEach(function (el) {
      el.style.opacity = '0';
      observer.observe(el);
    });
  }

  /* ===== AJAX Cart Helpers ===== */
  window.NapalmSunrise = window.NapalmSunrise || {};

  window.NapalmSunrise.addToCart = function (formData) {
    return fetch('/cart/add.js', {
      method: 'POST',
      body: formData,
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        updateCartCount();
        refreshCartDrawer();
        openCartDrawer();
        return data;
      });
  };

  window.NapalmSunrise.changeCart = function (key, quantity) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        updateCartCount();
        refreshCartDrawer();
        return data;
      });
  };

  function updateCartCount() {
    fetch('/cart.js')
      .then(function (res) { return res.json(); })
      .then(function (cart) {
        var counts = document.querySelectorAll('[data-cart-count]');
        counts.forEach(function (el) {
          el.textContent = cart.item_count;
          el.dataset.count = cart.item_count;
        });
      });
  }

  function refreshCartDrawer() {
    var body = document.querySelector('[data-cart-drawer-body]');
    if (!body) return;

    fetch('/?sections=header')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var temp = document.createElement('div');
        temp.innerHTML = data.header;
        var newBody = temp.querySelector('[data-cart-drawer-body]');
        var newFooter = temp.querySelector('.cart-drawer__footer');
        if (newBody) body.innerHTML = newBody.innerHTML;

        var footer = document.querySelector('.cart-drawer__footer');
        var footerParent = footer ? footer.parentElement : body.parentElement;
        if (footer) footer.remove();
        if (newFooter) footerParent.appendChild(newFooter);
      });
  }
})();
