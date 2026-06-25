export function getRiskLevel(score) {
  if (score >= 15) return "High";
  if (score >= 8) return "Medium";
  return "Low";
}