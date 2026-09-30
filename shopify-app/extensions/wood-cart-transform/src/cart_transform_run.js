// @ts-check

/**
 * @typedef {import("../generated/api").CartTransformRunInput} CartTransformRunInput
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 */

// A valid HMAC-SHA256 signature is exactly 64 hex chars
const SIG_RE = /^[0-9a-f]{64}$/;

const NO_CHANGES = { operations: [] };

/**
 * WoodSlabs Cart Transform — applies server-signed custom price.
 *
 * For each cart line that carries `_price` + `_sig` properties
 * (set by wood-configurator.js after a successful /price lookup),
 * we expand the line into itself with the verified configured price.
 * This replaces the Shopify base-product price in the cart and checkout.
 *
 * @param {CartTransformRunInput} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  const operations = [];

  for (const line of input.cart.lines) {
    const priceVal = line.priceProp?.value;
    const sigVal   = line.sigProp?.value;

    // Only act on lines that have our custom-price attributes
    if (!priceVal || !sigVal) continue;

    const price = parseFloat(priceVal);

    // Basic sanity checks — must be a positive number and sig must be hex-64
    if (!isFinite(price) || price <= 0) continue;
    if (!SIG_RE.test(sigVal))           continue;

    // Merchandise must be a ProductVariant (guard against blanket types)
    if (!line.merchandise?.id) continue;

    operations.push({
      expand: {
        cartLineId: line.id,
        expandedCartItems: [
          {
            merchandiseId: line.merchandise.id,
            quantity: line.quantity,
            // Override the Shopify variant price with the server-signed amount
            price: {
              adjustment: {
                fixedPricePerUnit: {
                  amount: price.toFixed(2),
                },
              },
            },
          },
        ],
      },
    });
  }

  return { operations };
}
