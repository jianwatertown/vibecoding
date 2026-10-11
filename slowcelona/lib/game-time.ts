/** Derive arrival from the Sheet's 12-hour game-time range, e.g. 8–10 PM Pacific. */
export function arrivalTime(time?: string): string | null {
  if (!time) return null;
  const match = time.trim().match(/^(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)?\s*[–—-]\s*(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)\s*(.*)$/i);
  if (!match) return null;
  const hour = Number(match[1]);
  if (hour < 1 || hour > 12 || Number(match[4]) < 1 || Number(match[4]) > 12) return null;
  const period = (match[3] || match[6]).toUpperCase();
  const start = (hour % 12) * 60 + Number(match[2] || 0) + (period === 'PM' ? 720 : 0);
  const arrival = (start - 30 + 1440) % 1440;
  const h = Math.floor(arrival / 60);
  const minutes = String(arrival % 60).padStart(2, '0');
  return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}${match[7] ? ` ${match[7]}` : ''}${start < 30 ? ' (previous day)' : ''}`;
}
