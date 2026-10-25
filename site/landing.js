const root = document.documentElement;
const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');
const dropdowns = [...navigation.querySelectorAll('.nav-group')];
const navCategories = [...navigation.querySelectorAll('.nav-category')];
const work = document.querySelector('#work');
root.classList.add('enhanced');
// Local visual comparison: show exact source-sheet artwork without repainting it.
// No query parameter keeps Ben's final 01 selection from the static HTML/CSS.
const logoStudies = {
  '01': { name: 'Soft upright', x: 55, y: 302, width: 375, height: 314 },
  '02': { name: 'Rounded compact', x: 499, y: 325, width: 347, height: 291 },
  '03': { name: 'Open seal', x: 903, y: 257, width: 393, height: 393 },
  '04': { name: 'Solid seal', x: 1344, y: 262, width: 385, height: 384 },
};
const previewLogo = new URLSearchParams(location.search).get('logo');
const logoStudy = Object.hasOwn(logoStudies, previewLogo) ? logoStudies[previewLogo] : null;
if (logoStudy) {
  const brand = document.querySelector('.brand');
  const crop = document.createElement('span');
  crop.className = 'logo-study-crop';
  crop.setAttribute('aria-hidden', 'true');
  for (const [property, value] of Object.entries({
    '--logo-ratio': logoStudy.width / logoStudy.height,
    '--logo-sheet-width': 1759 / logoStudy.height,
    '--logo-sheet-height': 894 / logoStudy.height,
    '--logo-source-x': logoStudy.x / logoStudy.height,
    '--logo-source-y': logoStudy.y / logoStudy.height,
  })) crop.style.setProperty(property, String(value));
  brand.dataset.previewLogo = previewLogo;
  brand.replaceChildren(crop);
}

toggle.hidden = false;

function closeCategories(parent = navigation) {
  parent.querySelectorAll('.nav-category').forEach(category => { category.open = false; });
}

function closeDropdowns(except) {
  dropdowns.forEach(dropdown => {
    if (dropdown !== except) {
      dropdown.open = false;
      closeCategories(dropdown);
    }
  });
}

function closeMenu(restoreFocus = false) {
  closeDropdowns();
  navigation.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  if (restoreFocus) toggle.focus();
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  if (!open) closeDropdowns();
  toggle.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const openCategory = navCategories.find(category => category.open && category.contains(document.activeElement)) || navCategories.find(category => category.open);
  if (openCategory) {
    openCategory.open = false;
    openCategory.querySelector('summary').focus();
    event.preventDefault();
    return;
  }
  const openDropdown = dropdowns.find(dropdown => dropdown.open);
  if (openDropdown) {
    openDropdown.open = false;
    closeCategories(openDropdown);
    openDropdown.querySelector('summary').focus();
    event.preventDefault();
  } else if (toggle.getAttribute('aria-expanded') === 'true') {
    closeMenu(true);
    event.preventDefault();
  }
});

dropdowns.forEach(dropdown => {
  dropdown.querySelector('summary').addEventListener('click', () => {
    if (!dropdown.open) closeDropdowns(dropdown);
    else closeCategories(dropdown);
  });
  dropdown.addEventListener('toggle', () => {
    if (dropdown.open) closeDropdowns(dropdown);
    else closeCategories(dropdown);
  });
  dropdown.querySelector('summary').addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    closeDropdowns(dropdown);
    dropdown.open = true;
    const controls = [...dropdown.querySelectorAll('a[href], .nav-category > summary')].filter(control => control.getClientRects().length);
    (event.key === 'ArrowDown' ? controls[0] : controls[controls.length - 1])?.focus();
  });
});

navCategories.forEach(category => {
  const summary = category.querySelector('summary');
  summary.addEventListener('click', () => {
    if (!category.open) navCategories.forEach(other => { if (other !== category) other.open = false; });
  });
  category.addEventListener('toggle', () => {
    if (category.open) navCategories.forEach(other => { if (other !== category) other.open = false; });
  });
  summary.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') { category.open = false; return; }
    navCategories.forEach(other => { if (other !== category) other.open = false; });
    category.open = true;
    const links = category.querySelectorAll('a[href]');
    (event.key === 'ArrowUp' ? links[links.length - 1] : links[0])?.focus();
  });
});

navigation.addEventListener('keydown', event => {
  if (!event.target.matches('a[href], summary')) return;
  const category = event.target.closest('.nav-category');
  if (event.key === 'ArrowLeft' && category?.open) {
    event.preventDefault();
    category.open = false;
    category.querySelector('summary').focus();
    return;
  }
  if (event.defaultPrevented || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const submenu = event.target.closest('.nav-submenu');
  if (!submenu) return;
  const controls = [...submenu.querySelectorAll('a[href], summary')].filter(control => control.getClientRects().length);
  const current = controls.indexOf(event.target);
  if (current < 0) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length;
  controls[next].focus();
});

navigation.addEventListener('click', event => {
  if (event.target.closest('a[href]') && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) closeMenu();
});
document.addEventListener('click', event => {
  if (!event.target.closest('.header-inner')) closeMenu();
});
document.addEventListener('focusin', event => {
  // Keep nested mobile items in place during pointer focus. Switching groups
  // closes the previous one after activation, not before the click completes.
  if (!event.target.closest('.header-inner')) closeMenu();
});
document.querySelectorAll('[data-work-link]').forEach(link => link.addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  // Work directory links use ordinary navigation; legacy #work links still reveal the section.
  if (!work || new URL(link.href).pathname !== location.pathname || new URL(link.href).hash !== '#work') return;
  work.classList.add('is-revealed');
  closeMenu();
  requestAnimationFrame(() => { work.scrollIntoView({ block: 'start' }); work.focus({ preventScroll: true }); });
}));
function syncWorkVisibility() {
  if (!work) return;
  const revealed = location.hash === '#work';
  work.classList.toggle('is-revealed', revealed);
  if (!revealed && work.contains(document.activeElement) && matchMedia('(max-width: 1000px)').matches) {
    document.querySelector('.hero [data-work-link]').focus({ preventScroll: true });
  }
}
window.addEventListener('hashchange', syncWorkVisibility);
syncWorkVisibility();
matchMedia('(max-width: 1000px)').addEventListener('change', event => {
  // Preserve an active submenu and keyboard focus when the header changes layout.
  const keepOpen = event.matches && (dropdowns.some(dropdown => dropdown.open) || navigation.contains(document.activeElement));
  navigation.classList.toggle('is-open', keepOpen);
  toggle.setAttribute('aria-expanded', String(keepOpen));
  if (!event.matches && document.activeElement === toggle) navigation.querySelector('summary, a')?.focus();
});
