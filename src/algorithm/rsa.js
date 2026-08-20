// ═══════════════════════════════════════════════════
// RSA Key Generation & Extended Trapdoor Permutation
// (small keys for visualization)
//
// The RST paper requires the trapdoor permutation g_i to be
// a permutation on the full b-bit domain {0, ..., 2^b - 1}.
// Standard RSA only permutes Z_n. We use the paper's "extended
// trap-door permutation" construction to tile RSA across the
// full domain.
// ═══════════════════════════════════════════════════

import { modPow, modInverse, randomBigInt } from './utils.js';

/**
 * Small primes list for demo RSA keys.
 * We use small primes so numbers are readable on screen.
 */
const SMALL_PRIMES = [
  53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
  101, 103, 107, 109, 113, 127, 131, 137, 139, 149,
  151, 157, 163, 167, 173, 179, 181, 191, 193, 197,
  199, 211, 223, 227, 229, 233, 239, 241, 251, 257,
  263, 269, 271, 277, 281, 283, 293, 307, 311, 313
];

/**
 * Pick a random prime from our list, excluding already-used ones
 */
function pickPrime(exclude = []) {
  const available = SMALL_PRIMES.filter(p => !exclude.includes(p));
  const idx = Math.floor(Math.random() * available.length);
  return BigInt(available[idx]);
}

/**
 * GCD using Euclidean algorithm
 */
function gcd(a, b) {
  a = BigInt(a);
  b = BigInt(b);
  while (b > 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Generate an RSA key pair with small primes.
 * Returns { p, q, n, e, d, phi, bits }
 */
export function generateKeyPair(usedPrimes = []) {
  const p = pickPrime(usedPrimes.map(Number));
  const q = pickPrime([...usedPrimes.map(Number), Number(p)]);
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);

  // Find a valid public exponent e
  let e = 65537n;
  if (e >= phi) {
    e = 17n;
  }
  while (gcd(e, phi) !== 1n) {
    e += 2n;
    if (e >= phi) e = 3n;
  }

  const d = modInverse(e, phi);

  return {
    p, q, n, e, d, phi,
    publicKey: { e, n },
    privateKey: { d, n },
    bits: n.toString(2).length
  };
}

/**
 * Extended Trapdoor Permutation (forward direction):
 *
 * Maps {0, ..., 2^b - 1} → {0, ..., 2^b - 1} as a permutation.
 *
 * For input x (a b-bit value):
 *   q = floor(x / n),  r = x mod n
 *   if (q+1)*n <= 2^b:
 *     output = q*n + (r^e mod n)    // apply RSA to the remainder
 *   else:
 *     output = x                     // identity in the overflow region
 *
 * This is a permutation because RSA permutes each "tile" of size n,
 * and the overflow region (where not a full tile fits) is left as identity.
 */
export function extendedTrapdoor(x, publicKey, bits) {
  x = BigInt(x);
  const n = publicKey.n;
  const domainSize = 1n << BigInt(bits);  // 2^b
  const q = x / n;
  const r = x % n;

  if ((q + 1n) * n <= domainSize) {
    // Full tile: apply RSA encryption to the remainder
    return q * n + modPow(r, publicKey.e, n);
  } else {
    // Overflow region: identity
    return x;
  }
}

/**
 * Extended Trapdoor Permutation (inverse / backward direction):
 *
 * For input y (a b-bit value):
 *   q = floor(y / n),  r = y mod n
 *   if (q+1)*n <= 2^b:
 *     output = q*n + (r^d mod n)    // apply RSA decryption to remainder
 *   else:
 *     output = y                     // identity in overflow region
 */
export function extendedTrapdoorInverse(y, privateKey, bits) {
  y = BigInt(y);
  const n = privateKey.n;
  const domainSize = 1n << BigInt(bits);
  const q = y / n;
  const r = y % n;

  if ((q + 1n) * n <= domainSize) {
    return q * n + modPow(r, privateKey.d, n);
  } else {
    return y;
  }
}

/**
 * Generate multiple key pairs for ring members
 */
export function generateRingKeys(count) {
  const keys = [];
  const usedPrimes = [];
  for (let i = 0; i < count; i++) {
    const kp = generateKeyPair(usedPrimes);
    keys.push(kp);
    usedPrimes.push(kp.p, kp.q);
  }
  return keys;
}
