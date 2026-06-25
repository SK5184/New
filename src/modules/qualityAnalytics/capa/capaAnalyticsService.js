export function checkOverdue(targetDateString) {
  const t = new Date(targetDateString);
  const now = new Date();
  return t < now;
}