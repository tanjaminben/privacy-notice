// Static, decorative icons for the two reading editions and coupon treatments.
export function editionIcon(kind) {
  return `<svg class="pe-edition-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${kind==='newspaper'
    ? '<path d="M4 4h16v16H4a2 2 0 0 1-2-2V8h2zM4 8v12M7 7h5v5H7zM15 7h2M15 11h2M7 15h10M7 18h10"/>'
    : '<path d="M4 2h11l5 5v15H4zM15 2v5h5M7 10h3v3H7zM14 10h3v3h-3zM7 16h3v3H7zM14 16h3v3h-3z"/>'}</svg>`;
}
export const couponBarcode='<span class="pe-coupon-barcode" aria-hidden="true"></span>';
