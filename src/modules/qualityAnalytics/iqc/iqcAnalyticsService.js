export function calculateSigma(tea, bias, cv) {
  if (cv <= 0) return 0;
  return (tea - bias) / cv;
}