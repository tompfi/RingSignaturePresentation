// ═══════════════════════════════════════════════════
// Animations helper
// ═══════════════════════════════════════════════════

export function animateIn(element, delay = 0) {
  element.style.opacity = '0';
  element.style.transform = 'translateY(12px)';
  setTimeout(() => {
    element.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }, delay);
}

export function animateChildren(parent, selector = '.animate-child', stagger = 60) {
  const children = parent.querySelectorAll(selector);
  children.forEach((child, i) => {
    animateIn(child, i * stagger);
  });
}
