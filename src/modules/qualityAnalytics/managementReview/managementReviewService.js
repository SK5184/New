export function compileAgendaText(stats) {
  return `Management Review Agenda: ${stats.ncrCount} NCRs registered, ${stats.capaCount} CAPAs resolved.`;
}