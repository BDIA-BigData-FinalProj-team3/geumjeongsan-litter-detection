import React, { useState } from 'react';

interface DayRangePickerProps {
  startDate: Date;
  endDate: Date;
  onRangeChange: (start: Date, end: Date) => void;
}

export default function DayRangePicker({
  startDate,
  endDate,
  onRangeChange,
}: DayRangePickerProps) {
  // 시작일과 종료일의 연/월 상태
  const [startYearMonth, setStartYearMonth] = useState({
    year: startDate.getFullYear(),
    month: startDate.getMonth() + 1, // 1-12
  });

  const [endYearMonth, setEndYearMonth] = useState({
    year: endDate.getFullYear(),
    month: endDate.getMonth() + 1, // 1-12
  });

  // 해당 월의 총 일수
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // 해당 월 1일의 요일 (0: 일요일 ~ 6: 토요일)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  // 날짜 비활성화 체크
  const isDisabled = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 오늘은 포함
    return date > today;
  };

  // 포맷팅
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 시작일 선택
  const handleStartDateChange = (day: number) => {
    const newStart = new Date(startYearMonth.year, startYearMonth.month - 1, day);
    if (newStart > endDate) {
      onRangeChange(newStart, newStart);
    } else {
      onRangeChange(newStart, endDate);
    }
  };

  // 종료일 선택
  const handleEndDateChange = (day: number) => {
    const newEnd = new Date(endYearMonth.year, endYearMonth.month - 1, day);
    if (newEnd < startDate) {
      onRangeChange(newEnd, newEnd);
    } else {
      onRangeChange(startDate, newEnd);
    }
  };

  // 연/월 네비게이션 (시작)
  const handleStartPrevMonth = () => {
    if (startYearMonth.month === 1) {
      setStartYearMonth({ year: startYearMonth.year - 1, month: 12 });
    } else {
      setStartYearMonth({ ...startYearMonth, month: startYearMonth.month - 1 });
    }
  };

  const handleStartNextMonth = () => {
    const today = new Date();
    if (
      startYearMonth.year === today.getFullYear() &&
      startYearMonth.month >= today.getMonth() + 1
    ) return;

    if (startYearMonth.month === 12) {
      setStartYearMonth({ year: startYearMonth.year + 1, month: 1 });
    } else {
      setStartYearMonth({ ...startYearMonth, month: startYearMonth.month + 1 });
    }
  };

  // 연/월 네비게이션 (종료)
  const handleEndPrevMonth = () => {
    if (endYearMonth.month === 1) {
      setEndYearMonth({ year: endYearMonth.year - 1, month: 12 });
    } else {
      setEndYearMonth({ ...endYearMonth, month: endYearMonth.month - 1 });
    }
  };

  const handleEndNextMonth = () => {
    const today = new Date();
    if (
      endYearMonth.year === today.getFullYear() &&
      endYearMonth.month >= today.getMonth() + 1
    ) return;

    if (endYearMonth.month === 12) {
      setEndYearMonth({ year: endYearMonth.year + 1, month: 1 });
    } else {
      setEndYearMonth({ ...endYearMonth, month: endYearMonth.month + 1 });
    }
  };

  // 달력 그리드 렌더링 함수
  const renderCalendar = (
    year: number,
    month: number,
    selectedDate: Date,
    onSelect: (day: number) => void
  ) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    // 빈 칸 + 실제 날짜
    const calendarCells = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
      <>
        {/* 요일 헤더 */}
        <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div
              key={day}
              className={`text-center text-xs font-medium ${
                idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {calendarCells.map((day, index) => {
            if (day === null) return <div key={`empty-${index}`} className="h-9" />;

            const disabled = isDisabled(year, month, day);
            const selected =
              selectedDate.getFullYear() === year &&
              selectedDate.getMonth() + 1 === month &&
              selectedDate.getDate() === day;

            return (
              <button
                key={day}
                onClick={() => !disabled && onSelect(day)}
                disabled={disabled}
                className={`
                  h-9 text-xs font-medium rounded border transition-all flex items-center justify-center
                  ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : disabled
                      ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-3">
      {/* 시작일 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          시작일
        </label>

        {/* 연/월 네비게이션 */}
        <div className="flex items-center justify-between mb-2 px-4">
          <button onClick={handleStartPrevMonth} className="text-gray-600 hover:text-gray-900">
            ◀
          </button>
          <span className="font-bold text-base">
            {startYearMonth.year}년 {startYearMonth.month}월
          </span>
          <button
            onClick={handleStartNextMonth}
            disabled={
              startYearMonth.year === new Date().getFullYear() &&
              startYearMonth.month >= new Date().getMonth() + 1
            }
            className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
          >
            ▶
          </button>
        </div>

        {renderCalendar(
          startYearMonth.year,
          startYearMonth.month,
          startDate,
          handleStartDateChange
        )}
      </div>

      {/* 종료일 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          종료일
        </label>

        {/* 연/월 네비게이션 */}
        <div className="flex items-center justify-between mb-2 px-4">
          <button onClick={handleEndPrevMonth} className="text-gray-600 hover:text-gray-900">
            ◀
          </button>
          <span className="font-bold text-base">
            {endYearMonth.year}년 {endYearMonth.month}월
          </span>
          <button
            onClick={handleEndNextMonth}
            disabled={
              endYearMonth.year === new Date().getFullYear() &&
              endYearMonth.month >= new Date().getMonth() + 1
            }
            className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
          >
            ▶
          </button>
        </div>

        {renderCalendar(
          endYearMonth.year,
          endYearMonth.month,
          endDate,
          handleEndDateChange
        )}
      </div>

      {/* 선택된 범위 표시 */}
      <div className="text-xs text-gray-600 text-center bg-gray-50 p-1.5 rounded">
        선택: {formatDate(startDate)} ~ {formatDate(endDate)}
      </div>
    </div>
  );
}
