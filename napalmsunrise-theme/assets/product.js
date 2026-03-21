/**
 * product.js — Variant picker, image switching, AJAX add-to-cart
 */

(function () {
  'use strict';

  const section = document.querySelector('[data-product]');
  if (!section) return;

  const productJSON = section.querySelector('[data-product-json]');
  if (!productJSON) return;

  const product = JSON.parse(productJSON.textContent);
  const form = section.querySelector('[data-product-form]');
  const variantSelect = section.querySelector('[data-variant-select]');
  const variantIdInput = section.querySelector('[data-variant-id]');
  const pills = section.querySelectorAll('.variant-picker__pill input');
  const thumbs = section.querySelectorAll('[data-thumb]');

  /* ===== Variant Selection ===== */
  function getSelectedOptions() {
    var options = [];
    var fieldsets = section.querySelectorAll('.variant-picker__option');
    fieldsets.forEach(function (fs) {
      var checked = fs.querySelector('input:checked');
      if (checked) options.push(checked.value);
    });
    return options;
  }

  function findVariant(options) {
    return product.variants.find(function (v) {
      return v.options.every(function (opt, i) {
        return opt === options[i];
      });
    });
  }

  function updateVariant(variant) {
    if (!variant) return;

    /* Update hidden select */
    if (variantSelect) variantSelect.value = variant.id;
    if (variantIdInput) variantIdInput.value = variant.id;

    /* Update price */
    var priceEl = section.querySelector('[data-product-price]');
    if (priceEl) {
      var saleClass = variant.compare_at_price && variant.compare_at_price > variant.price ? ' price--on-sale' : '';
      var priceHTML = '<div class="price' + saleClass + '">';
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        priceHTML += '<span class="price__sale">' + formatMoney(variant.price) + '</span>';
        priceHTML += '<span class="price__compare"><s>' + formatMoney(variant.compare_at_price) + '</s></span>';
      } else {
        priceHTML += '<span class="price__regular">' + formatMoney(variant.price) + '</span>';
      }
      priceHTML += '</div>';
      priceEl.innerHTML = priceHTML;
    }

    /* Update buy button */
    var buyBtn = form ? form.querySelector('[type="submit"]') : null;
    if (buyBtn) {
      buyBtn.disabled = !variant.available;
      buyBtn.textContent = variant.available ? 'Add to cart' : 'Sold out';
    }

    /* Update URL */
    var url = new URL(window.location);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url);

    /* Update pill selection state */
    pills.forEach(function (input) {
      var pill = input.closest('.variant-picker__pill');
      pill.classList.toggle('is-selected', input.checked);
    });

    /* Update selected value display */
    variant.options.forEach(function (opt, i) {
      var display = section.querySelector('[data-option-selected="' + (i + 1) + '"]');
      if (display) display.textContent = opt;
    });
  }

  pills.forEach(function (input) {
    input.addEventListener('change', function () {
      var options = getSelectedOptions();
      var variant = findVariant(options);
      updateVariant(variant);
    });
  });

  /* ===== Image Thumbnails ===== */
  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      var url = this.dataset.imageUrl;
      var mainImg = section.querySelector('.product-page__img');
      if (mainImg && url) mainImg.src = url;

      thumbs.forEach(function (t) { t.classList.remove('is-active'); });
      this.classList.add('is-active');
    });
  });

  /* ===== Quantity Input ===== */
  var qtyMinus = section.querySelector('[data-qty-minus]');
  var qtyPlus = section.querySelector('[data-qty-plus]');
  var qtyInput = section.querySelector('[data-qty-input]');
  var formQty = section.querySelector('[data-form-qty]');

  if (qtyMinus && qtyPlus && qtyInput) {
    qtyMinus.addEventListener('click', function () {
      var val = parseInt(qtyInput.value, 10);
      if (val > 1) {
        qtyInput.value = val - 1;
        if (formQty) formQty.value = val - 1;
      }
    });

    qtyPlus.addEventListener('click', function () {
      var val = parseInt(qtyInput.value, 10);
      qtyInput.value = val + 1;
      if (formQty) formQty.value = val + 1;
    });

    qtyInput.addEventListener('change', function () {
      var val = parseInt(this.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      this.value = val;
      if (formQty) formQty.value = val;
    });
  }

  /* ===== AJAX Add to Cart ===== */
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var formData = new FormData(form);
      var btn = form.querySelector('[type="submit"]');
      var originalText = btn.textContent;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';

      window.NapalmSunrise.addToCart(formData)
        .then(function () {
          btn.textContent = originalText;
          btn.disabled = false;
        })
        .catch(function () {
          btn.textContent = originalText;
          btn.disabled = false;
        });
    });
  }

  /* ===== Money Formatter ===== */
  function formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }
})();
