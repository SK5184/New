export function calculateComplaintRatio(complaintsCount, totalSamples) {
  if (totalSamples <= 0) return 0;
  return (complaintsCount / totalSamples) * 100;
}