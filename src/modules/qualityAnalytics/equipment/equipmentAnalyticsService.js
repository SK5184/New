export function calculateDowntimePercentage(totalHours, downtimeHours) {
  if (totalHours <= 0) return 0;
  return (downtimeHours / totalHours) * 100;
}