export const formatNumberSequence = (value: number, width = 4) =>
  String(value).padStart(width, '0');

export const buildPoNumber = (yearMonth: Date, sequence: number) => {
  const ym = `${yearMonth.getFullYear()}${String(yearMonth.getMonth() + 1).padStart(2, '0')}`;
  return `PO-${ym}-${formatNumberSequence(sequence)}`;
};

export const buildTransferNumber = (yearMonth: Date, sequence: number) => {
  const ym = `${yearMonth.getFullYear()}${String(yearMonth.getMonth() + 1).padStart(2, '0')}`;
  return `TRF-${ym}-${formatNumberSequence(sequence)}`;
};
