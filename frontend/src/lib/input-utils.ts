export const sanitizeDecimalInput = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole = '', ...rest] = cleaned.split('.');
  return rest.length > 0 ? `${whole}.${rest.join('')}` : whole;
};

export const sanitizeIntegerInput = (value: string) => value.replace(/\D/g, '');

export const sanitizePriceInput = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole = '', ...rest] = cleaned.split('.');
  return rest.length > 0 ? `${whole}.${rest.join('')}` : whole;
};
