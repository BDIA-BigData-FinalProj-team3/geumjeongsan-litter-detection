export type IncidentTypeEnum = 'FIRE' | 'TRASH' | 'EMERGENCY' | 'ROCKFALL';
export type IncidentStatusEnum = 'RESOLVED' | 'IN_PROGRESS' | 'PENDING' | 'UNKNOWN';
export type SeverityEnum = 'HIGH' | 'MEDIUM' | 'LOW';
export type SourceTypeEnum = 'AUTO' | 'MANUAL' | 'MIXED';

export const safePct = (numerator: number, denominator: number): number => {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
};

const typeToKo: Record<IncidentTypeEnum, string> = {
  FIRE: '화재',
  TRASH: '쓰레기',
  EMERGENCY: '응급',
  ROCKFALL: '낙석',
};

const statusToKo: Record<IncidentStatusEnum, string> = {
  RESOLVED: '처리완료',
  IN_PROGRESS: '진행중',
  PENDING: '대기중',
  UNKNOWN: '미정',
};

const severityToKo: Record<SeverityEnum, string> = {
  HIGH: '상',
  MEDIUM: '중',
  LOW: '하',
};

const sourceToKo: Record<SourceTypeEnum, string> = {
  AUTO: 'AI',
  MANUAL: '신고',
  MIXED: '혼합',
};

export const labelIncidentType = (v?: IncidentTypeEnum | string) =>
  typeToKo[normalizeIncidentType(v)] ?? String(v ?? '');

export const labelIncidentStatus = (v?: IncidentStatusEnum | string) =>
  statusToKo[normalizeIncidentStatus(v)] ?? String(v ?? '');

export const labelSeverity = (v?: SeverityEnum | string) =>
  severityToKo[normalizeSeverity(v)] ?? String(v ?? '');

export const labelSourceType = (v?: SourceTypeEnum | string) =>
  sourceToKo[normalizeSourceType(v)] ?? String(v ?? '');

export const normalizeIncidentType = (v?: string): IncidentTypeEnum => {
  const s = (v ?? '').toUpperCase().trim();
  if (s === 'FIRE' || s === '화재') return 'FIRE';
  if (s === 'TRASH' || s === '쓰레기') return 'TRASH';
  if (s === 'EMERGENCY' || s === '응급') return 'EMERGENCY';
  if (s === 'ROCKFALL' || s === '낙석') return 'ROCKFALL';
  // fallback
  return 'FIRE';
};

export const normalizeIncidentStatus = (v?: string): IncidentStatusEnum => {
  const s = (v ?? '').toUpperCase().trim();
  if (s === 'RESOLVED' || s === '완료' || s === '처리완료') return 'RESOLVED';
  if (s === 'IN_PROGRESS' || s === '진행중') return 'IN_PROGRESS';
  if (s === 'PENDING' || s === '대기' || s === '대기중') return 'PENDING';
  return 'UNKNOWN';
};

export const normalizeSeverity = (v?: string): SeverityEnum => {
  const s = (v ?? '').toUpperCase().trim();
  if (s === 'HIGH' || s === '상') return 'HIGH';
  if (s === 'MEDIUM' || s === '중') return 'MEDIUM';
  if (s === 'LOW' || s === '하') return 'LOW';
  return 'MEDIUM';
};

export const normalizeSourceType = (v?: string): SourceTypeEnum => {
  const s = (v ?? '').toUpperCase().trim();
  if (s === 'AUTO' || s === 'AI') return 'AUTO';
  if (s === 'MANUAL' || s === '신고') return 'MANUAL';
  if (s === 'MIXED' || s === '혼합') return 'MIXED';
  return 'MANUAL';
};

export const normalizeDateToInput = (v?: string): string => {
  if (!v) return '';
  // '2025-12-01T12:34:56' -> '2025-12-01'
  return v.length >= 10 ? v.slice(0, 10) : v;
};

