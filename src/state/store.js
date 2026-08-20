// ═══════════════════════════════════════════════════
// Reactive State Store
// ═══════════════════════════════════════════════════

import { generateRingKeys } from '../algorithm/rsa.js';
import { ringSign, ringVerify } from '../algorithm/ring.js';

const MEMBER_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace'];
const MEMBER_COLORS = [
  '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#38bdf8', '#a78bfa', '#fb923c'
];

function createInitialState() {
  return {
    message: 'How to Leak a Secret',
    ringSize: 4,
    signerIndex: 0,
    currentStep: 0,
    autoPlaying: false,
    autoPlaySpeed: 2000,
    keys: [],
    signatureResult: null,
    verificationResult: null,
    memberNames: MEMBER_NAMES,
    memberColors: MEMBER_COLORS,
  };
}

let state = createInitialState();
let subscribers = [];

export function getState() {
  return state;
}

export function subscribe(fn) {
  subscribers.push(fn);
  return () => {
    subscribers = subscribers.filter(s => s !== fn);
  };
}

function notify() {
  subscribers.forEach(fn => fn(state));
}

export function setState(updates) {
  state = { ...state, ...updates };
  notify();
}

/**
 * Regenerate keys and recompute signature from scratch
 */
export function recompute() {
  const keys = generateRingKeys(state.ringSize);
  const signerKey = keys[state.signerIndex];

  const signResult = ringSign(
    state.message,
    keys,
    state.signerIndex,
    signerKey.privateKey
  );

  const verifyResult = ringVerify(
    state.message,
    keys,
    signResult.signature
  );

  setState({
    keys,
    signatureResult: signResult,
    verificationResult: verifyResult,
  });
}

export function setMessage(msg) {
  setState({ message: msg, currentStep: 0 });
  recompute();
}

export function setRingSize(size) {
  const s = Math.max(3, Math.min(7, size));
  const signerIndex = Math.min(state.signerIndex, s - 1);
  setState({ ringSize: s, signerIndex, currentStep: 0 });
  recompute();
}

export function setSignerIndex(idx) {
  setState({ signerIndex: idx, currentStep: 0 });
  recompute();
}

export function setStep(step) {
  setState({ currentStep: Math.max(0, step) });
}

export function nextStep(totalSteps) {
  if (state.currentStep < totalSteps - 1) {
    setState({ currentStep: state.currentStep + 1 });
  }
}

export function prevStep() {
  if (state.currentStep > 0) {
    setState({ currentStep: state.currentStep - 1 });
  }
}

let autoPlayTimer = null;

export function toggleAutoPlay(totalSteps) {
  if (state.autoPlaying) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
    setState({ autoPlaying: false });
  } else {
    setState({ autoPlaying: true });
    autoPlayTimer = setInterval(() => {
      if (state.currentStep >= totalSteps - 1) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
        setState({ autoPlaying: false });
        return;
      }
      nextStep(totalSteps);
    }, state.autoPlaySpeed);
  }
}

export function initialize() {
  recompute();
}

export { MEMBER_NAMES, MEMBER_COLORS };
