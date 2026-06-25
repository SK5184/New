export function calculateCompliance(totalAudits, passedAudits) {
  if (totalAudits <= 0) return 100;
  return (passedAudits / totalAudits) * 100;
}