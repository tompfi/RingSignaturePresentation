// ═══════════════════════════════════════════════════
// Ring Signature — Sign & Verify (RST Construction)
// Based on: Rivest, Shamir, Tauman. "How to Leak a Secret" (2001)
//
// Uses the extended trapdoor permutation to ensure g_i
// is a permutation on the full b-bit domain.
// ═══════════════════════════════════════════════════

import { extendedTrapdoor, extendedTrapdoorInverse } from './rsa.js';
import {
  hashMessage,
  symmetricEncrypt,
  symmetricDecrypt,
  xorBigInt,
  randomBigInt,
} from './utils.js';

/** Bit width for the combining function domain */
const BITS = 32;

/**
 * The combining function C_{k,v}(y_1, ..., y_n).
 *
 * Computes the ring equation as a chain:
 *   z_0 = v
 *   z_i = E_k(y_i ⊕ z_{i-1})    for i = 1..n
 *   Output = z_n
 *
 * For a valid signature: C_{k,v}(y_1,...,y_n) = v  (the ring closes)
 */
export function combiningFunction(k, v, ys) {
  const intermediates = [BigInt(v)];
  let z = BigInt(v);
  for (let i = 0; i < ys.length; i++) {
    const xored = xorBigInt(BigInt(ys[i]), z);
    z = symmetricEncrypt(k, xored, BITS);
    intermediates.push(z);
  }
  return { output: z, intermediates };
}

/**
 * Solve for y_s in the combining function.
 *
 * Given all other y_i values, find y_s such that
 * C_{k,v}(y_1,...,y_n) = v.
 *
 * 1. Forward from v to position s: z_0, z_1, ..., z_{s-1}
 * 2. Backward from v (target) to position s: z_n, z_{n-1}, ..., z_{s+1}
 * 3. y_s = E_k^{-1}(z_{s+1}) ⊕ z_{s-1}
 *    where z_{s-1} is the last forward value and
 *    z_{s+1} is the first backward value after the signer.
 */
export function solveForSigner(k, v, ys, signerIndex) {
  const n = ys.length;
  const vBig = BigInt(v);

  // Forward pass: z_0 = v, then z_i = E_k(y_i ⊕ z_{i-1}) for i < signerIndex
  const forwardZ = [vBig];
  for (let i = 0; i < signerIndex; i++) {
    const xored = xorBigInt(BigInt(ys[i]), forwardZ[forwardZ.length - 1]);
    forwardZ.push(symmetricEncrypt(k, xored, BITS));
  }
  // forwardZ[signerIndex] = z_{s-1} (the value entering the signer's position)
  // Actually: forwardZ has indices 0..signerIndex
  // forwardZ[0] = z_0 = v
  // forwardZ[signerIndex] = z after processing members 0..signerIndex-1

  // Backward pass: target is z_n = v, work backwards
  // z_i = E_k^{-1}(z_{i+1}) ⊕ y_i   for i = n-1, n-2, ..., signerIndex+1
  // But we actually need z_{signerIndex+1}: the value that should come OUT
  // of the signer's position.
  //
  // Chain after signer: z_{s+1} = E_k(y_{s+1} ⊕ z_s), ..., z_n = v
  // Working backwards: z_s = E_k^{-1}(z_{s+1}) ⊕ y_{s+1}... no wait.
  //
  // Let's think about it differently. We need:
  //   E_k(y_s ⊕ z_{s-1}) = z_s   (this defines z_s, the output of signer's step)
  //   Then z_{s+1} = E_k(y_{s+1} ⊕ z_s), ..., z_n = v
  //
  // Backward: starting from z_n = v, we can compute z_s:
  //   z_{n-1} such that E_k(y_n ⊕ z_{n-1}) = z_n = v
  //   => y_n ⊕ z_{n-1} = E_k^{-1}(v)
  //   => z_{n-1} = E_k^{-1}(v) ⊕ y_n
  //   Generally: z_i = E_k^{-1}(z_{i+1}) ⊕ y_{i+1}
  //   We continue until we get z_s.

  // Start from z_n = v
  let zBack = vBig;
  for (let i = n - 1; i >= signerIndex; i--) {
    // z_i = E_k^{-1}(z_{i+1}) ⊕ y_{i+1}
    // But we don't have y for signerIndex yet. We compute down to z_s.
    if (i > signerIndex) {
      zBack = xorBigInt(symmetricDecrypt(k, zBack, BITS), BigInt(ys[i]));
    }
    // When i === signerIndex, zBack is z_s (what the signer's output must be)
  }

  const z_s = zBack; // This is what E_k(y_s ⊕ z_{s-1}) must equal
  const z_s_minus_1 = forwardZ[signerIndex];

  // y_s = E_k^{-1}(z_s) ⊕ z_{s-1}
  const y_s = xorBigInt(symmetricDecrypt(k, z_s, BITS), z_s_minus_1);

  return {
    y_s,
    forwardZ,
    z_s,
    z_s_minus_1
  };
}

/**
 * Generate a ring signature.
 *
 * @param {string} message - The message to sign
 * @param {Array} keys - Array of {publicKey: {e, n}} for all ring members
 * @param {number} signerIndex - Index of the actual signer
 * @param {Object} signerPrivateKey - {d, n} of the signer
 * @returns {Object} Signature and all intermediate values for visualization
 */
export function ringSign(message, keys, signerIndex, signerPrivateKey) {
  const n = keys.length;

  // Step 1: Hash the message to get the symmetric key
  const k = hashMessage(message, BITS);

  // Step 2: Pick random glue value v
  const v = randomBigInt(BITS);

  // Step 3: For each non-signer, pick random x_i and compute y_i = g_i(x_i)
  const xs = new Array(n);
  const ys = new Array(n);

  for (let i = 0; i < n; i++) {
    if (i === signerIndex) continue;
    // Pick random x_i in the b-bit domain
    xs[i] = randomBigInt(BITS);
    // y_i = g_i(x_i) using extended trapdoor permutation
    ys[i] = extendedTrapdoor(xs[i], keys[i].publicKey, BITS);
  }

  // Step 4: Solve for y_s using the combining function
  const solveResult = solveForSigner(k, v, ys, signerIndex);
  ys[signerIndex] = solveResult.y_s;

  // Step 5: Invert trapdoor to get x_s = g_s^{-1}(y_s)
  xs[signerIndex] = extendedTrapdoorInverse(ys[signerIndex], signerPrivateKey, BITS);

  // Compute the combining function with all y values for verification display
  const verifyResult = combiningFunction(k, v, ys);

  return {
    signature: { v, xs: [...xs] },
    intermediates: {
      k,
      v,
      xs: [...xs],
      ys: [...ys],
      combiningResult: verifyResult,
      solveResult,
      signerIndex,
      bits: BITS
    }
  };
}

/**
 * Verify a ring signature.
 *
 * @param {string} message - The signed message
 * @param {Array} keys - Array of {publicKey: {e, n}} for all ring members
 * @param {Object} signature - { v, xs }
 * @returns {Object} Verification result and intermediate values
 */
export function ringVerify(message, keys, signature) {
  const { v, xs } = signature;
  const n = keys.length;

  // Step 1: Recompute k from message
  const k = hashMessage(message, BITS);

  // Step 2: Compute all y_i = g_i(x_i) using extended trapdoor with public keys
  const ys = [];
  for (let i = 0; i < n; i++) {
    ys.push(extendedTrapdoor(xs[i], keys[i].publicKey, BITS));
  }

  // Step 3: Evaluate combining function
  const result = combiningFunction(k, v, ys);

  // Step 4: Check if output equals v
  const valid = result.output === BigInt(v);

  return {
    valid,
    intermediates: {
      k,
      v,
      xs,
      ys,
      combiningResult: result,
      bits: BITS
    }
  };
}
