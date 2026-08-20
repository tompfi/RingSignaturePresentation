// ═══════════════════════════════════════════════════
// Main Application Entry Point
// ═══════════════════════════════════════════════════

import './style.css';
import {
  getState, subscribe, initialize,
  setMessage, setRingSize, setSignerIndex,
  nextStep, prevStep, setStep, toggleAutoPlay,
  MEMBER_NAMES
} from './state/store.js';
import { getSteps } from './steps/stepDefinitions.js';
import { createRingDiagram, updateRingDiagram } from './visualization/ringDiagram.js';
import { renderFormula } from './visualization/mathDisplay.js';
import { animateIn } from './visualization/animations.js';

let ringDiagramSvg = null;

function buildApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- HEADER -->
    <header class="site-header" id="site-header">
      <div class="header-top">
        <h1 class="site-title">Ring Signature Algorithm <span>— Explained Visually</span></h1>
        <a href="https://github.com/tompfi" target="_blank" rel="noopener" class="github-link" id="github-link">
          <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          tompfi
        </a>
      </div>
      <div class="header-controls">
        <div class="control-group">
          <label for="message-input">Message</label>
          <input type="text" id="message-input" value="How to Leak a Secret" />
        </div>
        <div class="control-group">
          <label for="ring-size-select">Ring Size</label>
          <select id="ring-size-select">
            <option value="3">3 members</option>
            <option value="4" selected>4 members</option>
            <option value="5">5 members</option>
            <option value="6">6 members</option>
            <option value="7">7 members</option>
          </select>
        </div>
        <div class="control-group">
          <label for="signer-select">Signer</label>
          <select id="signer-select"></select>
        </div>
      </div>
    </header>

    <!-- STEP CONTROLS -->
    <nav class="step-controls" id="step-controls">
      <button class="step-btn" id="btn-first" title="First step">⏮</button>
      <button class="step-btn" id="btn-prev" title="Previous step">◀</button>
      <div class="step-info" id="step-info">
        <span id="step-counter">Step 1 / 16</span>
        <span class="phase-label" id="phase-label">Introduction</span>
      </div>
      <button class="step-btn" id="btn-next" title="Next step">▶</button>
      <button class="step-btn" id="btn-last" title="Last step">⏭</button>
      <button class="step-btn auto-play" id="btn-auto">
        <span id="auto-icon">▶</span> Auto
      </button>
    </nav>

    <!-- MAIN 3-COLUMN LAYOUT -->
    <main class="main-content" id="main-content">
      <!-- Left: Explanation -->
      <section class="panel explain-panel" id="explain-panel">
        <div class="panel-title">Explanation</div>
        <div id="explain-content"></div>
      </section>

      <!-- Center: Ring Diagram + Data -->
      <section class="panel data-panel" id="data-panel">
        <div class="panel-title">Ring Diagram</div>
        <div class="ring-container" id="ring-container"></div>
        <div class="data-table" id="data-table"></div>
      </section>

      <!-- Right: Math -->
      <section class="panel math-panel" id="math-panel">
        <div class="panel-title">Mathematics</div>
        <div id="math-content"></div>
      </section>
    </main>

    <!-- FOOTER -->
    <footer class="site-footer">
      <div class="footer-citation">
       The Algorithm is based on the paper "How to Leak a Secret" by Rivest, Shamir, and Tauman.
      </div>
      <div class="footer-credit">
        Built by <a href="https://github.com/tompfi" target="_blank" rel="noopener">tompfi</a>
      </div>
    </footer>
  `;

  // Create SVG ring diagram
  ringDiagramSvg = createRingDiagram(document.getElementById('ring-container'));

  // Bind controls
  bindControls();

  // Initialize state & first render
  initialize();
}

function bindControls() {
  const msgInput = document.getElementById('message-input');
  let debounceTimer;
  msgInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => setMessage(e.target.value || 'hello'), 400);
  });

  document.getElementById('ring-size-select').addEventListener('change', (e) => {
    setRingSize(parseInt(e.target.value));
    updateSignerSelect();
  });

  document.getElementById('signer-select').addEventListener('change', (e) => {
    setSignerIndex(parseInt(e.target.value));
  });

  document.getElementById('btn-first').addEventListener('click', () => setStep(0));
  document.getElementById('btn-prev').addEventListener('click', () => prevStep());
  document.getElementById('btn-next').addEventListener('click', () => {
    const steps = getSteps(getState());
    nextStep(steps.length);
  });
  document.getElementById('btn-last').addEventListener('click', () => {
    const steps = getSteps(getState());
    setStep(steps.length - 1);
  });
  document.getElementById('btn-auto').addEventListener('click', () => {
    const steps = getSteps(getState());
    toggleAutoPlay(steps.length);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const steps = getSteps(getState());
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      nextStep(steps.length);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevStep();
    }
  });

  updateSignerSelect();
}

function updateSignerSelect() {
  const state = getState();
  const select = document.getElementById('signer-select');
  select.innerHTML = '';
  for (let i = 0; i < state.ringSize; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = MEMBER_NAMES[i];
    if (i === state.signerIndex) opt.selected = true;
    select.appendChild(opt);
  }
}

function render(state) {
  const steps = getSteps(state);
  const stepIdx = Math.min(state.currentStep, steps.length - 1);
  const step = steps[stepIdx];
  if (!step) return;

  // Update step controls
  document.getElementById('step-counter').textContent = `Step ${stepIdx + 1} / ${steps.length}`;
  document.getElementById('phase-label').textContent = step.phase;
  document.getElementById('btn-prev').disabled = stepIdx === 0;
  document.getElementById('btn-first').disabled = stepIdx === 0;
  document.getElementById('btn-next').disabled = stepIdx === steps.length - 1;
  document.getElementById('btn-last').disabled = stepIdx === steps.length - 1;

  const autoBtn = document.getElementById('btn-auto');
  const autoIcon = document.getElementById('auto-icon');
  if (state.autoPlaying) {
    autoBtn.classList.add('playing');
    autoIcon.textContent = '⏸';
  } else {
    autoBtn.classList.remove('playing');
    autoIcon.textContent = '▶';
  }

  // Render explanation panel
  const explainEl = document.getElementById('explain-content');
  explainEl.innerHTML = `
    <h2 class="step-title animate-in">${step.title}</h2>
    <div class="step-subtitle animate-in">${step.subtitle}</div>
    <div class="step-body animate-in">${step.explanation}</div>
  `;

  // Render ring diagram
  if (ringDiagramSvg) {
    updateRingDiagram(ringDiagramSvg, step);
  }

  // Render data table
  renderDataTable(step, state);

  // Render math panel
  renderMathPanel(step);
}

function renderDataTable(step, state) {
  const tableEl = document.getElementById('data-table');

  if (step.dataTable && step.dataTable.length > 0) {
    let html = '<table><thead><tr><th>Member</th>';
    const keys = Object.keys(step.dataTable[0].values);
    keys.forEach(k => { html += `<th>${k}</th>`; });
    html += '</tr></thead><tbody>';
    step.dataTable.forEach(row => {
      html += `<tr><td><span class="member-dot" style="background:${row.color}"></span>${row.member}</td>`;
      keys.forEach(k => { html += `<td>${row.values[k]}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table>';
    tableEl.innerHTML = html;
    return;
  }

  if (step.computedValues && step.computedValues.length > 0) {
    let html = '<table><thead><tr><th>Variable</th><th>Value</th></tr></thead><tbody>';
    step.computedValues.forEach(cv => {
      html += `<tr class="animate-child"><td><span class="${cv.colorClass}">${cv.name}</span></td><td class="${cv.colorClass}">${cv.value}</td></tr>`;
    });
    html += '</tbody></table>';
    tableEl.innerHTML = html;
    return;
  }

  tableEl.innerHTML = '';
}

function renderMathPanel(step) {
  const mathEl = document.getElementById('math-content');
  let html = '';

  if (step.formula) {
    html += '<div class="formula-block animate-in">';
    html += '<div class="formula-label">Formula</div>';
    html += '<div class="formula-content" id="formula-render"></div>';
    html += '</div>';
  }

  if (step.computedValues && step.computedValues.length > 0) {
    html += '<div class="formula-block animate-in">';
    html += '<div class="formula-label">Computed Values</div>';
    step.computedValues.forEach(cv => {
      html += `<div class="computed-value animate-child">
        <span class="var-name ${cv.colorClass}">${cv.name}</span>
        <span class="var-val ${cv.colorClass}">${cv.value}</span>
      </div>`;
    });
    html += '</div>';
  }

  mathEl.innerHTML = html;

  // Render KaTeX formula
  if (step.formula) {
    const formulaEl = document.getElementById('formula-render');
    if (formulaEl) {
      renderFormula(formulaEl, step.formula);
    }
  }
}

// Subscribe to state changes
subscribe(render);

// Boot
buildApp();
