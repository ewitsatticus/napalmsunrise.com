/**
 * Napalm Sunrise — Theme JS
 */

(function () {
  'use strict';

  /* ===== Filter Tags ===== */
  document.querySelectorAll('.tag-row').forEach(function (row) {
    row.querySelectorAll('.filter-tag').forEach(function (tag) {
      tag.addEventListener('click', function () {
        // Only handle non-link filter tags (JS-only filtering)
        if (tag.tagName === 'A') return;
        row.querySelectorAll('.filter-tag').forEach(function (t) { t.classList.remove('on'); });
        tag.classList.add('on');
      });
    });
  });

  /* ===== AJAX Cart ===== */
  window.NapalmSunrise = window.NapalmSunrise || {};

  window.NapalmSunrise.addToCart = function (formData) {
    return fetch('/cart/add.js', {
      method: 'POST',
      body: formData,
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        updateCartCount();
        return data;
      });
  };

  function updateCartCount() {
    fetch('/cart.js')
      .then(function (res) { return res.json(); })
      .then(function (cart) {
        document.querySelectorAll('[data-cart-count]').forEach(function (el) {
          el.textContent = cart.item_count;
        });
      });
  }

  /* ===== Product Form AJAX ===== */
  document.querySelectorAll('form[action="/cart/add"]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var formData = new FormData(form);
      window.NapalmSunrise.addToCart(formData);
    });
  });
})();
