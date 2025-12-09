import { useState } from 'react';

interface MonthRangePickerProps {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  onStartChange: (year: number, month: number) => void;
  onEndChange: (year: number, month: number) => void;
}

export default function MonthRangePicker({
  startYear,
  startMonth,
  endYear,
  endMonth,
  onStartChange,
  onEndChange,
}: MonthRangePickerProps) {
  const [startYearLocal, setStartYearLocal] = useState(startYear);
  const [endYearLocal, setEndYearLocal] = useState(endYear);
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // 2020년부터 현재 연도까지
  const years = Array.from(
    { length: currentYear - 2020 + 1 },
    (_, i) => 2020 + i
  );
  
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // 미래 날짜 체크
  const isDisabled = (year: number, month: number) => {
    if (year > currentYear) return true;
    if (year === currentYear && month > currentMonth) return true;
    return false;
  };

  return (
    <div className="space-y-3">
      {/* 시작 연도/월 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          시작 기간
        </label>
        
        {/* 연도 선택 */}
        <div className="flex items-center justify-between mb-2 px-4">
          <button
            onClick={() => setStartYearLocal(Math.max(2020, startYearLocal - 1))}
            disabled={startYearLocal <= 2020}
            className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
          >
            ◀
          </button>
          <span className="font-bold text-base">{startYearLocal}년</span>
          <button
            onClick={() => setStartYearLocal(Math.min(currentYear, startYearLocal + 1))}
            disabled={startYearLocal >= currentYear}
            className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
          >
            ▶
          </button>
        </div>
        
        {/* 월 그리드 */}
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {months.map((month) => {
            const disabled = isDisabled(startYearLocal, month);
            const selected = startYearLocal === startYear && month === startMonth;
            
            return (
              <button
                key={`start-${month}`}
                onClick={() => !disabled && onStartChange(startYearLocal, month)}
                disabled={disabled}
                className={`
                  px-2 py-1.5 text-xs font-medium rounded border transition-all
                  ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : disabled
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {month}월
              </button>
            );
          })}
        </div>
      </div>

      {/* 종료 연도/월 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          종료 기간
        </label>
        
        {/* 연도 선택 */}
        <div className="flex items-center justify-between mb-2 px-4">
          <button
            onClick={() => setEndYearLocal(Math.max(2020, endYearLocal - 1))}
            disabled={endYearLocal <= 2020}
            className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
          >
            ◀
          </button>
          <span className="font-bold text-base">{endYearLocal}년</span>
          <button
            onClick={() => setEndYearLocal(Math.min(currentYear, endYearLocal + 1))}
            disabled={endYearLocal >= currentYear}
            className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
          >
            ▶
          </button>
        </div>
        
        {/* 월 그리드 */}
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {months.map((month) => {
            const disabled = 
              isDisabled(endYearLocal, month) ||
              (endYearLocal === startYear && month < startMonth) ||
              endYearLocal < startYear;
            const selected = endYearLocal === endYear && month === endMonth;
            
            return (
              <button
                key={`end-${month}`}
                onClick={() => !disabled && onEndChange(endYearLocal, month)}
                disabled={disabled}
                className={`
                  px-2 py-1.5 text-xs font-medium rounded border transition-all
                  ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : disabled
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {month}월
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 범위 표시 */}
      <div className="text-xs text-gray-600 text-center bg-gray-50 p-1.5 rounded">
        {startYear === endYear 
          ? `선택: ${startYear}년 ${startMonth}월 ~ ${endMonth}월`
          : `선택: ${startYear}년 ${startMonth}월 ~ ${endYear}년 ${endMonth}월`
        }
      </div>
    </div>
  );
}

