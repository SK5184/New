export function checkCompetencyExpiry(lastAssessmentDateString) {
  const d = new Date(lastAssessmentDateString);
  const now = new Date();
  const diffDays = Math.ceil((now - d) / (1000 * 60 * 60 * 24));
  return diffDays > 365;
}