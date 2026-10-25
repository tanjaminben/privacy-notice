import { annotate } from '/vendor/rough-notation/rough-notation.esm.js';

export const ANNOTATION_DURATION_MS = 1000;
export const ANNOTATION_COLORS = Object.freeze({
  highlight: '#F2C551', underline: '#F2C551', circle: '#C43D3D', bracket: '#2E7D74'
});

const types = new Set(['highlight', 'underline', 'circle', 'bracket']);
const bracketSides = new Set(['left', 'right', 'top', 'bottom']);

export function explanationBrackets(value) {
  const sides = typeof value === 'string' ? value.trim().split(/\s+/) : [];
  return sides.length && sides.every(side => bracketSides.has(side)) ? [...new Set(sides)] : ['left'];
}

const authored = new Map();
const sessions = new Map();
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let installed = false, started = false, nextId = 0;
const local = link => {
  const url = new URL(link.href, location.href);
  return url.origin === location.origin && url.pathname === location.pathname && url.search === location.search;
};
const seen = new Set();
const focusRepairs = new Map();
const visible = element => element.isConnected && !element.closest('[hidden]') && [...element.getClientRects()].some(r => r.width && r.height);

// One queue for the document. annotationGroup assigns every mark a delay at
// once; it cannot defer off-screen marks or cancel an individual closing layer.
export function createAnnotationSequence({ entries, eligible, draw, complete,
  hidden, reduced, frame = requestAnimationFrame, cancelFrame = cancelAnimationFrame,
  later = setTimeout, cancelLater = clearTimeout, gap = 200 }) {
  let active = null, pendingFrame = 0, pause = 0;
  function cancelActive() {
    if (!active) return;
    const previous = active; active = null; previous.job.cancel();
  }
  function run() {
    pendingFrame = 0;
    if (hidden()) return;
    if (active || pause) return;
    const waiting = entries().filter(entry => !entry.done && eligible(entry));
    if (reduced()) {
      for (const entry of waiting) { draw(entry, false); complete(entry); }
      return;
    }
    const entry = waiting[0];
    if (!entry) return;
    const current = { entry, job: draw(entry, true) }; active = current;
    current.job.finished.then(() => {
      if (active !== current) return;
      active = null;
      if (hidden() || !eligible(entry)) { current.job.cancel(); wake(); return; }
      complete(entry);
      pause = later(() => { pause = 0; wake(); }, gap);
    }, () => {
      if (active === current) { cancelActive(); wake(); }
    });
  }
  function wake() {
    if (active && (hidden() || reduced() || !eligible(active.entry))) cancelActive();
    if (hidden()) {
      cancelFrame(pendingFrame); pendingFrame = 0;
      cancelLater(pause); pause = 0;
      return;
    }
    if (!pendingFrame) pendingFrame = frame(run);
  }
  function stop() {
    cancelFrame(pendingFrame); pendingFrame = 0;
    cancelLater(pause); pause = 0; cancelActive();
  }
  return { wake, stop };
}

// Require most of the text, not a single passing pixel. Oversize block marks
// can qualify when most of the available reading window is visible.
export function meaningfulIntersection(rects, clip) {
  let area = 0, available = 0;
  for (const r of rects) {
    if (!r.width || !r.height) continue;
    area += r.width * r.height;
    available += Math.max(0, Math.min(r.right, clip.right) - Math.max(r.left, clip.left)) *
      Math.max(0, Math.min(r.bottom, clip.bottom) - Math.max(r.top, clip.top));
  }
  const windowArea = Math.max(0, clip.right - clip.left) * Math.max(0, clip.bottom - clip.top);
  return area > 0 && windowArea > 0 && available >= Math.min(area, windowArea) * .6;
}

function inReadingWindow(target) {
  if (document.hidden || !visible(target)) return false;
  const view = window.visualViewport;
  const clip = { left: (view?.offsetLeft || 0) + 8, top: (view?.offsetTop || 0) + 8,
    right: (view?.offsetLeft || 0) + (view?.width || innerWidth) - 8,
    bottom: (view?.offsetTop || 0) + (view?.height || innerHeight) - 8 };
  for (let parent = target; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (style.visibility !== 'visible' || style.display === 'none' || Number(style.opacity) === 0) return false;
    const r = parent.getBoundingClientRect();
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
      clip.left = Math.max(clip.left, r.left + parent.clientLeft);
      clip.right = Math.min(clip.right, r.left + parent.clientLeft + parent.clientWidth);
    }
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
      clip.top = Math.max(clip.top, r.top + parent.clientTop);
      clip.bottom = Math.min(clip.bottom, r.top + parent.clientTop + parent.clientHeight);
    }
  }
  return meaningfulIntersection([...target.getClientRects()], clip);
}

function geometry(record) {
  const origin = record.session.section.getBoundingClientRect();
  return [...record.target.getClientRects()].map(r =>
    [r.left - origin.left, r.top - origin.top, r.width, r.height].map(n => Math.round(n * 10)).join(',')).join(';');
}
function removeMark(record) {
  record.mark?.remove(); record.mark = null; record.svg = null;
  record.target.dataset.explanationState = record.done ? 'complete' : 'waiting';
}
function paint(record, animate) {
  const { target, type } = record;
  if (!record.mark) record.mark = annotate(target, {
    type, color: ANNOTATION_COLORS[type],
    multiline: type !== 'bracket', brackets: record.brackets || ['left'], padding: type === 'highlight' ? 0 : 3,
    strokeWidth: type === 'highlight' ? 1 : 2, iterations: record.iterations, animate, animationDuration: ANNOTATION_DURATION_MS
  });
  record.mark.animate = animate;
  record.mark.show();
  record.svg = type === 'highlight' ? target.previousElementSibling : target.nextElementSibling;
  record.svg.setAttribute('aria-hidden', 'true'); record.svg.setAttribute('focusable', 'false');
  record.svg.setAttribute('role', 'presentation'); record.svg.dataset.explanationDecoration = 'true';
  record.signature = geometry(record);
  target.dataset.explanationState = animate ? 'drawing' : 'complete';
  // Pinned 0.5.1 has no completion callback. Await its actual CSS path
  // animations, whose total duration is ANNOTATION_DURATION_MS, instead of guessing a tour delay.
  const animations = record.svg.getAnimations({ subtree: true });
  return { finished: Promise.all(animations.map(animation => animation.finished)),
    cancel: () => { animations.forEach(animation => animation.cancel()); removeMark(record); } };
}
const queue = createAnnotationSequence({
  entries: () => [...sessions.values()].flatMap(session => [...session.records.values()])
    .sort((a, b) => a.target.compareDocumentPosition(b.target) & 4 ? -1 : 1),
  eligible: record => record.session.ready && !record.session.closed &&
    authored.get(record.token)?.text === record.target.textContent && inReadingWindow(record.target),
  draw: paint,
  complete: record => {
    record.done = true; seen.add(record.token); record.mark.animate = false;
    record.target.dataset.explanationState = 'complete';
  },
  hidden: () => document.hidden, reduced: () => motion.matches
});
function refreshAll() { sessions.forEach(session => session.schedule()); }
function onVisibility() { queue.wake(); }
function onMotion() { refreshAll(); queue.wake(); }
const intersections = new IntersectionObserver(() => queue.wake(), { threshold: [0, .6, 1] });
const detachments = new MutationObserver(() => {
  for (const [container, session] of sessions) {
    if (!container.isConnected) { session.dispose(); continue; }
    for (const [target, record] of session.records) if (!target.isConnected || authored.get(record.token)?.text !== target.textContent) {
      intersections.unobserve(target); removeMark(record); session.records.delete(target);
    }
  }
  queue.wake();
});
function listen(enabled) {
  const action = enabled ? 'addEventListener' : 'removeEventListener';
  window[action]('resize', refreshAll);
  document[action]('scroll', onVisibility, true);
  document[action]('visibilitychange', onVisibility);
  motion[action]('change', onMotion);
  window.visualViewport?.[action]('resize', refreshAll);
  window.visualViewport?.[action]('scroll', onVisibility);
  document.fonts?.[action]('loadingdone', refreshAll);
  if (enabled) detachments.observe(document.body, { childList: true, subtree: true });
  else { detachments.disconnect(); queue.stop(); }
}

function revealFocusedControl(control) {
  if (document.hidden || !visible(control) || document.activeElement !== control) return;
  // Nearest scrolling also handles a clipped inner scroll container. Focus
  // visibility must settle immediately rather than animate out of reach.
  control.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  const view = window.visualViewport;
  let top = (view?.offsetTop || 0) + 8;
  const bottom = (view?.offsetTop || 0) + (view?.height || innerHeight) - 8;
  const r = control.getBoundingClientRect();
  const x = Math.max(8, Math.min(innerWidth - 8, r.left + r.width / 2));
  // Discover the actual top occluder rather than hard-coding a page's header.
  for (const hit of document.elementsFromPoint(x, top)) {
    for (let node = hit; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node), box = node.getBoundingClientRect();
      if (['fixed', 'sticky'].includes(style.position) && box.top <= top && box.bottom > top) top = Math.max(top, box.bottom + 8);
    }
  }
  const delta = r.top < top ? r.top - top : r.bottom > bottom ? r.bottom - bottom : 0;
  if (delta) window.scrollBy({ top: delta, behavior: 'instant' });
}

function restoreExplanationFocus(link, bubble) {
  focusRepairs.get(link)?.();
  link.focus({ preventScroll: true });
  const overflow = [...bubble.children].find(node => node.classList.contains('nutshell-bubble-overflow'));
  let timer;
  function cleanup() {
    clearTimeout(timer); overflow?.removeEventListener('transitionend', settled);
    if (focusRepairs.get(link) === cleanup) focusRepairs.delete(link);
  }
  function reveal() {
    revealFocusedControl(link);
  }
  function settled(event) {
    if (event && (event.target !== overflow || event.propertyName !== 'height')) return;
    reveal(); cleanup();
  }
  reveal();
  overflow?.addEventListener('transitionend', settled);
  // Reduced motion may have no transition event; detach/replacement can also
  // interrupt it. One bounded fallback rechecks only while focus is still here.
  timer = setTimeout(settled, motion.matches ? 0 : 360);
  focusRepairs.set(link, cleanup);
}

function watchAnnotations(bubble, link, rootTargets) {
  const section = rootTargets ? bubble : bubble.querySelector('.nutshell-bubble-overflow-section');
  const overflow = section.parentElement;
  const arrow = bubble.querySelector('.nutshell-bubble-arrow');
  if (!rootTargets) arrow.style.setProperty('--explanation-arrow-x', arrow.style.left || '33px');
  const records = new Map();
  let timer, frame, revision = 0;
  let cancelKeyboardCheck = () => {};
  const session = { records, section, ready: false, closed: false, schedule, dispose };
  function keyboardFocus(event) {
    const control = event.target;
    if (control.closest('.nutshell-bubble') !== bubble || !control.matches(':focus-visible')) return;
    cancelKeyboardCheck();
    let focusFrame, focusTimer;
    const keep = () => {
      if (!session.closed && document.activeElement === control && control.matches(':focus-visible')) revealFocusedControl(control);
    };
    const cancel = () => {
      cancelAnimationFrame(focusFrame); clearTimeout(focusTimer);
      overflow.removeEventListener('transitionend', settled);
      document.removeEventListener('wheel', cancel, true);
      document.removeEventListener('pointerdown', cancel, true);
      document.removeEventListener('keydown', cancel, true);
      if (cancelKeyboardCheck === cancel) cancelKeyboardCheck = () => {};
    };
    function settled(event) {
      if (event && (event.target !== overflow || event.propertyName !== 'height')) return;
      keep(); cancel();
    }
    cancelKeyboardCheck = cancel;
    // Keyboard visibility cannot wait for the annotation font/resize debounce.
    // Correct the browser's initial focus scroll on the next frame, then once
    // after expansion. Manual pointer/scroll/key activity cancels the recheck.
    focusFrame = requestAnimationFrame(() => { keep(); if (motion.matches) cancel(); });
    if (!motion.matches) {
      overflow.addEventListener('transitionend', settled);
      focusTimer = setTimeout(settled, 360);
    }
    document.addEventListener('wheel', cancel, { capture: true, passive: true });
    document.addEventListener('pointerdown', cancel, true);
    document.addEventListener('keydown', cancel, true);
  }
  if (!rootTargets) bubble.addEventListener('focusin', keyboardFocus);
  function draw() {
    if (session.closed || !bubble.isConnected) return;
    session.ready = true;
    const targets = [...section.querySelectorAll('[data-explanation-token]')].filter(target => {
      const source = authored.get(target.dataset.explanationToken);
      const owner = target.closest('.nutshell-bubble');
      return (rootTargets ? rootTargets.has(target) && !owner : owner === bubble) && source && source.text === target.textContent;
    });
    for (const [target, record] of records) if (!targets.includes(target)) {
      intersections.unobserve(target); removeMark(record); records.delete(target);
    }
    for (const target of targets) {
      let record = records.get(target);
      if (!record) {
        const token = target.dataset.explanationToken;
        const source = authored.get(token);
        record = { target, token, type: source.type, brackets: source.brackets, iterations: source.iterations, session, done: seen.has(token) };
        records.set(target, record); intersections.observe(target);
        target.dataset.explanationState = record.done ? 'complete' : 'waiting';
      }
      // Completed content stays marked on reflow/reopen; its animation is never
      // replayed. Unseen content is left for the shared visibility queue.
      if (record.done && visible(target) && (!record.mark || record.signature !== geometry(record))) paint(record, false);
    }
    queue.wake();
  }
  function schedule() {
    if (session.closed) return;
    session.ready = false; queue.wake();
    clearTimeout(timer); cancelAnimationFrame(frame);
    const current = ++revision;
    // Nutshell animates height for 300ms; root content has no expansion delay.
    // Both use this same font/layout readiness gate and the document queue.
    timer = setTimeout(() => {
      document.fonts.ready.then(() => {
        if (session.closed || current !== revision) return;
        frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
          if (!session.closed && current === revision) draw();
        }); });
      });
    }, rootTargets || motion.matches ? 0 : 340);
  }
  const resize = new ResizeObserver(schedule);
  resize.observe(bubble);
  // Direct content replacement is observed; decoration insertion/removal is not
  // new authored content (root marks may be direct children of this section).
  const content = new MutationObserver(changes => {
    if (changes.every(change => [...change.addedNodes, ...change.removedNodes]
      .every(node => node.nodeType === 1 && node.matches('svg.rough-annotation')))) return;
    schedule(); refreshAll();
  });
  content.observe(section, { childList: true });
  const close = bubble.close;
  if (!rootTargets) bubble.close = () => {
    if (session.closed) return;
    bubble.dataset.explanationClosing = 'true';
    for (const [child, session] of sessions) if (bubble.contains(child)) session.dispose();
    dispose();
    close(); refreshAll();
  };
  function dispose() {
    if (session.closed) return;
    session.closed = true; session.ready = false; ++revision;
    cancelKeyboardCheck(); bubble.removeEventListener('focusin', keyboardFocus);
    clearTimeout(timer); cancelAnimationFrame(frame);
    content.disconnect(); resize.disconnect(); sessions.delete(bubble); queue.wake();
    records.forEach(record => { intersections.unobserve(record.target); removeMark(record); }); records.clear();
    if (!sessions.size) listen(false);
  }
  if (!sessions.size) listen(true);
  sessions.set(bubble, session);
  if (!rootTargets) {
    bubble.explanationTrigger = link;
    bubble.id = `explanation-${++nextId}`;
    const button = bubble.querySelector('.nutshell-bubble-overflow-close');
    button.type = 'button'; button.textContent = '×';
    button.setAttribute('aria-label', `Close explanation: ${link.textContent}`);
  }
  schedule(); refreshAll();
}

function install() {
  if (installed || !window.Nutshell) return;
  installed = true;
  const purified = Nutshell.promisePurifiedHTMLFromURL;
  // Nutshell includes the fragment in its lookup key. Reuse the registered local
  // snapshot instead of fetching an unregistered copy of this same page.
  Nutshell.promisePurifiedHTMLFromURL = url => purified(local({ href: url }) ? Nutshell.thisPageURL : url);
  const create = Nutshell.createBubble;
  Nutshell.createBubble = (link, ...args) => {
    const bubble = create(link, ...args);
    if (local(link)) watchAnnotations(bubble, link);
    return bubble;
  };
  const convert = Nutshell.convertLinksToExpandables;
  Nutshell.convertLinksToExpandables = (root, ...args) => {
    convert(root, ...args);
    root.querySelectorAll('.nutshell-expandable').forEach(link => {
      if (link.dataset.explanationControl) return;
      link.dataset.explanationControl = 'true';
      link.setAttribute('role', 'button'); link.setAttribute('aria-expanded', 'false');
      link.querySelectorAll('.nutshell-ball-up, .nutshell-ball-down').forEach(dot => dot.setAttribute('aria-hidden', 'true'));
      const open = link.open, close = link.close;
      let bubble;
      link.open = event => {
        if (link.isOpen) return;
        focusRepairs.get(link)?.();
        open(event || { clientX: link.getBoundingClientRect().left });
        bubble = [...link.parentElement.children].find(node => node.explanationTrigger === link && !node.dataset.explanationClosing);
        if (bubble) link.setAttribute('aria-controls', bubble.id);
        link.setAttribute('aria-expanded', 'true');
      };
      link.close = () => {
        if (!link.isOpen) return;
        const restoreFocus = bubble?.contains(document.activeElement);
        close();
        bubble?.querySelectorAll('.nutshell-expandable').forEach(child => {
          child.isOpen = false; child.setAttribute('aria-expanded', 'false'); child.removeAttribute('aria-controls');
        });
        link.setAttribute('aria-expanded', 'false'); link.removeAttribute('aria-controls');
        if (restoreFocus) restoreExplanationFocus(link, bubble);
      };
      link.addEventListener('keydown', event => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); link.click(); }
      });
    });
  };
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !(event.target instanceof Element)) return;
    const trigger = event.target.closest('.nutshell-expandable');
    const owner = trigger?.isOpen ? trigger : event.target.closest('.nutshell-bubble')?.explanationTrigger;
    if (owner?.isOpen) { event.preventDefault(); event.stopPropagation(); owner.close(); }
  }, true);
}

export const explanations = {
  start(root) {
    if (started || !window.Nutshell) return;
    started = true; install();
    // Register authored source before Nutshell sanitizes/clones it. No live records are scanned later.
    root.querySelectorAll('[data-explanation-mark]').forEach(target => {
      const type = target.dataset.explanationMark;
      if (!types.has(type)) return;
      // A margin bracket groups a block passage; it is never inline punctuation.
      if (type === 'bracket' && !target.matches('p, aside, blockquote, div, li')) return;
      const token = `authored-${++nextId}`;
      target.dataset.explanationToken = token;
      const iterations = type === 'underline' && /^[1-3]$/.test(target.dataset.explanationIterations || '')
        ? Number(target.dataset.explanationIterations) : 1;
      authored.set(token, { type, text: target.textContent, iterations,
        brackets: type === 'bracket' ? explanationBrackets(target.dataset.explanationBrackets) : undefined });
    });
    Nutshell.start(root);
    // Root marks are explicit, authored element identities. Hidden excerpt banks
    // and their later bubble clones belong only to the bubble session.
    const rootTargets = new Set([...root.querySelectorAll('[data-explanation-root-mark][data-explanation-token]')]
      .filter(target => !target.closest('.nutshell-bubble, template') && visible(target)));
    if (rootTargets.size) watchAnnotations(root, null, rootTargets);
    const closeAll = Nutshell.closeAllButton;
    // Keep the vendor's counter node for its bookkeeping, without a redundant
    // floating control. Each open layer has its contextual × and Escape route.
    closeAll.hidden = true; closeAll.setAttribute('aria-hidden', 'true'); closeAll.tabIndex = -1;
    window.addEventListener('pagehide', () => {
      explanations.closeWithin(document);
      sessions.forEach(session => session.dispose());
      focusRepairs.forEach(cancel => cancel());
    });
  },
  enhance(root) { install(); window.Nutshell?.convertLinksToExpandables(root); },
  closeWithin(root) {
    root.querySelectorAll('.nutshell-expandable').forEach(link => {
      if (link.isOpen && !link.closest('.nutshell-bubble')) link.close();
    });
  }
};
