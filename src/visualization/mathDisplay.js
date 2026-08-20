// ═══════════════════════════════════════════════════
// KaTeX Math Display
// ═══════════════════════════════════════════════════

import katex from 'katex';

export function renderFormula(container, latex) {
  if (!latex) {
    container.innerHTML = '';
    return;
  }
  try {
    katex.render(latex, container, {
      displayMode: true,
      throwOnError: false,
      trust: true,
      macros: {
        '\\bmod': '\\;\\text{mod}\\;',
      }
    });
  } catch (e) {
    container.textContent = latex;
  }
}

export function renderInlineFormula(latex) {
  try {
    return katex.renderToString(latex, {
      displayMode: false,
      throwOnError: false,
    });
  } catch (e) {
    return latex;
  }
}
