export function formatPrice(amount: number | string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PHP",
  }).format(Number(amount));
}
