import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getRecipientsByIncidentType } from '../services/api';
import { getCurrentUser } from '../services/auth';

type IncidentTypeCode = 'FIRE' | 'EMERGENCY' | 'TRASH' | 'ROCKFALL';

type Recipient = {
  recipientType?: string; // STAFF | EXTERNAL
  recipientId?: number;
  name?: string;
  department?: string;
  position?: string;
  isEnabled?: boolean;
};

export default function AssigneeSelectModal(props: {
  open: boolean;
  incidentType: IncidentTypeCode;
  title?: string;
  onClose: () => void;
  onConfirm: (assignedToId: number, assignedToName?: string) => void;
}) {
  const { open, incidentType, title, onClose, onConfirm } = props;
  const me = getCurrentUser();
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>(me?.userId ?? '');

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const list = await getRecipientsByIncidentType(incidentType);
        if (!alive) return;
        setRecipients(Array.isArray(list) ? list : []);
      } catch {
        if (!alive) return;
        setRecipients([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, incidentType]);

  const staffOptions = useMemo(() => {
    const opts = (recipients || [])
      .filter(r => (r.recipientType || '').toUpperCase() === 'STAFF')
      .filter(r => r.isEnabled !== false)
      .filter(r => typeof r.recipientId === 'number')
      .map(r => ({
        id: r.recipientId as number,
        label: `${r.name ?? '이름없음'}${r.department ? ` (${r.department})` : ''}${r.position ? ` ${r.position}` : ''}`,
      }));

    // "나"를 옵션 상단에 넣기(리스트에 없더라도 선택 가능)
    if (me?.userId) {
      const exists = opts.some(o => o.id === me.userId);
      if (!exists) {
        opts.unshift({ id: me.userId, label: `${me.name ?? '나'} (현재 접속자)` });
      }
    }
    return opts;
  }, [recipients, me?.userId, me?.name]);

  useEffect(() => {
    if (!open) return;
    // 모달 열릴 때 기본 선택: 나(있으면), 없으면 첫 옵션
    if (me?.userId) setSelectedId(me.userId);
    else if (staffOptions.length > 0) setSelectedId(staffOptions[0].id);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md shadow-xl" style={{ borderRadius: '0px' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{title ?? '처리자 선택'}</h3>
          <button onClick={onClose} className="text-gray-700 hover:text-gray-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">처리자(STAFF)</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ borderRadius: '0px' }}
              disabled={loading}
            >
              {loading && <option value="">불러오는 중...</option>}
              {!loading && staffOptions.length === 0 && <option value="">선택 가능한 STAFF가 없습니다</option>}
              {!loading && staffOptions.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">상태 변경 시 선택한 처리자가 저장됩니다.</p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            style={{ borderRadius: '0px' }}
          >
            취소
          </button>
          <button
            onClick={() => {
              if (!selectedId) return;
              const selectedName = staffOptions.find(o => o.id === selectedId)?.label;
              onConfirm(Number(selectedId), selectedName);
            }}
            className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            style={{ borderRadius: '0px' }}
            disabled={!selectedId || loading}
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}


