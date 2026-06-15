export const sanitizeSkuPart = (
  input: string,
  maxLength: number,
  fallback: string,
) => {
  const normalized = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const trimmed = normalized.slice(0, maxLength);
  return trimmed || fallback;
};

export const formatSkuSequence = (value: number) =>
  String(value).padStart(3, '0');

export const buildVariantSizeCode = (sizeLabel: string) =>
  sanitizeSkuPart(sizeLabel, 6, 'SIZE');
