import { useState } from 'react';
import YearRangePicker from './YearRangePicker';
import MonthRangePicker from './MonthRangePicker';
import DayRangePicker from './DayRangePicker';

export type TimeUnit = 'YEAR' | 'MONTH' | 'DAY';

export interface DateRangeState {
  unit: TimeUnit;
  // 연 단위
  startYear: number;
  endYear: number;
  // 월 단위  
  monthStartYear: number;
  monthStartMonth: number;
  monthEndYear: number;
  monthEndMonth: number;
  // 일 단위
  dayStart: Date;
  dayEnd: Date;
}

interface DateRangePickerProps {
  initialState: DateRangeState;
  onApply: (state: DateRangeState) => void;
  onReset: () => void;
  maxYears?: number;   // YEAR: 최대 N년
  maxMonths?: number;  // MONTH: 최대 N개월
  maxDays?: number;    // DAY: 최대 N일
}

export default function DateRangePicker({
  initialState,
  onApply,
  onReset,
  maxYears = 10,
  maxMonths = 12,
  maxDays = 15,
}: DateRangePickerProps) {
  const [unit, setUnit] = useState<TimeUnit>(initialState.unit);
  const [state, setState] = useState<DateRangeState>(initialState);

  // YEAR 범위 보정
  const clampEndYear = (start: number, end: number) => {
    const maxEnd = start + (maxYears - 1);
    return Math.min(Math.max(end, start), maxEnd);
  };

  const handleApply = () => {
    onApply({ ...state, unit });
  };

  const handleReset = () => {
    onReset();
  };

  // 포맷팅 함수들
  const formatYearRange = () => {
    return `${state.startYear}년 ~ ${state.endYear}년`;
  };

  const formatMonthRange = () => {
    if (state.monthStartYear === state.monthEndYear) {
      return `${state.monthStartYear}년 ${state.monthStartMonth}월 ~ ${state.monthEndMonth}월`;
    }
    return `${state.monthStartYear}년 ${state.monthStartMonth}월 ~ ${state.monthEndYear}년 ${state.monthEndMonth}월`;
  };

  const formatDayRange = () => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return `${formatDate(state.dayStart)} ~ ${formatDate(state.dayEnd)}`;
  };

  return (
    <div className="w-full">
      {/* 단위 선택 라디오 버튼 */}
      <div className="flex gap-4 mb-4 pb-3 border-b border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="unit"
            checked={unit === 'YEAR'}
            onChange={() => setUnit('YEAR')}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">연 단위</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="unit"
            checked={unit === 'MONTH'}
            onChange={() => setUnit('MONTH')}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">월 단위</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="unit"
            checked={unit === 'DAY'}
            onChange={() => setUnit('DAY')}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">일 단위</span>
        </label>
      </div>

      {/* 선택된 단위에 따라 다른 Picker 표시 */}
      <div className="mb-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {unit === 'YEAR' && (
          <YearRangePicker
            startYear={state.startYear}
            endYear={state.endYear}
            maxYears={maxYears}
            onStartYearChange={(year) =>
              setState((prev) => ({
                ...prev,
                startYear: year,
                endYear: clampEndYear(year, prev.endYear),
              }))
            }
            onEndYearChange={(year) =>
              setState((prev) => ({
                ...prev,
                endYear: clampEndYear(prev.startYear, year),
              }))
            }
          />
        )}

        {unit === 'MONTH' && (
          <MonthRangePicker
            startYear={state.monthStartYear}
            startMonth={state.monthStartMonth}
            endYear={state.monthEndYear}
            endMonth={state.monthEndMonth}
            maxMonths={maxMonths}
            onStartChange={(year, month) =>
              setState({ ...state, monthStartYear: year, monthStartMonth: month })
            }
            onEndChange={(year, month) =>
              setState({ ...state, monthEndYear: year, monthEndMonth: month })
            }
          />
        )}

        {unit === 'DAY' && (
          <DayRangePicker
            startDate={state.dayStart}
            endDate={state.dayEnd}
            maxDays={maxDays}
            onRangeChange={(start, end) =>
              setState({ ...state, dayStart: start, dayEnd: end })
            }
          />
        )}
      </div>

      {/* 적용/초기화 버튼 */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={handleApply}
          className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          적용
        </button>
        <button
          onClick={handleReset}
          className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
        >
          초기화
        </button>
      </div>
    </div>
  );
}

// 선택된 범위를 문자열로 표시하는 유틸 함수 (export)
export const formatDateRange = (state: DateRangeState): string => {
  if (state.unit === 'YEAR') {
    // 동일한 년도 선택 시 "~" 없이 표시
    if (state.startYear === state.endYear) {
      return `${state.startYear}년`;
    }
    return `${state.startYear}년 ~ ${state.endYear}년`;
  }
  
  if (state.unit === 'MONTH') {
    // 동일한 년/월 선택 시 "~" 없이 표시
    if (state.monthStartYear === state.monthEndYear && state.monthStartMonth === state.monthEndMonth) {
      return `${state.monthStartYear}년 ${state.monthStartMonth}월`;
    }
    // 같은 년도 내에서 다른 월 선택
    if (state.monthStartYear === state.monthEndYear) {
      return `${state.monthStartYear}년 ${state.monthStartMonth}월 ~ ${state.monthEndMonth}월`;
    }
    return `${state.monthStartYear}년 ${state.monthStartMonth}월 ~ ${state.monthEndYear}년 ${state.monthEndMonth}월`;
  }
  
  if (state.unit === 'DAY') {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1);
      const day = String(date.getDate());
      return `${year}년 ${month}월 ${day}일`;
    };
    
    // 동일한 날짜 선택 시 "~" 없이 표시
    const startStr = state.dayStart.toDateString();
    const endStr = state.dayEnd.toDateString();
    if (startStr === endStr) {
      return formatDate(state.dayStart);
    }
    
    return `${formatDate(state.dayStart)} ~ ${formatDate(state.dayEnd)}`;
  }
  
  return '기간 선택';
};

