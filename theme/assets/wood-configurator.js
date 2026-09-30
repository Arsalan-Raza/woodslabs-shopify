/* wood-configurator.js — WoodSlabs order form logic */
(function () {
  'use strict';

  const MATERIAL = 'material type 10';
  const FINISH   = 'unfinished';

  // Depth range boundaries (inclusive, whole inches after rounding)
  const DEPTH_RANGES = [
    { label: '3\u2013 6"',      value: '3-6',     min: 3,  max: 6  },
    { label: '6.1\u201312"',   value: '6.1-12',  min: 7,  max: 12 },
    { label: '12.1\u201316"',  value: '12.1-16', min: 13, max: 16 },
    { label: '16.1\u201320"',  value: '16.1-20', min: 17, max: 20 },
    { label: '20.1\u201324"',  value: '20.1-24', min: 21, max: 24 },
    { label: '24.1\u201328"',  value: '24.1-28', min: 25, max: 28 },
  ];

  // Ranges where shelf-with-hardware is available
  const HARDWARE_RANGES = new Set(['3-6', '6.1-12', '12.1-16']);

  // Fraction display labels (index = numerator/16; 0 = no fraction)
  const FRAC_LABELS = [
    '', '1/16', '1/8', '3/16', '1/4', '5/16', '3/8', '7/16',
    '1/2', '9/16', '5/8', '11/16', '3/4', '13/16', '7/8', '15/16',
  ];

  // ── State ──────────────────────────────────────────────────────────────────
  let state = {
    productType: 'slab',
    thickness: '1.75"',
    thicknessRangeWhole: null,
    thicknessRangeFrac: 0,
    widthWhole: 9,
    widthFrac: 0,
    depthRange: '3-6',
    depthWhole: 3,
    depthFrac: 0,
    price: null,
    signature: null,
  };

  // ── DOM refs ───────────────────────────────────────────────────────────────
  let form, productTypeInputs, thicknessInputs,
      thicknessSub, thicknessSubWhole, thicknessSubFrac,
      widthWholeEl, widthFracEl,
      depthRangeEl, depthWholeEl, depthFracEl,
      priceValue, priceNote, atcBtn, msgEl,
      variantIdEl;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function roundUp(whole, frac) {
    return frac > 0 ? whole + 1 : whole;
  }

  function depthPricingRange(whole, frac) {
    const w = roundUp(whole, frac);
    for (const r of DEPTH_RANGES) {
      if (w >= r.min && w <= r.max) return r.value;
    }
    return '24.1-28'; // fallback
  }

  function buildFracOptions(selectEl, disabledAt) {
    // disabledAt = the whole-inch value at which fraction must be disabled
    selectEl.innerHTML = '';
    for (let i = 0; i <= 15; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i === 0 ? 'No fraction' : FRAC_LABELS[i];
      selectEl.appendChild(opt);
    }
  }

  function buildWholeOptions(selectEl, min, max) {
    selectEl.innerHTML = '';
    for (let i = min; i <= max; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i + '"';
      selectEl.appendChild(opt);
    }
  }

  // Disable fraction when at ceiling (96", 28", 4", 6")
  function enforceCeilingFrac(wholeVal, fracEl, ceilingWhole) {
    if (parseInt(wholeVal) >= ceilingWhole) {
      fracEl.value = 0;
      fracEl.disabled = true;
    } else {
      fracEl.disabled = false;
    }
  }

  // ── Price fetch ────────────────────────────────────────────────────────────
  let priceDebounce = null;

  function fetchPrice() {
    clearTimeout(priceDebounce);
    priceDebounce = setTimeout(async () => {
      const pricingWidth = roundUp(state.widthWhole, state.widthFrac);
      const pricingDepth = depthPricingRange(state.depthWhole, state.depthFrac);
      const hardware = (state.productType === 'shelf') ? 'yes' : 'no';

      priceValue.textContent = '—';
      priceNote.textContent  = 'Looking up price…';
      atcBtn.disabled = true;

      try {
        const params = new URLSearchParams({
          material:      MATERIAL,
          finish:        FINISH,
          product_type:  state.productType === 'shelf' ? 'shelf' : 'slab',
          hardware:      hardware,
          thickness:     state.thickness,
          depth:         pricingDepth,
          width_inches:  pricingWidth,
        });

        const res  = await fetch('/apps/woodslabs/price?' + params);
        const data = await res.json();

        if (data.error) {
          priceValue.textContent = '—';
          priceNote.textContent  = 'No price available for this combination.';
          state.price     = null;
          state.signature = null;
          return;
        }

        state.price     = data.price;
        state.signature = data.signature;

        priceValue.textContent = '$' + data.price.toFixed(2);
        priceNote.textContent  = '';
        atcBtn.disabled = false;

      } catch (err) {
        priceValue.textContent = '—';
        priceNote.textContent  = 'Could not load price. Please try again.';
        state.price     = null;
        state.signature = null;
      }
    }, 250);
  }

  // ── Availability rules ─────────────────────────────────────────────────────
  function applyAvailabilityRules() {
    const hardwareOk = HARDWARE_RANGES.has(state.depthRange);
    const hwOption = form.querySelector('.wood-type-option--hardware');

    if (!hardwareOk) {
      // Force back to slab if hardware was selected
      if (state.productType === 'shelf') {
        state.productType = 'slab';
        form.querySelector('input[name="wood-product-type"][value="slab"]').checked = true;
      }
      if (hwOption) hwOption.classList.add('wood-type-option--disabled');
    } else {
      if (hwOption) hwOption.classList.remove('wood-type-option--disabled');
    }
  }

  // ── Depth whole options ────────────────────────────────────────────────────
  function updateDepthWholeOptions() {
    const range = DEPTH_RANGES.find(r => r.value === state.depthRange);
    if (!range) return;
    buildWholeOptions(depthWholeEl, range.min, range.max);
    state.depthWhole = range.min;
    depthWholeEl.value = range.min;
    enforceCeilingFrac(range.min, depthFracEl, 28);
  }

  // ── Thickness sub-input ────────────────────────────────────────────────────
  function updateThicknessSub() {
    const isRange = state.thickness === '2.1-4"' || state.thickness === '4.1-6"';
    thicknessSub.classList.toggle('is-visible', isRange);

    if (!isRange) {
      state.thicknessRangeWhole = null;
      state.thicknessRangeFrac  = 0;
      return;
    }

    const min     = state.thickness === '2.1-4"' ? 2 : 4;
    const max     = state.thickness === '2.1-4"' ? 4 : 6;
    const ceiling = max;

    buildWholeOptions(thicknessSubWhole, min, max);
    state.thicknessRangeWhole = min;
    thicknessSubWhole.value = min;
    enforceCeilingFrac(min, thicknessSubFrac, ceiling);
  }

  // ── Event wiring ───────────────────────────────────────────────────────────
  function init() {
    form = document.getElementById('wood-configurator-form');
    if (!form) return;

    // Refs
    productTypeInputs  = form.querySelectorAll('input[name="wood-product-type"]');
    thicknessInputs    = form.querySelectorAll('input[name="wood-thickness"]');
    thicknessSub       = form.querySelector('.wood-configurator__thickness-sub');
    thicknessSubWhole  = form.querySelector('#wood-thickness-sub-whole');
    thicknessSubFrac   = form.querySelector('#wood-thickness-sub-frac');
    widthWholeEl       = form.querySelector('#wood-width-whole');
    widthFracEl        = form.querySelector('#wood-width-frac');
    depthRangeEl       = form.querySelector('#wood-depth-range');
    depthWholeEl       = form.querySelector('#wood-depth-whole');
    depthFracEl        = form.querySelector('#wood-depth-frac');
    priceValue         = document.getElementById('wood-price-value');
    priceNote          = document.getElementById('wood-price-note');
    atcBtn             = document.getElementById('wood-atc-btn');
    msgEl              = document.getElementById('wood-configurator-msg');
    variantIdEl        = form.querySelector('[data-variant-id]');

    // Build width options (9–96)
    buildWholeOptions(widthWholeEl, 9, 96);
    buildFracOptions(widthFracEl);

    // Build depth range dropdown
    depthRangeEl.innerHTML = '';
    DEPTH_RANGES.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.value;
      opt.textContent = r.label;
      depthRangeEl.appendChild(opt);
    });

    // Build depth whole options for initial range
    updateDepthWholeOptions();

    // Build fraction options for depth
    buildFracOptions(depthFracEl);

    // Build thickness sub-input fracs
    buildFracOptions(thicknessSubFrac);

    // Product type
    productTypeInputs.forEach(input => {
      input.addEventListener('change', () => {
        state.productType = input.value;
        fetchPrice();
      });
    });

    // Thickness
    thicknessInputs.forEach(input => {
      input.addEventListener('change', () => {
        state.thickness = input.value;
        updateThicknessSub();
        fetchPrice();
      });
    });

    // Thickness sub-inputs (manufacturing record only — re-fetch not needed for pricing)
    thicknessSubWhole.addEventListener('change', () => {
      state.thicknessRangeWhole = parseInt(thicknessSubWhole.value);
      const ceiling = state.thickness === '2.1-4"' ? 4 : 6;
      enforceCeilingFrac(thicknessSubWhole.value, thicknessSubFrac, ceiling);
      state.thicknessRangeFrac = 0; // ceiling resets frac
    });
    thicknessSubFrac.addEventListener('change', () => {
      state.thicknessRangeFrac = parseInt(thicknessSubFrac.value);
    });

    // Width whole
    widthWholeEl.addEventListener('change', () => {
      state.widthWhole = parseInt(widthWholeEl.value);
      enforceCeilingFrac(widthWholeEl.value, widthFracEl, 96);
      state.widthFrac = parseInt(widthFracEl.value);
      fetchPrice();
    });

    // Width fraction
    widthFracEl.addEventListener('change', () => {
      state.widthFrac = parseInt(widthFracEl.value);
      fetchPrice();
    });

    // Depth range
    depthRangeEl.addEventListener('change', () => {
      state.depthRange = depthRangeEl.value;
      updateDepthWholeOptions();
      state.depthFrac = 0;
      depthFracEl.value = 0;
      applyAvailabilityRules();
      fetchPrice();
    });

    // Depth whole
    depthWholeEl.addEventListener('change', () => {
      state.depthWhole = parseInt(depthWholeEl.value);
      enforceCeilingFrac(depthWholeEl.value, depthFracEl, 28);
      state.depthFrac = parseInt(depthFracEl.value);
      fetchPrice();
    });

    // Depth fraction
    depthFracEl.addEventListener('change', () => {
      state.depthFrac = parseInt(depthFracEl.value);
      // If rounding causes range change, update range select
      const actualRange = depthPricingRange(state.depthWhole, state.depthFrac);
      if (actualRange !== state.depthRange) {
        state.depthRange = actualRange;
        depthRangeEl.value = actualRange;
        applyAvailabilityRules();
      }
      fetchPrice();
    });

    // Add to Cart
    atcBtn.addEventListener('click', addToCart);

    // Initial price fetch
    fetchPrice();
  }

  // ── Add to cart ────────────────────────────────────────────────────────────
  async function addToCart() {
    if (!state.price || !state.signature) return;

    const variantId = variantIdEl ? variantIdEl.dataset.variantId : null;
    if (!variantId) {
      showMessage('Product not configured correctly. Missing variant.', 'error');
      return;
    }

    const pricingWidth = roundUp(state.widthWhole, state.widthFrac);
    const pricingDepth = depthPricingRange(state.depthWhole, state.depthFrac);

    // Build full order record (width/depth exact measurement for manufacturing)
    const widthFracLabel = state.widthFrac > 0 ? ' ' + FRAC_LABELS[state.widthFrac] : '';
    const depthFracLabel = state.depthFrac > 0 ? ' ' + FRAC_LABELS[state.depthFrac] : '';
    const thicknessDisplay = buildThicknessDisplay();

    const properties = {
      'Material':         'Material Type 10',
      'Finish':           'Unfinished',
      'Product Type':     state.productType === 'shelf' ? 'Shelf with Hardware' : 'Slab (No Hardware)',
      'Thickness':        thicknessDisplay,
      'Width':            state.widthWhole + widthFracLabel + '"',
      'Depth (selected)': state.depthRange + '"',
      'Depth (exact)':    state.depthWhole + depthFracLabel + '"',
      '_pricing_width':   String(pricingWidth),
      '_pricing_depth':   pricingDepth,
      '_pricing_thickness': state.thickness,
      '_price':           state.price.toFixed(2),
      '_sig':             state.signature,
    };

    atcBtn.disabled = true;
    atcBtn.textContent = 'Adding…';
    clearMessage();

    try {
      const res = await fetch('/cart/add.js', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id:         parseInt(variantId),
            quantity:   1,
            properties: properties,
          }],
        }),
      });

      const data = await res.json();

      if (data.status && data.status !== 200) {
        showMessage(data.description || 'Could not add to cart.', 'error');
      } else {
        showMessage('Added to cart!', 'success');
        // Trigger cart drawer / update
        document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
      }
    } catch (err) {
      showMessage('Error adding to cart. Please try again.', 'error');
    } finally {
      atcBtn.disabled = false;
      atcBtn.textContent = 'Add to Cart';
    }
  }

  function buildThicknessDisplay() {
    if (state.thickness === '2.1-4"' || state.thickness === '4.1-6"') {
      if (state.thicknessRangeWhole) {
        const fracPart = state.thicknessRangeFrac > 0
          ? ' ' + FRAC_LABELS[state.thicknessRangeFrac]
          : '';
        return state.thicknessRangeWhole + fracPart + '" (' + state.thickness + ' range)';
      }
    }
    return state.thickness;
  }

  function showMessage(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'wood-configurator__message wood-configurator__message--' + type;
  }

  function clearMessage() {
    if (!msgEl) return;
    msgEl.textContent = '';
    msgEl.className = 'wood-configurator__message';
  }

  // ── Boot ───────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
