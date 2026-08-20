// Step Definitions for Ring Signature Visualization
import { toHex, toShortHex, toDecimal } from '../algorithm/utils.js';

export function getSteps(state) {
  const s = state.signatureResult?.intermediates;
  const v = state.verificationResult?.intermediates;
  const keys = state.keys;
  const names = state.memberNames;
  const si = state.signerIndex;

  return [
    // ─── PHASE: INTRODUCTION ───
    {
      id: 'intro',
      phase: 'Introduction',
      title: 'What is a Ring Signature?',
      subtitle: 'Anonymous signatures for groups',
      explanation: `<p>A <strong>ring signature</strong> allows a member of a group to sign a message on behalf of the group, without revealing <em>which</em> member actually signed it.</p>
<p>Introduced by Rivest, Shamir & Tauman in their 2001 paper <strong>"How to Leak a Secret"</strong>, ring signatures enable a whistleblower to prove they belong to a group (e.g. "a cabinet member") without exposing their identity.</p>
<div class="callout info">💡 Unlike group signatures, ring signatures require <strong>no setup</strong>, no trusted third party, and no coordination between members.</div>`,
      formula: '',
      highlightNodes: [],
      activeEdges: [],
    },
    {
      id: 'ring-concept',
      phase: 'Introduction',
      title: 'The Ring Metaphor',
      subtitle: 'A circular chain of computations',
      explanation: `<p>The signature is structured as a <strong>ring</strong> — a circular chain of computations linking all members together.</p>
<p>Each member contributes a value. The chain must "close" — meaning the output loops back to the starting value. Only someone with a <strong>private key</strong> can close this loop.</p>
<p>A verifier can confirm the ring closes, but <strong>cannot tell which member</strong> used their private key to close it.</p>
<div class="callout warning">🔑 The signer uses their secret key to "close the ring." All other values are random.</div>`,
      formula: 'C_{k,v}(y_1, y_2, \\ldots, y_n) = v',
      highlightNodes: Array.from({length: state.ringSize}, (_, i) => i),
      activeEdges: Array.from({length: state.ringSize}, (_, i) => i),
    },

    // ─── PHASE: SETUP ───
    {
      id: 'key-gen',
      phase: 'Setup',
      title: 'Key Generation',
      subtitle: 'Each member has an RSA keypair',
      explanation: `<p>Each ring member generates their own <strong>RSA key pair</strong>:</p>
<p>• Pick two primes <strong>p</strong> and <strong>q</strong><br/>
• Compute modulus <strong>n = p × q</strong><br/>
• Compute <strong>φ(n) = (p-1)(q-1)</strong><br/>
• Choose public exponent <strong>e</strong><br/>
• Compute private exponent <strong>d = e⁻¹ mod φ(n)</strong></p>
<p>The <strong>public key</strong> is (e, n). The <strong>private key</strong> is (d, n).</p>
<div class="callout info">🔍 We use small primes here so numbers are readable. Real RSA uses 2048+ bit keys.</div>`,
      formula: 'n_i = p_i \\cdot q_i, \\quad d_i = e_i^{-1} \\bmod \\varphi(n_i)',
      highlightNodes: Array.from({length: state.ringSize}, (_, i) => i),
      activeEdges: [],
      dataTable: keys.length ? keys.map((k, i) => ({
        member: names[i],
        color: state.memberColors[i],
        values: {
          'p': k.p.toString(),
          'q': k.q.toString(),
          'n': k.n.toString(),
          'e': k.e.toString(),
          'd': k.d.toString(),
        }
      })) : [],
    },
    {
      id: 'ring-formation',
      phase: 'Setup',
      title: 'Ring Formation',
      subtitle: 'Signer selects the ring members',
      explanation: `<p>The signer (<strong class="var-signer">${names[si]}</strong>) selects which public keys to include in the ring. They only need the <strong>public keys</strong> of other members — no coordination required.</p>
<p>The ring has <strong>${state.ringSize} members</strong>. The signer knows everyone's public key but only their own private key.</p>
<div class="callout info">📋 Anyone can form a ring using any set of public keys at any time — this is called <strong>spontaneity</strong>.</div>`,
      formula: `\\text{Ring} = \\{P_1, P_2, \\ldots, P_{${state.ringSize}}\\}`,
      highlightNodes: Array.from({length: state.ringSize}, (_, i) => i),
      activeEdges: [],
    },

    // ─── PHASE: SIGNING ───
    {
      id: 'hash-message',
      phase: 'Signing',
      title: 'Hash the Message',
      subtitle: 'Derive symmetric key k from the message',
      explanation: `<p>The signer computes a <strong>hash</strong> of the message to derive a symmetric key <strong class="var-k">k</strong>.</p>
<p>This key will be used in the <strong>combining function</strong> to link all ring members together. The same key must be derivable by the verifier.</p>
<p>Message: <strong>"${state.message}"</strong></p>`,
      formula: 'k = H(m)',
      highlightNodes: [si],
      activeEdges: [],
      computedValues: s ? [
        { name: 'm', value: `"${state.message}"`, colorClass: '' },
        { name: 'k', value: toHex(s.k), colorClass: 'var-k' },
      ] : [],
    },
    {
      id: 'pick-glue',
      phase: 'Signing',
      title: 'Pick Glue Value v',
      subtitle: 'Random initialization vector',
      explanation: `<p>The signer picks a random value <strong class="var-v">v</strong> — called the <strong>"glue value"</strong>.</p>
<p>This value serves as both the <strong>starting point</strong> and the <strong>target output</strong> of the ring equation. The combining function must loop back to <strong class="var-v">v</strong> for the signature to be valid.</p>
<div class="callout info">🎯 Think of <strong class="var-v">v</strong> as the meeting point where the ring "closes."</div>`,
      formula: 'v \\xleftarrow{\\$} \\{0,1\\}^b',
      highlightNodes: [si],
      activeEdges: [],
      computedValues: s ? [
        { name: 'v', value: toHex(s.v), colorClass: 'var-v' },
      ] : [],
    },
    {
      id: 'random-xi',
      phase: 'Signing',
      title: 'Generate Random xᵢ',
      subtitle: 'Random values for non-signer members',
      explanation: `<p>For every ring member <strong>except the signer</strong>, the signer picks a <strong>random value xᵢ</strong>.</p>
<p>These are essentially "fake" signature components — they satisfy the public-key equation but were not produced with any private key.</p>`,
      formula: `\\forall\\, i \\neq s: \\quad x_i \\xleftarrow{\\$} \\mathbb{Z}_{n_i}`,
      highlightNodes: Array.from({length: state.ringSize}, (_, i) => i).filter(i => i !== si),
      activeEdges: [],
      computedValues: s ? s.xs.filter((_, i) => i !== si).map((x, idx) => {
        const realIdx = idx >= si ? idx + 1 : idx;
        return { name: `x_${realIdx+1}`, value: toHex(x), colorClass: '' };
      }) : [],
    },
    {
      id: 'compute-yi',
      phase: 'Signing',
      title: 'Compute yᵢ = gᵢ(xᵢ)',
      subtitle: 'Apply trapdoor one-way function',
      explanation: `<p>For each non-signer member, compute <strong>yᵢ</strong> by applying their <strong>trapdoor one-way function</strong> (RSA encryption with their public key).</p>
<p>This is the <strong>forward direction</strong> — easy to compute, but impossible to invert without the private key.</p>
<p><strong>yᵢ = xᵢ<sup>eᵢ</sup> mod nᵢ</strong></p>`,
      formula: `\\forall\\, i \\neq s: \\quad y_i = g_i(x_i) = x_i^{e_i} \\bmod n_i`,
      highlightNodes: Array.from({length: state.ringSize}, (_, i) => i).filter(i => i !== si),
      activeEdges: [],
      computedValues: s ? s.ys.filter((_, i) => i !== si).map((y, idx) => {
        const realIdx = idx >= si ? idx + 1 : idx;
        return { name: `y_${realIdx+1}`, value: toHex(y), colorClass: '' };
      }) : [],
    },
    {
      id: 'combining-chain',
      phase: 'Signing',
      title: 'The Combining Chain',
      subtitle: 'E_k and XOR link values around the ring',
      explanation: `<p>The <strong>combining function</strong> chains all yᵢ values together using <strong class="var-enc">symmetric encryption Eₖ</strong> and <strong class="var-xor">XOR ⊕</strong>:</p>
<p>Starting from <strong class="var-v">v</strong>, each step XORs the next yᵢ with the previous result, then encrypts with <strong class="var-k">k</strong>.</p>
<div class="callout info">🔗 The chain creates a dependency: changing any single yᵢ changes the final output.</div>`,
      formula: `z_0 = v, \\quad z_i = E_k(y_i \\oplus z_{i-1})`,
      highlightNodes: Array.from({length: state.ringSize}, (_, i) => i),
      activeEdges: Array.from({length: state.ringSize}, (_, i) => i),
      computedValues: s ? [
        { name: 'z₀', value: toHex(s.v), colorClass: 'var-v' },
        ...s.combiningResult.intermediates.slice(1).map((z, i) => ({
          name: `z_${i+1}`, value: toHex(z), colorClass: 'var-enc'
        })),
      ] : [],
    },
    {
      id: 'solve-ys',
      phase: 'Signing',
      title: 'Solve for yₛ',
      subtitle: 'Close the ring equation',
      explanation: `<p>Now comes the key step. The signer must find <strong class="var-signer">yₛ</strong> such that the combining function <strong>loops back to <span class="var-v">v</span></strong>.</p>
<p>They compute <strong>forward</strong> from v up to their position, and <strong>backward</strong> from v (the target) back to their position, then solve:</p>
<p><strong class="var-signer">yₛ = Eₖ⁻¹(zₛ) ⊕ zₛ₋₁</strong></p>
<div class="callout warning">⚡ This is possible because Eₖ is invertible. The signer "fills in the gap" to close the loop.</div>`,
      formula: `y_s = E_k^{-1}(z_s) \\oplus z_{s-1}`,
      highlightNodes: [si],
      activeEdges: [],
      computedValues: s ? [
        { name: 'y_s', value: toHex(s.ys[si]), colorClass: 'var-signer' },
      ] : [],
    },
    {
      id: 'invert-trapdoor',
      phase: 'Signing',
      title: 'Invert with Secret Key',
      subtitle: 'xₛ = gₛ⁻¹(yₛ) — only the signer can do this',
      explanation: `<p>Finally, the signer uses their <strong>private key</strong> to compute <strong class="var-signer">xₛ = gₛ⁻¹(yₛ)</strong>.</p>
<p>This is the <strong>trapdoor inversion</strong> — the step that requires knowledge of the secret key <strong>dₛ</strong>.</p>
<p><strong class="var-signer">xₛ = yₛ<sup>dₛ</sup> mod nₛ</strong></p>
<div class="callout warning">🔐 Without the private key dₛ, nobody can compute this inverse. This is what makes the signature unforgeable.</div>`,
      formula: `x_s = g_s^{-1}(y_s) = y_s^{d_s} \\bmod n_s`,
      highlightNodes: [si],
      activeEdges: [],
      computedValues: s ? [
        { name: 'x_s', value: toHex(s.xs[si]), colorClass: 'var-signer' },
      ] : [],
    },
    {
      id: 'output-signature',
      phase: 'Signing',
      title: 'Output Signature',
      subtitle: 'σ = (v, x₁, x₂, ..., xₙ)',
      explanation: `<p>The ring signature is the tuple:</p>
<p><strong>σ = (<span class="var-v">v</span>, x₁, x₂, …, xₙ)</strong></p>
<p>Notice: the signature does <strong>not</strong> reveal which member is the signer. All xᵢ values look equally random.</p>
<div class="callout success">✅ The signature is complete! Now anyone can verify it using only the public keys.</div>`,
      formula: `\\sigma = (v,\\; x_1,\\; x_2,\\; \\ldots,\\; x_n)`,
      highlightNodes: Array.from({length: state.ringSize}, (_, i) => i),
      activeEdges: [],
      computedValues: s ? [
        { name: 'v', value: toHex(s.v), colorClass: 'var-v' },
        ...s.xs.map((x, i) => ({ name: `x_${i+1}`, value: toHex(x), colorClass: '' })),
      ] : [],
    },

    // ─── PHASE: VERIFICATION ───
    {
      id: 'verify-recompute-k',
      phase: 'Verification',
      title: 'Recompute k',
      subtitle: 'Hash the message again',
      explanation: `<p>The verifier receives the message and the signature σ. They first <strong>recompute the symmetric key</strong> from the message.</p>
<p>k = H(m) — this must match the k used during signing.</p>`,
      formula: `k = H(m)`,
      highlightNodes: [],
      activeEdges: [],
      computedValues: v ? [
        { name: 'k', value: toHex(v.k), colorClass: 'var-k' },
      ] : [],
    },
    {
      id: 'verify-compute-yi',
      phase: 'Verification',
      title: 'Recompute All yᵢ',
      subtitle: 'Apply public keys to each xᵢ',
      explanation: `<p>For each member, the verifier computes <strong>yᵢ = gᵢ(xᵢ)</strong> using the public keys.</p>
<p>The verifier doesn't know which xᵢ was produced by a real private key and which were random — they all look the same.</p>`,
      formula: `\\forall\\, i: \\quad y_i = x_i^{e_i} \\bmod n_i`,
      highlightNodes: Array.from({length: state.ringSize}, (_, i) => i),
      activeEdges: [],
      computedValues: v ? v.ys.map((y, i) => ({
        name: `y_${i+1}`, value: toHex(y), colorClass: ''
      })) : [],
    },
    {
      id: 'verify-combining',
      phase: 'Verification',
      title: 'Evaluate Combining Function',
      subtitle: 'Check if the ring closes',
      explanation: `<p>The verifier evaluates the combining function with all computed yᵢ values:</p>
<p><strong>C<sub class="var-k">k</sub>,<sub class="var-v">v</sub>(y₁, y₂, …, yₙ)</strong></p>
<p>If the output equals <strong class="var-v">v</strong>, the ring "closes" and the signature is valid.</p>`,
      formula: `C_{k,v}(y_1, \\ldots, y_n) \\stackrel{?}{=} v`,
      highlightNodes: Array.from({length: state.ringSize}, (_, i) => i),
      activeEdges: Array.from({length: state.ringSize}, (_, i) => i),
      computedValues: v ? [
        { name: 'output', value: toHex(v.combiningResult.output), colorClass: 'var-enc' },
        { name: 'v', value: toHex(v.v), colorClass: 'var-v' },
        { name: 'match', value: v.combiningResult.output === BigInt(v.v) ? '✅ YES' : '❌ NO', colorClass: v.combiningResult.output === BigInt(v.v) ? 'var-signer' : '' },
      ] : [],
    },
    {
      id: 'verify-result',
      phase: 'Verification',
      title: 'Signature Valid ✅',
      subtitle: 'Anonymity holds — signer unknown',
      explanation: `<p>The signature is <strong class="var-signer">valid</strong>! The verifier is convinced that <em>someone</em> in the ring signed the message.</p>
<p>But they <strong>cannot determine who</strong>. Each member's xᵢ could equally have been the "real" one computed via trapdoor inversion.</p>
<div class="callout success">🎯 <strong>Signer Ambiguity:</strong> The signature reveals nothing about which member holds the signing key. This is the core privacy guarantee of ring signatures.</div>
<div class="callout info">📚 Ring signatures are used in <strong>Monero</strong> (via MLSAG/CLSAG) to hide the sender in cryptocurrency transactions.</div>`,
      formula: `\\text{Valid signature — signer identity is perfectly hidden}`,
      highlightNodes: Array.from({length: state.ringSize}, (_, i) => i),
      activeEdges: Array.from({length: state.ringSize}, (_, i) => i),
    },
  ];
}
