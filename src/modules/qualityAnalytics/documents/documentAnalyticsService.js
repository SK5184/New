export function getDocumentStats(docsList) {
  return {
    total: docsList.length,
    underReview: docsList.filter(d => d.status === "Under Review").length
  };
}