// Time utilities (KST / Asia-Seoul)
// - Backend often sends "yyyy-MM-dd HH:mm" (no timezone). Treat it as KST.
// - For datetime-local inputs, convert to ISO with +09:00 to avoid UTC shifts.

export const KST_TZ = 'Asia/Seoul';

/**
 * Parse backend time strings into a Date object.
 * Supports:
 * - ISO strings with offset / Z
 * - "YYYY-MM-DD HH:mm" (treated as KST)
 * - "YYYY-MM-DDTHH:mm" (datetime-local, treated as KST)
 */
export function parseKstDateTime(input?: string | null): Date | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  // ISO (includes timezone or Z)
  if (s.includes('T') && (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s))) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "YYYY-MM-DD HH:mm" -> "YYYY-MM-DDTHH:mm:00+09:00"
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(s)) {
    const iso = s.replace(' ', 'T') + ':00+09:00';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "YYYY-MM-DDTHH:mm" (datetime-local) -> "+09:00"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
    const iso = s + ':00+09:00';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Fallback: let browser parse
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toKstTimestampMs(input?: string | null): number | null {
  const d = parseKstDateTime(input);
  return d ? d.getTime() : null;
}

/**
 * Convert datetime-local value ("YYYY-MM-DDTHH:mm") to ISO with +09:00.
 */
export function localDateTimeToKstIso(input: string): string {
  const s = (input || '').trim();
  if (!s) return '';
  // If already contains timezone, return as-is.
  if (s.includes('T') && (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s))) return s;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s + ':00+09:00';
  // "YYYY-MM-DD HH:mm"
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(s)) return s.replace(' ', 'T') + ':00+09:00';
  return s;
}

export function nowKstDateTimeLocal(): string {
  // Returns "YYYY-MM-DDTHH:mm" in KST
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: KST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function nowKstDate(): string {
  // Returns "YYYY-MM-DD" in KST
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: KST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function formatKstDate(date: Date): string {
  // Returns "YYYY-MM-DD" for a given Date interpreted in KST
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: KST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}


