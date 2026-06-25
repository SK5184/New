export function parseNCRData(ncrsList) {
  return {
    total: ncrsList.length,
    open: ncrsList.filter(n => n.status === "Open").length
  };
}