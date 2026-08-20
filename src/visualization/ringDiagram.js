// ═══════════════════════════════════════════════════
// SVG Ring Diagram Renderer
// ═══════════════════════════════════════════════════

import { getState } from '../state/store.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function createRingDiagram(container) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 480 480');
  svg.setAttribute('id', 'ring-svg');
  container.appendChild(svg);

  // Defs for arrow markers and filters
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML = `
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280"/>
    </marker>
    <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#22d3ee"/>
    </marker>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="signer-glow">
      <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  `;
  svg.appendChild(defs);

  return svg;
}

export function updateRingDiagram(svg, step) {
  const state = getState();
  const n = state.ringSize;
  const cx = 240, cy = 240, radius = 160;
  const nodeRadius = 32;
  const colors = state.memberColors;
  const names = state.memberNames;
  const si = state.signerIndex;
  const s = state.signatureResult?.intermediates;
  const highlightNodes = step.highlightNodes || [];
  const activeEdges = step.activeEdges || [];

  // Clear previous content (keep defs)
  const defs = svg.querySelector('defs');
  svg.innerHTML = '';
  svg.appendChild(defs);

  // Glue value label in center
  const centerGroup = document.createElementNS(SVG_NS, 'g');
  if (s && step.id !== 'intro' && step.id !== 'ring-concept' && step.id !== 'key-gen' && step.id !== 'ring-formation') {
    const vText = document.createElementNS(SVG_NS, 'text');
    vText.setAttribute('x', cx);
    vText.setAttribute('y', cy - 12);
    vText.setAttribute('text-anchor', 'middle');
    vText.setAttribute('class', 'glue-label');
    vText.textContent = 'v';

    const vVal = document.createElementNS(SVG_NS, 'text');
    vVal.setAttribute('x', cx);
    vVal.setAttribute('y', cy + 8);
    vVal.setAttribute('text-anchor', 'middle');
    vVal.setAttribute('fill', '#ec4899');
    vVal.setAttribute('font-family', "'JetBrains Mono', monospace");
    vVal.setAttribute('font-size', '9');
    vVal.textContent = '0x' + BigInt(s.v).toString(16).slice(0, 8) + '…';

    centerGroup.appendChild(vText);
    centerGroup.appendChild(vVal);
  } else {
    const title = document.createElementNS(SVG_NS, 'text');
    title.setAttribute('x', cx);
    title.setAttribute('y', cy - 4);
    title.setAttribute('text-anchor', 'middle');
    title.setAttribute('fill', '#6b7280');
    title.setAttribute('font-family', "'Inter', sans-serif");
    title.setAttribute('font-size', '13');
    title.setAttribute('font-weight', '600');
    title.textContent = 'Ring';

    centerGroup.appendChild(title);
  }
  svg.appendChild(centerGroup);

  // Compute node positions
  const positions = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      angle
    });
  }

  // Draw edges (arcs between nodes)
  for (let i = 0; i < n; i++) {
    const from = positions[i];
    const to = positions[(i + 1) % n];
    const isActive = activeEdges.includes(i);

    const path = document.createElementNS(SVG_NS, 'path');
    // Compute direction vectors
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / dist;
    const uy = dy / dist;

    const startX = from.x + ux * (nodeRadius + 4);
    const startY = from.y + uy * (nodeRadius + 4);
    const endX = to.x - ux * (nodeRadius + 8);
    const endY = to.y - uy * (nodeRadius + 8);

    // Curved path
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const perpX = -uy * 20;
    const perpY = ux * 20;

    path.setAttribute('d', `M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY} ${endX} ${endY}`);
    path.setAttribute('stroke', isActive ? '#22d3ee' : colors[i]);
    path.setAttribute('class', `ring-edge ${isActive ? 'active flow-animation' : ''}`);
    path.setAttribute('marker-end', isActive ? 'url(#arrow-active)' : 'url(#arrow)');

    svg.appendChild(path);
  }

  // Draw nodes
  for (let i = 0; i < n; i++) {
    const pos = positions[i];
    const isHighlighted = highlightNodes.includes(i);
    const isSigner = i === si;

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', `ring-node ${isHighlighted ? 'active' : ''} ${isSigner && step.phase === 'Signing' && step.id !== 'random-xi' && step.id !== 'compute-yi' ? 'signer' : ''}`);

    // Node circle
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', pos.x);
    circle.setAttribute('cy', pos.y);
    circle.setAttribute('r', nodeRadius);
    circle.setAttribute('class', 'node-bg');
    circle.setAttribute('stroke', colors[i]);
    if (isHighlighted) {
      circle.setAttribute('filter', isSigner && step.phase !== 'Introduction' ? 'url(#signer-glow)' : 'url(#glow)');
    }
    group.appendChild(circle);

    // Member name
    const nameText = document.createElementNS(SVG_NS, 'text');
    nameText.setAttribute('x', pos.x);
    nameText.setAttribute('y', pos.y - 6);
    nameText.textContent = names[i];
    group.appendChild(nameText);

    // Member index label
    const indexText = document.createElementNS(SVG_NS, 'text');
    indexText.setAttribute('x', pos.x);
    indexText.setAttribute('y', pos.y + 10);
    indexText.setAttribute('class', 'node-label');
    indexText.textContent = `P${i + 1}`;
    group.appendChild(indexText);

    // Signer indicator
    if (isSigner && (step.phase === 'Signing' || step.id === 'ring-formation')) {
      const badge = document.createElementNS(SVG_NS, 'text');
      badge.setAttribute('x', pos.x);
      badge.setAttribute('y', pos.y + nodeRadius + 16);
      badge.setAttribute('text-anchor', 'middle');
      badge.setAttribute('fill', '#fbbf24');
      badge.setAttribute('font-size', '10');
      badge.setAttribute('font-family', "'JetBrains Mono', monospace");
      badge.setAttribute('font-weight', '700');
      badge.textContent = '★ signer';
      group.appendChild(badge);
    }

    svg.appendChild(group);
  }
}
