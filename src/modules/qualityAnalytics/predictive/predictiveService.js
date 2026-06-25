export function forecastStockout(currentStock, consumptionRate) {
  if (consumptionRate <= 0) return 999;
  return currentStock / consumptionRate;
}