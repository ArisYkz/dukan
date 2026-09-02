export const MAX_ADDRESS_LENGTH = 250;

export function buildFullAddress(form: { city: string; zip: string; street: string; house: string }): string {
  return `${form.city}, ${form.zip ? `ZIP ${form.zip}, ` : ""}${form.street}${form.house ? `, ${form.house}` : ""}`;
}

export function isAddressTooLong(address: string): boolean {
  return address.length > MAX_ADDRESS_LENGTH;
}
