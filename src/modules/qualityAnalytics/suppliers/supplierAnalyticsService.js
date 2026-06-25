export function calculateVendorScore(ontimeDeliveries, totalDeliveries) {
  if (totalDeliveries <= 0) return 100;
  return (ontimeDeliveries / totalDeliveries) * 100;
}