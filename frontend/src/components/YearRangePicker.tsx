import { useState } from 'react';

interface YearRangePickerProps {
  startYear: number;
  endYear: number;
  onStartYearChange: (year: number) => void;
  onEndYearChange: (year: number) => void;
  maxYears?: number;
}

export default function YearRangePicker({
  startYear,
  endYear,
  onStartYearChange,
  onEndYearChange,
  maxYears = 10,
}: YearRangePickerProps) {
  const currentYear = new Date().getFullYear();
  
  // 2020년부터 현재 연도까지
  const years = Array.from(
    { length: currentYear - 2020 + 1 },
    (_, i) => 2020 + i
  );

  const maxEndYear = startYear + (maxYears - 1);

  return (
    <div className="space-y-3">
      {/* 시작 연도 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          시작 연도
        </label>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
          {years.map((year) => (
            <button
              key={`start-${year}`}
              onClick={() => onStartYearChange(year)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded border transition-all
                ${
                  startYear === year
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* 종료 연도 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          종료 연도
        </label>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
          {years.map((year) => (
            <button
              key={`end-${year}`}
              onClick={() => onEndYearChange(year)}
              disabled={year < startYear || year > maxEndYear}
              className={`
                px-3 py-1.5 text-sm font-medium rounded border transition-all
                ${
                  endYear === year
                    ? 'bg-blue-600 text-white border-blue-600'
                    : year < startYear || year > maxEndYear
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* 선택된 범위 표시 */}
      <div className="text-xs text-gray-600 text-center bg-gray-50 p-1.5 rounded">
        선택: {startYear}년 ~ {endYear}년
      </div>
    </div>
  );
}

