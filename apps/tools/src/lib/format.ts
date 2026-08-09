// Shared by BuildTree and ShoppingList - both render the same resolved
// build plan data in different shapes.
export function formatIsk(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ISK`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
