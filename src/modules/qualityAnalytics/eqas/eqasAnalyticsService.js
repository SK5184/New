export function calculateZScore(labValue, peerMean, peerSD) {
  if (peerSD <= 0) return 0;
  return (labValue - peerMean) / peerSD;
}