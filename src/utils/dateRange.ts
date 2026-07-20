export function expandDateRange(fromDate: string, toDate: string): string[] {
  const [y1, m1, d1] = fromDate.split("-").map(Number);
  const [y2, m2, d2] = toDate.split("-").map(Number);
  const current = new Date(Date.UTC(y1, m1 - 1, d1));
  const end = new Date(Date.UTC(y2, m2 - 1, d2));
  const dates: string[] = [];

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export function isDateInRange(date: string, fromDate?: string, toDate?: string): boolean {
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}
