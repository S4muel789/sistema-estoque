export function normalizeCategory(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|[\s/-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('pt-BR'));
}

export function inventoryKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

export function normalizeProductName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}
