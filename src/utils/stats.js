/**
 * Statistical utility functions for bioinformatic pathway enrichment
 * Implements Hypergeometric test (Fisher's exact test) & Benjamini-Hochberg FDR
 */

// Log-gamma function for log factorial calculation
function logGamma(z) {
  const c = [
    57.15623564588782, -59.59796035547549, 14.136097974741747,
    -0.4919138160976202, 0.33994649984811888e-4, 0.4652362892704858e-4,
    -0.9837447530487956e-4, 0.15808870322437737e-3, -0.21026444102453932e-3,
    0.21743961811521265e-3, -0.1643181065367639e-3, 0.8441822398385275e-4,
    -0.26190838401581408e-4, 0.36899182659531624e-5
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let base = 0.9999999999999971;
  for (let i = 0; i < c.length; i++) {
    base += c[i] / (z + i + 1);
  }
  const t = z + c.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(base);
}

function logFactorial(n) {
  if (n <= 1) return 0;
  return logGamma(n + 1);
}

function logCombination(n, k) {
  if (k < 0 || k > n) return -Infinity;
  if (k === 0 || k === n) return 0;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

/**
 * Hypergeometric probability mass function (PMF)
 * k: number of observed successes (genes in query & pathway)
 * N: total population size (total reference genes in genome)
 * K: total successes in population (genes in pathway)
 * n: number of draws (total query DEGs)
 */
export function hypergeometricPMF(k, N, K, n) {
  if (k < Math.max(0, n + K - N) || k > Math.min(n, K)) return 0;
  const logProb = logCombination(K, k) + logCombination(N - K, n - k) - logCombination(N, n);
  return Math.exp(logProb);
}

/**
 * One-tailed Hypergeometric test (Upper tail / Over-representation P-value)
 * P(X >= k) = sum_{i=k}^{min(n, K)} P(X = i)
 */
export function hypergeometricCumulativePValue(k, N, K, n) {
  if (k <= 0) return 1.0;
  const maxK = Math.min(n, K);
  if (k > maxK) return 0.0;
  
  let pVal = 0;
  for (let i = k; i <= maxK; i++) {
    pVal += hypergeometricPMF(i, N, K, n);
  }
  return Math.min(1.0, Math.max(0.0, pVal));
}

/**
 * Benjamini-Hochberg FDR (False Discovery Rate) correction
 * pValues: array of { id, pValue, ... }
 */
export function calculateFDR(results) {
  const sorted = [...results].sort((a, b) => a.pValue - b.pValue);
  const m = sorted.length;
  if (m === 0) return [];

  let minQ = 1.0;
  for (let i = m - 1; i >= 0; i--) {
    const rank = i + 1;
    const rawP = sorted[i].pValue;
    const adjusted = (rawP * m) / rank;
    minQ = Math.min(minQ, adjusted);
    sorted[i].fdr = Math.min(1.0, Math.max(0.0, minQ));
  }

  return sorted;
}
