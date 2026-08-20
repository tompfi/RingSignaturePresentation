// ═══════════════════════════════════════════════════
// Cryptographic Utility Functions
// ═══════════════════════════════════════════════════

/**
 * Modular exponentiation: (base^exp) mod mod
 * Using BigInt for arbitrary precision
 */
export function modPow(base, exp, mod) {
  base = BigInt(base);
  exp = BigInt(exp);
  mod = BigInt(mod);
  if (mod === 1n) return 0n;
  let result = 1n;
  base = ((base % mod) + mod) % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp = exp / 2n;
    base = (base * base) % mod;
  }
  return result;
}

/**
 * Extended Euclidean Algorithm
 * Returns [gcd, x, y] such that a*x + b*y = gcd(a,b)
 */
export function extGcd(a, b) {
  a = BigInt(a);
  b = BigInt(b);
  if (a === 0n) return [b, 0n, 1n];
  const [g, x1, y1] = extGcd(b % a, a);
  return [g, y1 - (b / a) * x1, x1];
}

/**
 * Modular inverse: a^(-1) mod m
 */
export function modInverse(a, m) {
  a = BigInt(a);
  m = BigInt(m);
  const [g, x] = extGcd(((a % m) + m) % m, m);
  if (g !== 1n) throw new Error('Modular inverse does not exist');
  return ((x % m) + m) % m;
}

/**
 * Simple deterministic hash for demo purposes.
 * Maps a string to a BigInt in range [0, 2^bits).
 */
export function hashMessage(message, bits = 64) {
  let h = 0n;
  const prime = 31n;
  for (let i = 0; i < message.length; i++) {
    h = (h * prime + BigInt(message.charCodeAt(i))) & ((1n << BigInt(bits)) - 1n);
  }
  // Ensure non-zero
  if (h === 0n) h = 1n;
  return h;
}

/**
 * Symmetric encryption function E_k.
 * We use a simple Feistel-like cipher for visualization.
 * E_k(x) = (x * k + c) mod 2^bits   (simplified, invertible)
 *
 * For the ring signature we need E_k to be a permutation on {0,...,2^b -1}.
 * We use: E_k(x) = x XOR k  (simplest invertible permutation)
 */
export function symmetricEncrypt(k, x, bits = 64) {
  k = BigInt(k);
  x = BigInt(x);
  const mask = (1n << BigInt(bits)) - 1n;
  return (x ^ k) & mask;
}

/**
 * Symmetric decryption (inverse of E_k).
 * Since E_k(x) = x XOR k, E_k^{-1}(y) = y XOR k
 */
export function symmetricDecrypt(k, y, bits = 64) {
  return symmetricEncrypt(k, y, bits); // XOR is its own inverse
}

/**
 * XOR two BigInts
 */
export function xorBigInt(a, b) {
  return BigInt(a) ^ BigInt(b);
}

/**
 * Generate a random BigInt with the specified number of bits
 */
export function randomBigInt(bits) {
  const bytes = Math.ceil(bits / 8);
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let result = 0n;
  for (let i = 0; i < arr.length; i++) {
    result = (result << 8n) | BigInt(arr[i]);
  }
  // Mask to exact bit count
  const mask = (1n << BigInt(bits)) - 1n;
  result = result & mask;
  // Ensure at least 1 bit set
  if (result === 0n) result = 1n;
  return result;
}

/**
 * Format BigInt as hex string with prefix
 */
export function toHex(n) {
  const s = BigInt(n).toString(16);
  return '0x' + s;
}

/**
 * Format BigInt as shortened display string
 */
export function toShortHex(n, maxLen = 12) {
  const s = BigInt(n).toString(16);
  if (s.length <= maxLen) return '0x' + s;
  return '0x' + s.slice(0, 6) + '…' + s.slice(-4);
}

/**
 * Format BigInt as decimal with optional truncation
 */
export function toDecimal(n, maxLen = 16) {
  const s = BigInt(n).toString(10);
  if (s.length <= maxLen) return s;
  return s.slice(0, 8) + '…' + s.slice(-4);
}
