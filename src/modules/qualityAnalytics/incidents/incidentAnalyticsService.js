export function aggregateIncidents(incidentsList) {
  return {
    total: incidentsList.length,
    nearMiss: incidentsList.filter(i => i.type === "Near Miss").length
  };
}