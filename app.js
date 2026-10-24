const catalogue = globalThis.NAVI_CATALOGUE;
const categorySettings = {
  wallet: { label: 'wallet style', grid: '#walletGrid', cardClass: 'wallet-card' },
  belt: { label: 'belt style', grid: '#beltGrid', cardClass: 'belt-product-card' },
  watchbox: { label: 'watch box', grid: '#watchboxGrid', cardClass: 'watchbox-product-card' }
};
const productStates = new WeakMap();
const walletCards = new Map();
let currentType = 'plain';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className, label) {
  const node = element('button', className);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  return node;
}

function enquiryLink(product, variant) {
  const details = [['Colour', variant.colour], ['Hardware', variant.hardware], ['Finish', variant.finish]]
    .filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
  if (!details.length) details.push(`Variant: ${variant.label}`);
  const body = [
    'Hello Navi Leatherix team,', '',
    `I would like more information about this ${categorySettings[product.category].label}:`,
    `Style: ${product.code}`, ...details, '',
    'Business name:', 'Approximate quantity:', 'Destination:', '', 'Thank you.'
  ].join('\n');
  return `mailto:navitrading.sales@gmail.com?subject=${encodeURIComponent(`Wholesale enquiry — ${product.code}`)}&body=${encodeURIComponent(body)}`;
}

function createVariantButton(product, variant) {
  const className = product.category === 'wallet' ? 'color-choice'
    : product.category === 'belt' ? 'belt-option' : 'watchbox-color-button';
  const control = button(className, variant.label);
  control.dataset.variant = variant.id;
  // Retain existing category hooks; IDs no longer determine colour or image filenames.
  if (product.category !== 'belt') control.dataset.color = variant.id;
  if (variant.swatchColours?.length) {
    control.classList.add('variant-swatch');
    const swatch = element('i');
    swatch.className = 'swatch-disc';
    swatch.setAttribute('aria-hidden', 'true');
    const colours = variant.swatchColours;
    swatch.style.background = colours.length === 1 ? colours[0]
      : `linear-gradient(135deg, ${colours[0]} 0 50%, ${colours[1]} 50%)`;
    swatch.append(element('span', 'swatch-check', '✓'));
    control.append(swatch);
    if (product.category === 'belt' && variant.hardware) {
      control.append(element('span', 'variant-hardware', variant.hardware));
    }
    const tooltip = element('span', 'variant-tooltip', variant.label);
    tooltip.setAttribute('aria-hidden', 'true');
    control.append(tooltip);
    control.addEventListener('keydown', event => {
      if (event.key === 'Escape') control.dataset.dismissed = 'true';
    });
    control.addEventListener('pointerleave', () => delete control.dataset.dismissed);
    control.addEventListener('focusout', () => delete control.dataset.dismissed);
  } else {
    control.append(element('span', '', variant.label));
  }
  return control;
}

function createProductCard(product) {
  const kind = product.category;
  const wallet = kind === 'wallet';
  const card = element('article', categorySettings[kind].cardClass);
  card.dataset.productCode = product.code;
  if (wallet) card.dataset.id = product.code;
  else card.dataset[kind] = product.code;
  const imageArea = element('div', wallet ? 'wallet-image' : `${kind}-gallery-main`);
  const enlarge = button('image-zoom-trigger', `Enlarge ${product.name} image`);
  enlarge.setAttribute('aria-haspopup', 'dialog');
  const photo = element('img', wallet ? 'wallet-photo' : `${kind}-main-photo`);
  photo.loading = 'lazy';
  photo.decoding = 'async';
  enlarge.append(photo, element('span', 'view-larger-cue', 'View larger ↗'));
  imageArea.append(enlarge);

  const gallery = element('div', `purse-thumbnails ${kind}-thumbnails`);
  gallery.setAttribute('role', 'group');
  gallery.setAttribute('aria-label', `${product.name} photo angles`);
  const variants = element('div', wallet ? 'swatches' : kind === 'belt' ? 'belt-options' : 'purse-color-options');
  variants.setAttribute('role', 'group');
  variants.setAttribute('aria-label', `${product.code} variants`);
  variants.hidden = product.variants.length < 2;
  const variantButtons = product.variants.map(variant => createVariantButton(product, variant));
  variants.append(...variantButtons);

  const enquiry = element('a', wallet ? 'wallet-enquire' : `purse-enquiry-link ${kind}-enquiry-link`);
  enquiry.setAttribute('aria-label', `Enquire by email about ${product.name}, ${product.code}`);
  enquiry.classList.add('product-enquiry');
  const enquiryArrow = element('span', '', '↗');
  enquiryArrow.setAttribute('aria-hidden', 'true');
  enquiry.append(document.createTextNode('Enquire about this style '), enquiryArrow);
  const description = element('p', wallet ? 'product-description wallet-description' : 'product-description', product.description);
  const selectedLabel = element('p', 'selected-label');
  const info = element('div', wallet ? 'product-info wallet-meta' : 'product-info purse-product-info');
  info.append(element('p', 'product-code', product.code),
    element('h4', wallet ? 'product-name wallet-name' : 'product-name', product.name),
    description, variants, selectedLabel, enquiry);
  card.append(imageArea, gallery, info);

  const state = { product, variantIndex: 0, imageIndex: 0 };
  productStates.set(card, state);
  function update() {
    const variant = product.variants[state.variantIndex];
    const images = variant.images;
    const image = images[state.imageIndex];
    photo.src = image.src;
    photo.alt = image.alt;
    enquiry.href = enquiryLink(product, variant);
    enquiry.setAttribute('aria-label', `Enquire about ${product.name} in ${variant.label}, ${product.code}`);
    selectedLabel.textContent = `Selected: ${variant.label}`;
    variantButtons.forEach((control, index) => {
      control.classList.toggle('active', index === state.variantIndex);
      control.setAttribute('aria-pressed', String(index === state.variantIndex));
    });
    gallery.hidden = images.length < 2;
    // Reuse buttons for ordinary image/variant changes to retain keyboard focus.
    while (gallery.children.length > images.length) gallery.lastElementChild.remove();
    while (gallery.children.length < images.length) {
      const index = gallery.children.length;
      const control = button(`purse-thumb ${kind}-thumb`, '');
      control.dataset.angle = String(index);
      const thumbnail = element('img');
      thumbnail.alt = '';
      thumbnail.loading = 'lazy';
      thumbnail.decoding = 'async';
      control.append(thumbnail);
      control.append(element('span', 'gallery-caption'));
      control.addEventListener('click', () => { state.imageIndex = index; update(); });
      gallery.append(control);
    }
    [...gallery.children].forEach((control, index) => {
      const shot = images[index];
      control.classList.toggle('active', index === state.imageIndex);
      control.setAttribute('aria-pressed', String(index === state.imageIndex));
      control.setAttribute('aria-label', `View ${shot.label.toLowerCase()}`);
      control.title = shot.label;
      control.querySelector('img').src = shot.src;
      const caption = control.querySelector('span');
      if (caption) caption.textContent = shot.label;
    });
  }
  variantButtons.forEach((control, index) => control.addEventListener('click', () => {
    if (state.variantIndex === index) return;
    state.variantIndex = index;
    state.imageIndex = 0;
    update();
  }));
  update();
  selectedLabel.setAttribute('aria-live', 'polite');
  selectedLabel.setAttribute('aria-atomic', 'true');
  return card;
}

function renderWallets() {
  const products = catalogue.filter(product => product.category === 'wallet' && product.filter === currentType);
  document.querySelector('#walletGrid').replaceChildren(...products.map(product => {
    if (!walletCards.has(product.code)) walletCards.set(product.code, createProductCard(product));
    return walletCards.get(product.code);
  }));
}

document.querySelectorAll('.wallet-tab').forEach(tab => {
  tab.querySelector('span').textContent = catalogue.filter(product => product.category === 'wallet' && product.filter === tab.dataset.wallet).length;
  tab.addEventListener('click', () => {
    if (currentType === tab.dataset.wallet) return;
    currentType = tab.dataset.wallet;
    document.querySelectorAll('.wallet-tab').forEach(control => {
      control.classList.toggle('active', control === tab);
      control.setAttribute('aria-pressed', String(control === tab));
    });
    renderWallets();
  });
});
if (document.querySelector('#walletGrid')) renderWallets();
for (const kind of ['belt', 'watchbox']) {
  const grid = document.querySelector(categorySettings[kind].grid);
  if (grid) grid.replaceChildren(...catalogue.filter(product => product.category === kind).map(createProductCard));
}


const menuToggle = document.querySelector('#menuToggle');
const navigation = document.querySelector('#nav');
const compactNavigation = window.matchMedia('(max-width: 1000px)');
// Keep section anchors and the open menu clear of a header that can grow with text zoom.
const header = document.querySelector('.header');
const updateHeaderOffset = () => {
  const bounds = header.getBoundingClientRect();
  document.documentElement.style.setProperty('--header-offset', `${Math.ceil(bounds.height) + 16}px`);
  document.documentElement.style.setProperty('--navigation-height', `${Math.max(0, window.innerHeight - Math.ceil(bounds.bottom) - 16)}px`);
};
new ResizeObserver(updateHeaderOffset).observe(header);
new ResizeObserver(updateHeaderOffset).observe(document.querySelector('.topline'));
window.addEventListener('resize', updateHeaderOffset);
window.addEventListener('scroll', updateHeaderOffset, { passive: true });
updateHeaderOffset();
function setMenuOpen(open) {
  navigation.classList.toggle('open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
}
menuToggle.addEventListener('click', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  setMenuOpen(false);
  const destination = new URL(link.href, window.location.href);
  if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.hash) {
    document.getElementById(decodeURIComponent(destination.hash.slice(1)))?.focus({ preventScroll: true });
  }
}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenuOpen(false);
    menuToggle.focus();
  }
});
// Browsers can blur a control hidden by the new breakpoint before firing change.
let lastFocusTarget = document.activeElement;
document.addEventListener('focusin', event => { lastFocusTarget = event.target; });
document.addEventListener('pointerdown', event => { lastFocusTarget = event.target; });
compactNavigation.addEventListener('change', () => {
  const focusTarget = document.activeElement === document.body ? lastFocusTarget : document.activeElement;
  const focusWasInNavigation = navigation.contains(focusTarget);
  const focusWasOnToggle = focusTarget === menuToggle;
  setMenuOpen(false);
  if (compactNavigation.matches && focusWasInNavigation) menuToggle.focus();
  if (!compactNavigation.matches && focusWasOnToggle) navigation.querySelector('a').focus();
});

// Viewer state is independent of the card's selected photograph and enquiry.
function initialiseImageViewer(imageViewer) {
  const viewerPhoto = imageViewer.querySelector('.image-viewer-photo');
  const viewerStage = imageViewer.querySelector('.image-viewer-stage');
  const viewerCaption = imageViewer.querySelector('.image-viewer-caption');
  const viewerPrevious = imageViewer.querySelector('.image-viewer-prev');
  const viewerNext = imageViewer.querySelector('.image-viewer-next');
  const viewerDetail = imageViewer.querySelector('.image-viewer-detail');
  const viewerError = imageViewer.querySelector('.image-viewer-error');
  const viewerToolbar = imageViewer.querySelector('.image-viewer-toolbar');
  const viewerHelp = imageViewer.querySelector('.image-viewer-help');
  const viewerFooter = imageViewer.querySelector('.image-viewer-footer');
  let viewerImages = [];
  let viewerIndex = 0;
  let viewerOpener = null;
  let viewerLoadId = 0;
  let viewerReady = false;
  let viewerActualSize = false;
  let viewerLayoutFrame = 0;
  
  function updateViewerLayout() {
    if (!imageViewer.open) return;
    const viewportHeight = Math.min(window.innerHeight, window.visualViewport?.height || window.innerHeight);
    const reserved = 26 + 24 + 36 + viewerToolbar.offsetHeight + viewerHelp.offsetHeight + viewerFooter.offsetHeight;
    const availableHeight = Math.max(48, viewportHeight - reserved);
    if (!viewerReady) {
      viewerStage.style.setProperty('--viewer-fit-height', '64px');
      return;
    }
    const scale = Math.min(1, viewerStage.clientWidth / viewerPhoto.naturalWidth, availableHeight / viewerPhoto.naturalHeight);
    const fitWidth = Math.max(1, Math.floor(viewerPhoto.naturalWidth * scale));
    const fitHeight = Math.max(1, Math.floor(viewerPhoto.naturalHeight * scale));
    const canInspect = viewerPhoto.naturalWidth > fitWidth + 1 || viewerPhoto.naturalHeight > fitHeight + 1;
    if (!canInspect) viewerActualSize = false;
    // A resizing viewport must not leave keyboard focus on a newly hidden button.
    if (!canInspect && document.activeElement === viewerDetail) viewerStage.focus({ preventScroll: true });
    viewerDetail.hidden = !canInspect;
    viewerDetail.disabled = !canInspect;
    viewerDetail.textContent = viewerActualSize ? 'Fit image' : 'View actual size';
    viewerDetail.setAttribute('aria-pressed', String(viewerActualSize));
    viewerStage.classList.toggle('actual-size', viewerActualSize);
    viewerStage.style.setProperty('--viewer-fit-height', fitHeight + 'px');
    viewerPhoto.style.setProperty('--viewer-photo-width', (viewerActualSize ? viewerPhoto.naturalWidth : fitWidth) + 'px');
    viewerPhoto.style.setProperty('--viewer-photo-height', (viewerActualSize ? viewerPhoto.naturalHeight : fitHeight) + 'px');
    if (!viewerActualSize) viewerStage.scrollTo(0, 0);
  }
  
  function queueViewerLayout() {
    cancelAnimationFrame(viewerLayoutFrame);
    viewerLayoutFrame = requestAnimationFrame(updateViewerLayout);
  }
  const viewerResizeObserver = new ResizeObserver(queueViewerLayout);
  for (const node of [imageViewer, viewerToolbar, viewerHelp, viewerFooter]) viewerResizeObserver.observe(node);
  window.addEventListener('resize', queueViewerLayout);
  window.visualViewport?.addEventListener('resize', queueViewerLayout);
  
  async function showViewerImage(index) {
    const loadId = ++viewerLoadId;
    viewerIndex = (index + viewerImages.length) % viewerImages.length;
    const image = viewerImages[viewerIndex];
    viewerReady = false;
    viewerActualSize = false;
    viewerStage.scrollTo(0, 0);
    viewerStage.classList.remove('actual-size');
    viewerStage.setAttribute('aria-busy', 'true');
    if (document.activeElement === viewerDetail) viewerStage.focus({ preventScroll: true });
    viewerDetail.hidden = true;
    viewerDetail.disabled = true;
    viewerDetail.setAttribute('aria-pressed', 'false');
    viewerDetail.textContent = 'View actual size';
    viewerError.hidden = true;
    viewerPhoto.hidden = true;
    viewerPhoto.src = image.src;
    viewerPhoto.alt = image.alt;
    viewerCaption.textContent = `${image.alt} · ${viewerIndex + 1} / ${viewerImages.length}`;
    viewerPrevious.hidden = viewerNext.hidden = viewerImages.length < 2;
    updateViewerLayout();
    try {
      await viewerPhoto.decode();
      if (loadId !== viewerLoadId || !imageViewer.open) return;
      viewerReady = true;
      viewerPhoto.hidden = false;
    } catch {
      if (loadId !== viewerLoadId || !imageViewer.open) return;
      viewerError.hidden = false;
      viewerCaption.textContent += ' · Image unavailable';
    }
    viewerStage.setAttribute('aria-busy', 'false');
    updateViewerLayout();
  }
  
  document.addEventListener('click', event => {
    const opener = event.target.closest('.image-zoom-trigger');
    if (!opener) return;
    const state = productStates.get(opener.closest('article'));
    if (!state) return;
    viewerImages = state.product.variants[state.variantIndex].images;
    viewerOpener = opener;
    if (!imageViewer.open) imageViewer.showModal();
    document.documentElement.classList.add('image-viewer-open');
    showViewerImage(state.imageIndex);
  });
  
  viewerDetail.addEventListener('click', () => {
    if (!viewerReady || viewerDetail.disabled) return;
    viewerActualSize = !viewerActualSize;
    viewerStage.scrollTo(0, 0);
    updateViewerLayout();
    if (viewerActualSize) {
      viewerStage.scrollTo((viewerStage.scrollWidth - viewerStage.clientWidth) / 2,
        (viewerStage.scrollHeight - viewerStage.clientHeight) / 2);
    }
  });
  viewerPrevious.addEventListener('click', () => showViewerImage(viewerIndex - 1));
  viewerNext.addEventListener('click', () => showViewerImage(viewerIndex + 1));
  imageViewer.querySelector('.image-viewer-close').addEventListener('click', () => imageViewer.close());
  imageViewer.addEventListener('click', event => {
    if (event.target !== imageViewer) return;
    const bounds = imageViewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) imageViewer.close();
  });
  imageViewer.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const controls = [...imageViewer.querySelectorAll('button:not([disabled]), [tabindex="0"]')]
        .filter(control => control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    // The focused stage owns arrow-key panning only in actual-size mode.
    if (viewerActualSize && event.target === viewerStage) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showViewerImage(viewerIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  imageViewer.addEventListener('close', () => {
    // A queued close event from a previous opening must not clear a new image.
    if (imageViewer.open) return;
    ++viewerLoadId;
    viewerReady = false;
    viewerActualSize = false;
    document.documentElement.classList.remove('image-viewer-open');
    viewerPhoto.removeAttribute('src');
    viewerStage.scrollTo(0, 0);
    if (viewerOpener?.isConnected) viewerOpener.focus({ preventScroll: true });
  });
}

const imageViewer = document.querySelector('#imageViewer');
if (imageViewer) initialiseImageViewer(imageViewer);

// Preview counts come from the same records as the dedicated catalogues.
document.querySelectorAll('[data-category-count]').forEach(label => {
  const count = catalogue.filter(product => product.category === label.dataset.categoryCount).length;
  label.textContent = `${count} ${count === 1 ? 'style' : 'styles'}`;
});

// Preserve links previously shared from the single-page catalogue.
if (document.body.dataset.page === 'home') {
  const legacyCategories = {
    '#wallet-catalogue': 'wallets.html',
    '#belt-catalogue': 'belts.html',
    '#watchbox-catalogue': 'watch-boxes.html'
  };
  const redirectLegacyCategory = () => {
    const page = legacyCategories[window.location.hash];
    if (page) window.location.replace(new URL(page, window.location.href).href);
  };
  window.addEventListener('hashchange', redirectLegacyCategory);
  redirectLegacyCategory();
}
