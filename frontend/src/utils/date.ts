const pad = (value: number) => value.toString().padStart(2, '0');

export const formatDateToYMD = (date: Date) => {
  const year = date.getFullYear();
  return `${year}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const parseDateFromInput = (value: string) => {
  if (!value) {
    return new Date();
  }

  const normalized = value.includes('T') ? value.split('T')[0] : value;

  const [yearStr, monthStr, dayStr] = normalized.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return new Date(value);
  }

  return new Date(year, month - 1, day);
};

