import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import HamburgerMenuButton from '../components/HamburgerMenuButton';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { getDailyStats, getAllMonthlyData, getAvgResponseTime, getCCTVSummary, getIncidentStats, getCctvUptime, getModelAccuracy, getResponseTime, type StatsOverviewResponse, type CctvUptimePoint, type ModelAccuracyPoint, type ResponseTimeOverview } from '../services/api';
import { cctvSummary } from '../services/common';
import DateRangePicker, { DateRangeState, formatDateRange } from '../components/DateRangePicker';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null); // 클릭한 구간
  
  // 기본 날짜 범위 상태
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [dateRange, setDateRange] = useState<DateRangeState>({
    unit: 'MONTH',
    startYear: currentYear,
    endYear: currentYear,
    monthStartYear: currentYear,
    monthStartMonth: 1,
    monthEndYear: currentYear,
    monthEndMonth: currentMonth,
    dayStart: new Date(currentYear, currentMonth - 1, 1),
    dayEnd: new Date(),
  });

  // 데이터 상태 관리
  const [dailyStats, setDailyStats] = useState<Array<{ label: string; value: string }>>([]);
  const [dailyStatsModel, setDailyStatsModel] = useState<Array<{ label: string; value: string }>>([]);
  const [allMonthlyData, setAllMonthlyData] = useState<Array<{ 
    year: number; 
    month: number; 
    monthLabel: string; 
    쓰레기: number; 
    화재: number; 
    응급: number; 
    기타: number; 
    쓰레기_모델: number;
    화재_모델: number;
    응급_모델: number;
    기타_모델: number;
    처리완료: number; 
    미완료: number; 
    cctvOn: number; 
    cctvOff: number;
  }>>([]);
  const [avgResponseTime, setAvgResponseTime] = useState<Array<{ type: string; time: number; change: number; isIncrease: boolean }>>([]);
  const [aiAccuracy, setAiAccuracy] = useState<Array<{ type: string; detected: number; correct: number; color?: string }>>([]);
  const [incidentStats, setIncidentStats] = useState<StatsOverviewResponse | null>(null);
  const [cctvUptime, setCctvUptime] = useState<CctvUptimePoint[]>([]);
  const [modelAccuracy, setModelAccuracy] = useState<ModelAccuracyPoint[]>([]);

  // dateRange → API 파라미터 변환 함수
  const convertDateRangeToApi = (dateRange: DateRangeState): { unit: 'DAY' | 'MONTH' | 'YEAR'; from: string; to: string } => {
    let unit: 'DAY' | 'MONTH' | 'YEAR' = dateRange.unit;
    let from: string, to: string;

    if (unit === 'YEAR') {
      from = `${dateRange.startYear}-01-01`;
      to = `${dateRange.endYear}-12-31`;
    } else if (unit === 'MONTH') {
      const startMonth = String(dateRange.monthStartMonth).padStart(2, '0');
      const endMonth = String(dateRange.monthEndMonth).padStart(2, '0');
      // 월의 첫날과 마지막날 계산
      const startDate = new Date(dateRange.monthStartYear, dateRange.monthStartMonth - 1, 1);
      const endDate = new Date(dateRange.monthEndYear, dateRange.monthEndMonth, 0); // 다음 달 0일 = 이번 달 마지막날
      from = startDate.toISOString().slice(0, 10);
      to = endDate.toISOString().slice(0, 10);
    } else { // DAY
      from = dateRange.dayStart.toISOString().slice(0, 10);
      to = dateRange.dayEnd.toISOString().slice(0, 10);
    }

    return { unit, from, to };
  };

  // API에서 데이터 로드 (기간 선택에 따라 재로드)
  useEffect(() => {
    const loadDashboardData = async () => {
      // dateRange에서 기간 파라미터 추출 (기존 API용 - getDailyStats 등)
      let start: string | undefined;
      let end: string | undefined;
      
      if (dateRange.unit === 'MONTH') {
        const startMonth = String(dateRange.monthStartMonth).padStart(2, '0');
        const endMonth = String(dateRange.monthEndMonth).padStart(2, '0');
        start = `${dateRange.monthStartYear}-${startMonth}`;
        end = `${dateRange.monthEndYear}-${endMonth}`;
      } else if (dateRange.unit === 'YEAR') {
        start = `${dateRange.startYear}-01`;
        end = `${dateRange.endYear}-12`;
      } else if (dateRange.unit === 'DAY') {
        // 일 단위는 시작일과 종료일의 연월을 사용
        const startDate = dateRange.dayStart;
        const endDate = dateRange.dayEnd;
        const startYear = startDate.getFullYear();
        const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
        const endYear = endDate.getFullYear();
        const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
        start = `${startYear}-${startMonth}`;
        end = `${endYear}-${endMonth}`;
      }

      // 새 API 호출 (통계 VIEW 기반)
      const { unit, from, to } = convertDateRangeToApi(dateRange);
      
      // Promise.allSettled를 사용하여 일부 API가 실패해도 나머지는 처리
      const results = await Promise.allSettled([
        getIncidentStats(unit, from, to),
        getCctvUptime(unit, from, to),
        getModelAccuracy(unit, from, to),
        getResponseTime(unit, from, to),
        getDailyStats(),
      ]);
      
      // 각 결과 처리 (실패한 경우 기본값 사용)
      const statsData = results[0].status === 'fulfilled' ? results[0].value : null;
      const uptimeData = results[1].status === 'fulfilled' ? results[1].value : [];
      const modelAccData = results[2].status === 'fulfilled' ? results[2].value : [];
      const responseTimeOverview = results[3].status === 'fulfilled' ? results[3].value : { items: [] };
      const daily = results[4].status === 'fulfilled' ? results[4].value : [];
      
      // 실패한 API 로깅
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const apiNames = ['getIncidentStats', 'getCctvUptime', 'getModelAccuracy', 'getResponseTime', 'getDailyStats'];
          console.error(`❌ [Stats] Failed to load ${apiNames[index]}:`, result.reason);
        }
      });
      
      setIncidentStats(statsData);
      setCctvUptime(uptimeData || []);
      setModelAccuracy(modelAccData || []);
      
      setDailyStats(daily || []);

      // ===== 상단 당일 카드 오른쪽 "AI 탐지"를 실제 DB 기반으로 설정 =====
      try {
        // 오늘 날짜 기준으로 view_stats_daily_incident_type에서 AUTO 건수 조회
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'
        const todayStats = await getIncidentStats('DAY', todayStr, todayStr);

        let fireAuto = 0;
        let emergencyAuto = 0;
        let trashAuto = 0;

        if (todayStats && todayStats.typeSummary && todayStats.typeSummary.length > 0) {
          const tsList = todayStats.typeSummary;
          fireAuto = tsList
            .filter(ts => ts.incidentType === 'FIRE')
            .reduce((sum, ts) => sum + ts.autoIncidents, 0);
          emergencyAuto = tsList
            .filter(ts => ts.incidentType === 'EMERGENCY')
            .reduce((sum, ts) => sum + ts.autoIncidents, 0);
          trashAuto = tsList
            .filter(ts => ts.incidentType === 'TRASH')
            .reduce((sum, ts) => sum + ts.autoIncidents, 0);
        }

        const dailyModel = (daily || []).map(stat => {
          const isCCTV = stat.label.toLowerCase().includes('cctv') || stat.label.includes('가동');
          if (isCCTV) {
            // CCTV 카드는 오른쪽 "낙석 사고"가 아직 기획 단계라 AI 탐지 수는 사용하지 않음
            return stat;
          }

          let autoCount = 0;
          if (stat.label.includes('화재')) {
            autoCount = fireAuto;
          } else if (stat.label.includes('응급')) {
            autoCount = emergencyAuto;
          } else if (stat.label.includes('쓰레기')) {
            autoCount = trashAuto;
          }

          return {
            label: stat.label,
            value: `${autoCount}건`,
          };
        });

        setDailyStatsModel(dailyModel);
      } catch (error) {
        console.error('❌ [Stats] Failed to load today AI counts for daily cards:', error);
        // 실패 시 기존 dailyStatsModel은 그대로 두거나, 0으로 초기화 가능
        const fallbackModel = (daily || []).map(stat => ({
          label: stat.label,
          value: stat.value,
        }));
        setDailyStatsModel(fallbackModel);
      }
      
      // 새 API 응답을 기존 allMonthlyData 형식으로 변환 (하위 호환성 유지)
      if (statsData && statsData.trend.length > 0) {
        // trend 데이터를 기존 monthly 형식으로 변환
        const convertedMonthly = statsData.trend.map(point => {
          const date = new Date(point.period);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const monthLabel = unit === 'YEAR' ? `${year}년` : unit === 'MONTH' ? `${month}월` : `${month}/${date.getDate()}`;
          
          // typeSummary에서 해당 기간의 데이터 찾기
          const periodTypeSummary = statsData.typeSummary.filter(ts => {
            const tsDate = new Date(ts.incidentType === 'TRASH' ? point.period : point.period); // 간단화
            return tsDate.toISOString().slice(0, 10) === point.period;
          });
          
          // 유형별 합계 계산
          const trash = point.trash;
          const fire = point.fire;
          const emergency = point.emergency;
          const 기타 = point.total - trash - fire - emergency;
          
          // AI 탐지 수는 typeSummary에서 가져오기
          const trashModel = periodTypeSummary.find(ts => ts.incidentType === 'TRASH')?.autoIncidents || Math.floor(trash * 0.75);
          const fireModel = periodTypeSummary.find(ts => ts.incidentType === 'FIRE')?.autoIncidents || Math.floor(fire * 0.75);
          const emergencyModel = periodTypeSummary.find(ts => ts.incidentType === 'EMERGENCY')?.autoIncidents || Math.floor(emergency * 0.75);
          const 기타_모델 = Math.floor(기타 * 0.75);
          
          // 처리완료/미완료는 completionSummary에서 가져오기 (전체 기간 합계이므로 비율로 분배)
          const totalResolved = statsData.completionSummary.resolved;
          const totalUnresolved = statsData.completionSummary.unresolved;
          const totalAll = totalResolved + totalUnresolved;
          const periodRatio = point.total / (statsData.trend.reduce((sum, p) => sum + p.total, 0) || 1);
          const 처리완료 = Math.round(totalResolved * periodRatio);
          const 미완료 = Math.round(totalUnresolved * periodRatio);
          
          return {
            year,
            month,
            monthLabel,
            쓰레기: trash,
            화재: fire,
            응급: emergency,
            기타,
            쓰레기_모델: trashModel,
            화재_모델: fireModel,
            응급_모델: emergencyModel,
            기타_모델,
            처리완료,
            미완료,
            cctvOn: 0, // CCTV는 별도 API에서 가져와야 함
            cctvOff: 0,
          };
        });
        setAllMonthlyData(convertedMonthly);
      } else {
        // 데이터가 없으면 빈 배열
        setAllMonthlyData([]);
      }
      
      // 평균 대응시간 설정 (view_stats_daily_response_time 기반)
      if (responseTimeOverview && responseTimeOverview.items && responseTimeOverview.items.length > 0) {
        setAvgResponseTime(responseTimeOverview.items);
      } else {
        setAvgResponseTime([]);
      }
      
      // AI 모델 정확도 설정 (view_stats_model_accuracy_daily 기반, 새 VIEW/API 전용)
      const INCIDENT_TYPE_LABEL: Record<string, string> = {
        FIRE: '화재',
        EMERGENCY: '응급',
        TRASH: '쓰레기',
      };

      if (modelAccData && modelAccData.length > 0) {
        // 기간 전체 기준으로 유형별 합계 계산
        const byType = new Map<string, { detected: number; correct: number }>();

        modelAccData.forEach(point => {
          const label = INCIDENT_TYPE_LABEL[point.incidentType] || point.incidentType;
          const prev = byType.get(label) || { detected: 0, correct: 0 };

          // 전체 AUTO 탐지 건수 = detected
          prev.detected += point.totalAutoIncidents;
          // 정탐 건수 = trueIncidents
          prev.correct += point.trueIncidents;

          byType.set(label, prev);
        });

        const aggregated = Array.from(byType.entries()).map(([type, value]) => ({
          type,
          detected: value.detected,
          correct: value.correct,
        }));

        const withColor = aggregated.map(item => ({
          ...item,
          color:
            item.type === '화재' ? '#DC2626' :
            item.type === '응급' ? '#7C2D3B' :
            item.type === '쓰레기' ? '#5B7C99' : '#4A5568',
        }));

        setAiAccuracy(withColor);
      } else {
        // 새 VIEW/API에서도 데이터가 전혀 없을 때만 기본값
        setAiAccuracy([
          { type: '화재', detected: 120, correct: 110, color: '#DC2626' },
          { type: '응급', detected: 85, correct: 75, color: '#7C2D3B' },
          { type: '쓰레기', detected: 200, correct: 175, color: '#5B7C99' }
        ]);
      }
    };
    
    loadDashboardData();
  }, [dateRange]);

  // 기간 필터링 함수 (새 API 응답 기반)
  const getFilteredData = () => {
    // 새 API 응답이 없으면 기본값 반환
    if (!incidentStats || !incidentStats.trend || incidentStats.trend.length === 0) {
      return {
        accidentRatio: [
          { name: '응급', value: 0, color: '#7C2D3B' },
          { name: '화재', value: 0, color: '#E87C7C' },
          { name: '쓰레기', value: 0, color: '#5B7C99' },
          { name: '기타', value: 0, color: '#4A5568' },
        ],
        accidentRatioModel: [
          { name: '응급', value: 0, color: '#7C2D3B' },
          { name: '화재', value: 0, color: '#E87C7C' },
          { name: '쓰레기', value: 0, color: '#5B7C99' },
          { name: '기타', value: 0, color: '#4A5568' },
        ],
        completionRatio: [
          { name: '처리 완료', value: 0, color: '#4A90A4' },
          { name: '미완료', value: 0, color: '#E5E7EB' },
        ],
        monthlyTrend: [],
        monthlyTrendModel: [],
        cctvOperationRate: (() => {
          // CCTV 가동률 계산 (view_stats_daily_cctv_uptime 기반)
          if (cctvUptime && cctvUptime.length > 0) {
            // 선택된 기간 전체에 대한 평균 가동률 계산
            const avgUptimePct = cctvUptime.reduce((sum, point) => sum + point.uptimePct, 0) / cctvUptime.length;
            // 평균 ON/OFF 샘플 수 계산
            const avgOnSamples = Math.round(cctvUptime.reduce((sum, point) => sum + point.onSamples, 0) / cctvUptime.length);
            const avgOffSamples = Math.round(cctvUptime.reduce((sum, point) => sum + point.offSamples, 0) / cctvUptime.length);
            
            return [
              { status: 'ON', value: avgOnSamples, color: '#3B82F6' },
              { status: 'OFF', value: avgOffSamples, color: '#E5E7EB' },
            ];
          } else {
            // 데이터가 없으면 기본값
            return [
              { status: 'ON', value: 0, color: '#3B82F6' },
              { status: 'OFF', value: 0, color: '#E5E7EB' },
            ];
          }
        })(),
      };
    }

    // 새 API 응답에서 데이터 추출
    const { trend, typeSummary, completionSummary } = incidentStats;

    // 사고 비율 계산 (전체 기간 합계)
    const total응급 = typeSummary.filter(ts => ts.incidentType === 'EMERGENCY').reduce((sum, ts) => sum + ts.totalIncidents, 0);
    const total화재 = typeSummary.filter(ts => ts.incidentType === 'FIRE').reduce((sum, ts) => sum + ts.totalIncidents, 0);
    const total쓰레기 = typeSummary.filter(ts => ts.incidentType === 'TRASH').reduce((sum, ts) => sum + ts.totalIncidents, 0);
    const total기타 = typeSummary.filter(ts => !['EMERGENCY', 'FIRE', 'TRASH'].includes(ts.incidentType)).reduce((sum, ts) => sum + ts.totalIncidents, 0);

    // AI 탐지 비율 계산
    const total응급_모델 = typeSummary.filter(ts => ts.incidentType === 'EMERGENCY').reduce((sum, ts) => sum + ts.autoIncidents, 0);
    const total화재_모델 = typeSummary.filter(ts => ts.incidentType === 'FIRE').reduce((sum, ts) => sum + ts.autoIncidents, 0);
    const total쓰레기_모델 = typeSummary.filter(ts => ts.incidentType === 'TRASH').reduce((sum, ts) => sum + ts.autoIncidents, 0);
    const total기타_모델 = typeSummary.filter(ts => !['EMERGENCY', 'FIRE', 'TRASH'].includes(ts.incidentType)).reduce((sum, ts) => sum + ts.autoIncidents, 0);

    // 추이 데이터 변환 (period → month 라벨)
    const monthlyTrend = trend.map(point => {
      const date = new Date(point.period);
      let monthLabel: string;
      if (dateRange.unit === 'YEAR') {
        monthLabel = `${date.getFullYear()}년`;
      } else if (dateRange.unit === 'MONTH') {
        monthLabel = `${date.getMonth() + 1}월`;
      } else {
        monthLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      }
      return {
        month: monthLabel,
        전체: point.total,
        쓰레기: point.trash,
        화재: point.fire,
        응급: point.emergency,
      };
    });

    // AI 탐지 추이 데이터 변환
    // typeSummary는 period별로 그룹화되어 있으므로, 각 trend point에 맞는 period의 typeSummary를 찾기
    const monthlyTrendModel = trend.map(point => {
      const date = new Date(point.period);
      let monthLabel: string;
      if (dateRange.unit === 'YEAR') {
        monthLabel = `${date.getFullYear()}년`;
      } else if (dateRange.unit === 'MONTH') {
        monthLabel = `${date.getMonth() + 1}월`;
      } else {
        monthLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      }
      
      // 해당 period의 typeSummary 찾기
      const periodTypeSummary = typeSummary.filter(ts => ts.period === point.period);
      
      const trashModel = periodTypeSummary.find(ts => ts.incidentType === 'TRASH')?.autoIncidents || 0;
      const fireModel = periodTypeSummary.find(ts => ts.incidentType === 'FIRE')?.autoIncidents || 0;
      const emergencyModel = periodTypeSummary.find(ts => ts.incidentType === 'EMERGENCY')?.autoIncidents || 0;
      const 기타_모델 = periodTypeSummary
        .filter(ts => !['EMERGENCY', 'FIRE', 'TRASH'].includes(ts.incidentType))
        .reduce((sum, ts) => sum + ts.autoIncidents, 0);
      
      return {
        month: monthLabel,
        전체: trashModel + fireModel + emergencyModel + 기타_모델,
        쓰레기: trashModel,
        화재: fireModel,
        응급: emergencyModel,
      };
    });

    return {
      accidentRatio: [
        { name: '응급', value: total응급, color: '#7C2D3B' },
        { name: '화재', value: total화재, color: '#E87C7C' },
        { name: '쓰레기', value: total쓰레기, color: '#5B7C99' },
        { name: '기타', value: total기타, color: '#4A5568' },
      ],
      accidentRatioModel: [
        { name: '응급', value: total응급_모델, color: '#7C2D3B' },
        { name: '화재', value: total화재_모델, color: '#E87C7C' },
        { name: '쓰레기', value: total쓰레기_모델, color: '#5B7C99' },
        { name: '기타', value: total기타_모델, color: '#4A5568' },
      ],
      completionRatio: [
        { name: '처리 완료', value: completionSummary.resolved, color: '#4A90A4' },
        { name: '미완료', value: completionSummary.unresolved, color: '#E5E7EB' },
      ],
      monthlyTrend,
      monthlyTrendModel,
      cctvOperationRate: (() => {
        // CCTV 가동률 계산 (view_stats_daily_cctv_uptime 기반)
        if (cctvUptime && cctvUptime.length > 0) {
          // 선택된 기간 전체에 대한 평균 가동률 계산
          const avgUptimePct = cctvUptime.reduce((sum, point) => sum + point.uptimePct, 0) / cctvUptime.length;
          // 평균 ON/OFF 샘플 수 계산
          const avgOnSamples = Math.round(cctvUptime.reduce((sum, point) => sum + point.onSamples, 0) / cctvUptime.length);
          const avgOffSamples = Math.round(cctvUptime.reduce((sum, point) => sum + point.offSamples, 0) / cctvUptime.length);
          
          return [
            { status: 'ON', value: avgOnSamples, color: '#3B82F6' },
            { status: 'OFF', value: avgOffSamples, color: '#E5E7EB' },
          ];
        } else {
          // 데이터가 없으면 기본값
          return [
            { status: 'ON', value: 0, color: '#3B82F6' },
            { status: 'OFF', value: 0, color: '#E5E7EB' },
          ];
        }
      })(),
    };
  };

  const filteredData = getFilteredData();
  const accidentRatio = filteredData.accidentRatio;
  const accidentRatioModel = filteredData.accidentRatioModel;
  const completionRatio = filteredData.completionRatio;
  const monthlyTrend = filteredData.monthlyTrend;
  const monthlyTrendModel = filteredData.monthlyTrendModel || filteredData.monthlyTrend;
  const cctvOperationRate = filteredData.cctvOperationRate;

  // 전월/전년 대비 증가율 계산 함수 (선택된 구간 기준)
  const calculateMonthOverMonthChange = (type: '전체' | '쓰레기' | '화재' | '응급', data: any[]) => {
    if (!data || data.length < 2) return { change: 0, isIncrease: false };
    
    let currentIndex = data.length - 1;
    
    // 선택된 구간이 있으면 해당 구간 기준으로 계산
    if (selectedPeriod) {
      const foundIndex = data.findIndex(d => d.month === selectedPeriod);
      if (foundIndex > 0) {
        currentIndex = foundIndex;
      }
    }
    
    if (currentIndex === 0) return { change: 0, isIncrease: false };
    
    const currentPeriod = data[currentIndex];
    const previousPeriod = data[currentIndex - 1];
    
    if (!currentPeriod || !previousPeriod) return { change: 0, isIncrease: false };
    
    const currentValue = currentPeriod[type] || 0;
    const previousValue = previousPeriod[type] || 0;
    
    if (previousValue === 0) return { change: 0, isIncrease: currentValue > 0 };
    
    const changePercent = Math.round(((currentValue - previousValue) / previousValue) * 100);
    return { change: Math.abs(changePercent), isIncrease: changePercent > 0 };
  };

  const totalChange = calculateMonthOverMonthChange('전체', monthlyTrend);
  const trashChange = calculateMonthOverMonthChange('쓰레기', monthlyTrend);
  const fireChange = calculateMonthOverMonthChange('화재', monthlyTrend);
  const emergencyChange = calculateMonthOverMonthChange('응급', monthlyTrend);
  
  const totalChangeModel = calculateMonthOverMonthChange('전체', monthlyTrendModel);
  const trashChangeModel = calculateMonthOverMonthChange('쓰레기', monthlyTrendModel);
  const fireChangeModel = calculateMonthOverMonthChange('화재', monthlyTrendModel);
  const emergencyChangeModel = calculateMonthOverMonthChange('응급', monthlyTrendModel);

  // 처리 완료율 계산
  const completionPercentage = completionRatio[0].value + completionRatio[1].value > 0
    ? Math.round((completionRatio[0].value / (completionRatio[0].value + completionRatio[1].value)) * 100)
    : 0;

  // CCTV 가동률 계산
  const cctvPercentage = cctvOperationRate[0].value + cctvOperationRate[1].value > 0
    ? Math.round((cctvOperationRate[0].value / (cctvOperationRate[0].value + cctvOperationRate[1].value)) * 100)
    : 0;

  const handleDateApply = (newRange: DateRangeState) => {
    setDateRange(newRange);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    setDateRange({
      unit: 'MONTH',
      startYear: currentYear,
      endYear: currentYear,
      monthStartYear: currentYear,
      monthStartMonth: 1,
      monthEndYear: currentYear,
      monthEndMonth: currentMonth,
      dayStart: new Date(currentYear, currentMonth - 1, 1),
      dayEnd: new Date(),
    });
    setShowDatePicker(false);
  };

  // 외부 클릭 시 날짜 선택기 닫기
  const datePickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div 
        className="fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out"
        style={{ 
          width: '317.56px', 
          backgroundColor: '#2B2847',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <Sidebar onNavigate={onNavigate} currentPath="dashboard" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative bg-gray-50" style={{ marginLeft: sidebarOpen ? '317.56px' : '0px', transition: 'margin-left 0.3s' }}>
        {/* Header */}
        <div className="shadow-md px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{ backgroundColor: '#345eaa' }}>
          <div className="flex items-center gap-3">
            <HamburgerMenuButton onClick={() => setSidebarOpen(!sidebarOpen)} />
            <h1 className="text-gray-100">통계</h1>
          </div>
        </div>

        <div className="p-3" style={{ backgroundColor: '#F3F4F6', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
          {/* 당일 전체 사고 현황 */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-base font-semibold text-gray-900">당일 전체 사고 현황</h2>
            </div>
            <div className="grid grid-cols-4 gap-2 items-stretch">
              {dailyStats.map((stat, index) => {
                const modelStat = dailyStatsModel[index];
                // CCTV 관련 라벨은 제외 (가동, cctv 등 포함된 경우)
                const isCCTV = stat.label.toLowerCase().includes('cctv') || stat.label.includes('가동');
                
                // CCTV 항목인 경우 하나의 컨테이너 안에서 두 개로 나누기
                if (isCCTV) {
                  return (
                    <div key={index} className="grid grid-cols-2 gap-3 items-stretch">
                      {/* 왼쪽: 총 가동 CCTV */}
                      <div className="bg-white p-1.5 shadow-sm flex flex-col" style={{ borderRadius: '8px', minHeight: '75px' }}>
                        <div className="text-xs text-gray-700" style={{ paddingLeft: '12px', paddingTop: '8px' }}>총 가동 CCTV</div>
                        <div className="flex-1 flex flex-col justify-center" style={{ paddingTop: '0px' }}>
                          <div className="flex items-center justify-between mb-0.5" style={{ paddingLeft: '12px', paddingRight: '16px', transform: 'translateY(2px)' }}>
                            <div className="text-gray-500" style={{ fontSize: '10px' }}>가동 중</div>
                            <div className="text-gray-500" style={{ fontSize: '10px' }}>총</div>
                          </div>
                          <div className="text-center">
                            {stat.value.includes('/') ? (
                              <>
                                <span className="font-bold text-gray-900" style={{ fontSize: '28px' }}>{stat.value.split('/')[0]}</span>
                                <span className="font-bold text-gray-900" style={{ fontSize: '16px', margin: '0 4px' }}>/</span>
                                <span className="font-bold text-gray-900" style={{ fontSize: '28px' }}>{stat.value.split('/')[1]}</span>
                              </>
                            ) : (
                              <span className="font-bold text-gray-900" style={{ fontSize: '28px' }}>{stat.value}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* 오른쪽: 낙석사고 */}
                      <div className="bg-white p-1.5 shadow-sm flex flex-col" style={{ borderRadius: '8px', minHeight: '75px' }}>
                        <div className="text-xs text-gray-700" style={{ paddingLeft: '12px', paddingTop: '8px' }}>낙석 사고</div>
                        <div className="flex-1 flex flex-col items-center justify-center" style={{ paddingTop: '0px' }}>
                          <div className="text-gray-500 mb-0.5" style={{ paddingLeft: '16px', alignSelf: 'flex-start', width: '100%', fontSize: '10px', transform: 'translateY(2px)' }}>총</div>
                          <div className="text-center">
                            <span className="font-bold text-gray-900" style={{ fontSize: '28px' }}>0</span>
                            <span className="font-bold text-gray-900" style={{ fontSize: '14px' }}>건</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // 다른 카드들은 그대로
                return (
                  <div key={index} className="bg-white p-1.5 shadow-sm flex flex-col" style={{ borderRadius: '8px', minHeight: '75px' }}>
                    <div className="text-xs text-gray-700" style={{ paddingLeft: '12px', paddingTop: '8px' }}>{stat.label}</div>
                    {/* 사고 건수는 총 | AI 탐지 형태로 표시 */}
                    <div className="flex items-center gap-1 flex-1" style={{ paddingTop: '0px' }}>
                      <div className="flex-1 text-center">
                        <div className="text-gray-500 mb-0.5" style={{ paddingLeft: '16px', textAlign: 'left', fontSize: '10px', transform: 'translateY(2px)' }}>총</div>
                        <div>
                          <span className="font-bold text-gray-900" style={{ fontSize: '28px' }}>{stat.value.replace('건', '')}</span>
                          <span className="font-bold text-gray-900" style={{ fontSize: '14px' }}>건</span>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-gray-300"></div>
                      <div className="flex-1 text-center">
                        <div className="text-emerald-600 mb-0.5" style={{ paddingLeft: '16px', textAlign: 'left', fontSize: '10px', transform: 'translateY(2px)' }}>AI 탐지</div>
                        <div>
                          <span className="font-bold text-emerald-600" style={{ fontSize: '28px' }}>{(modelStat?.value || '0건').replace('건', '')}</span>
                          <span className="font-bold text-emerald-600" style={{ fontSize: '14px' }}>건</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 기간별 전체 사고 현황 */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">
                  기간별 전체 사고 현황
                </h2>
                <div className="relative" ref={datePickerRef}>
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 ml-2"
                    style={{ borderRadius: '4px' }}
                  >
                    {formatDateRange(dateRange)} ▼
                  </button>
                  {showDatePicker && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 shadow-lg p-3 z-10" style={{ borderRadius: '8px', width: '400px', maxWidth: '90vw' }}>
                      <DateRangePicker
                        initialState={dateRange}
                        onApply={handleDateApply}
                        onReset={handleDateReset}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {/* 1. 사고 비율 - 총 | AI 탐지 */}
              <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">사고 비율</h3>
                <div className="flex items-center gap-4">
                  {/* 왼쪽: 전체 */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-600 mb-2 text-center">총</div>
                    <div className="relative" style={{ width: '100%', height: '140px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={accidentRatio}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={55}
                            dataKey="value"
                            startAngle={90}
                            endAngle={450}
                            label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                            labelLine={false}
                          >
                            {accidentRatio.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`${value}건`, '']}
                            contentStyle={{ borderRadius: '4px', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {accidentRatio.map((item, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-xs text-gray-700">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* 구분선 */}
                  <div className="w-px h-full bg-gray-300"></div>
                  
                  {/* 오른쪽: AI 탐지 */}
                  <div className="flex-1">
                    <div className="text-xs text-emerald-600 mb-2 text-center">AI 탐지</div>
                    <div className="relative" style={{ width: '100%', height: '140px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={accidentRatioModel}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={55}
                            dataKey="value"
                            startAngle={90}
                            endAngle={450}
                            label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                            labelLine={false}
                          >
                            {accidentRatioModel.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`${value}건`, '']}
                            contentStyle={{ borderRadius: '4px', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {accidentRatioModel.map((item, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-xs text-emerald-700">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 사고 건수 추이 - 총 | AI 탐지 */}
              <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">사고 건수 추이</h3>
                <div className="flex items-start gap-4">
                  {/* 왼쪽: 전체 */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-600 mb-2 text-center">총</div>
                    <div onClick={(e: any) => {
                      if (e?.activeLabel) {
                        setSelectedPeriod(e.activeLabel === selectedPeriod ? null : e.activeLabel);
                      }
                    }}>
                      <ResponsiveContainer width="100%" height={110}>
                        {monthlyTrend && monthlyTrend.length > 0 ? (
                          <LineChart data={monthlyTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }} onClick={(e: any) => {
                            if (e?.activeLabel) {
                              setSelectedPeriod(e.activeLabel === selectedPeriod ? null : e.activeLabel);
                            }
                          }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 9 }} 
                              stroke="#9CA3AF"
                              angle={dateRange.unit === 'YEAR' ? 0 : -45}
                              textAnchor={dateRange.unit === 'YEAR' ? 'middle' : 'end'}
                              height={dateRange.unit === 'YEAR' ? 30 : 60}
                            />
                            <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                            <Tooltip contentStyle={{ fontSize: '11px' }} />
                            <Line type="monotone" dataKey="전체" stroke="#4B5563" strokeWidth={2} dot={{ r: 2, fill: '#4B5563' }} activeDot={{ r: 4, fill: '#4B5563', stroke: '#fff', strokeWidth: 2 }} />
                            <Line type="monotone" dataKey="쓰레기" stroke="#5B7C99" strokeWidth={1.5} dot={{ r: 2, fill: '#5B7C99' }} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="화재" stroke="#DC2626" strokeWidth={1.5} dot={{ r: 2, fill: '#DC2626' }} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="응급" stroke="#7C2D3B" strokeWidth={1.5} dot={{ r: 2, fill: '#7C2D3B' }} activeDot={{ r: 4 }} />
                          </LineChart>
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-gray-400">
                            데이터가 없습니다
                          </div>
                        )}
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs text-gray-700 mb-1">
                        {selectedPeriod || (monthlyTrend && monthlyTrend.length > 0 ? monthlyTrend[monthlyTrend.length - 1]?.month : null) || '최근'} 기준
                      </p>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#4B5563' }}></div>
                        <span className="text-xs text-gray-700" style={{ color: totalChange.isIncrease ? '#DC2626' : '#2563EB' }}>
                          전체: {totalChange.isIncrease ? '▲' : '▼'}{totalChange.change}% {dateRange.unit === 'YEAR' ? '전년대비' : '전월대비'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#5B7C99' }}></div>
                        <span className="text-xs text-gray-700" style={{ color: trashChange.isIncrease ? '#DC2626' : '#2563EB' }}>
                          쓰레기: {trashChange.isIncrease ? '▲' : '▼'}{trashChange.change}% {dateRange.unit === 'YEAR' ? '전년대비' : '전월대비'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#DC2626' }}></div>
                        <span className="text-xs text-gray-700" style={{ color: fireChange.isIncrease ? '#DC2626' : '#2563EB' }}>
                          화재: {fireChange.isIncrease ? '▲' : '▼'}{fireChange.change}% {dateRange.unit === 'YEAR' ? '전년대비' : '전월대비'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#7C2D3B' }}></div>
                        <span className="text-xs text-gray-700" style={{ color: emergencyChange.isIncrease ? '#DC2626' : '#2563EB' }}>
                          응급: {emergencyChange.isIncrease ? '▲' : '▼'}{emergencyChange.change}% {dateRange.unit === 'YEAR' ? '전년대비' : '전월대비'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div className="w-px h-full bg-gray-300" style={{ minHeight: '180px' }}></div>

                  {/* 오른쪽: AI 탐지 */}
                  <div className="flex-1">
                    <div className="text-xs text-emerald-600 mb-2 text-center">AI 탐지</div>
                    <div onClick={(e: any) => {
                      if (e?.activeLabel) {
                        setSelectedPeriod(e.activeLabel === selectedPeriod ? null : e.activeLabel);
                      }
                    }}>
                      <ResponsiveContainer width="100%" height={110}>
                        {monthlyTrendModel && monthlyTrendModel.length > 0 ? (
                          <LineChart data={monthlyTrendModel} margin={{ top: 5, right: 5, left: -25, bottom: 5 }} onClick={(e: any) => {
                            if (e?.activeLabel) {
                              setSelectedPeriod(e.activeLabel === selectedPeriod ? null : e.activeLabel);
                            }
                          }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 9 }} 
                              stroke="#9CA3AF"
                              angle={dateRange.unit === 'YEAR' ? 0 : -45}
                              textAnchor={dateRange.unit === 'YEAR' ? 'middle' : 'end'}
                              height={dateRange.unit === 'YEAR' ? 30 : 60}
                            />
                            <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                            <Tooltip contentStyle={{ fontSize: '11px' }} />
                            <Line type="monotone" dataKey="전체" stroke="#059669" strokeWidth={2} dot={{ r: 2, fill: '#059669' }} activeDot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }} />
                            <Line type="monotone" dataKey="쓰레기" stroke="#5B7C99" strokeWidth={1.5} dot={{ r: 2, fill: '#5B7C99' }} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="화재" stroke="#DC2626" strokeWidth={1.5} dot={{ r: 2, fill: '#DC2626' }} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="응급" stroke="#7C2D3B" strokeWidth={1.5} dot={{ r: 2, fill: '#7C2D3B' }} activeDot={{ r: 4 }} />
                          </LineChart>
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-gray-400">
                            데이터가 없습니다
                          </div>
                        )}
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs text-gray-700 mb-1">
                        {selectedPeriod || (monthlyTrendModel && monthlyTrendModel.length > 0 ? monthlyTrendModel[monthlyTrendModel.length - 1]?.month : null) || '최근'} 기준
                      </p>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#059669' }}></div>
                        <span className="text-xs text-gray-700" style={{ color: totalChangeModel.isIncrease ? '#DC2626' : '#2563EB' }}>
                          전체: {totalChangeModel.isIncrease ? '▲' : '▼'}{totalChangeModel.change}% {dateRange.unit === 'YEAR' ? '전년대비' : '전월대비'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#5B7C99' }}></div>
                        <span className="text-xs text-gray-700" style={{ color: trashChangeModel.isIncrease ? '#DC2626' : '#2563EB' }}>
                          쓰레기: {trashChangeModel.isIncrease ? '▲' : '▼'}{trashChangeModel.change}% {dateRange.unit === 'YEAR' ? '전년대비' : '전월대비'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#DC2626' }}></div>
                        <span className="text-xs text-gray-700" style={{ color: fireChangeModel.isIncrease ? '#DC2626' : '#2563EB' }}>
                          화재: {fireChangeModel.isIncrease ? '▲' : '▼'}{fireChangeModel.change}% {dateRange.unit === 'YEAR' ? '전년대비' : '전월대비'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2" style={{ backgroundColor: '#7C2D3B' }}></div>
                        <span className="text-xs text-gray-700" style={{ color: emergencyChangeModel.isIncrease ? '#DC2626' : '#2563EB' }}>
                          응급: {emergencyChangeModel.isIncrease ? '▲' : '▼'}{emergencyChangeModel.change}% {dateRange.unit === 'YEAR' ? '전년대비' : '전월대비'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. AI 모델 정확도 */}
              <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">AI 모델 정확도</h3>
                </div>
                <div className="space-y-3">
                {aiAccuracy.length > 0 ? aiAccuracy.map((item, index) => {
                  const accuracy = item.detected > 0 ? Math.round((item.correct / item.detected) * 100) : 0;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-700">{item.type}</span>
                        <span className="text-xs font-semibold" style={{ color: item.color || '#4A5568' }}>{accuracy}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2" style={{ borderRadius: '0px' }}>
                        <div
                          className="h-2 transition-all duration-300"
                          style={{ width: `${accuracy}%`, backgroundColor: item.color || '#4A5568', borderRadius: '0px' }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-gray-700">탐지: {item.detected}건</span>
                        <span className="text-xs text-gray-700">정확: {item.correct}건</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-xs text-gray-500 text-center py-4">데이터를 불러오는 중...</div>
                )}
                </div>
              </div>

              {/* 4. 평균 CCTV 가동률 */}
              <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">평균 CCTV 가동률</h3>
                </div>
                <div className="flex items-center justify-center gap-6" style={{ height: '140px' }}>
                <div className="relative" style={{ width: '130px', height: '130px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cctvOperationRate}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          dataKey="value"
                          startAngle={90}
                          endAngle={450}
                        >
                          {cctvOperationRate.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-3xl font-bold" style={{ color: '#4A90A4' }}>{cctvPercentage}%</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-700 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
                      <span>ON : {cctvOperationRate[0].value}대</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E5E7EB' }}></div>
                      <span>OFF : {cctvOperationRate[1].value}대</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. 처리 완료 비율 */}
              <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">처리 완료 비율</h3>
                <div className="flex items-center justify-between">
                  <div className="relative" style={{ width: '160px', height: '160px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={completionRatio}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          dataKey="value"
                          startAngle={90}
                          endAngle={450}
                        >
                          {completionRatio.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value}건`, '']}
                          contentStyle={{ borderRadius: '4px', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-3xl font-bold" style={{ color: '#4A90A4' }}>{completionPercentage}%</div>
                    </div>
                  </div>
                  <div className="flex-1 pl-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4A90A4' }}></div>
                        <span className="text-xs text-gray-700">처리 완료 : {completionRatio[0].value}건</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E5E7EB' }}></div>
                        <span className="text-xs text-gray-700">미완료 : {completionRatio[1].value}건</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. 평균 대응시간 */}
              <div className="bg-white p-4 shadow-sm" style={{ borderRadius: '8px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">평균 대응시간</h3>
                </div>
                <div className="flex items-center justify-center gap-4" style={{ height: '140px' }}>
                {avgResponseTime.map((item, index) => {
                  // 가장 긴 시간 찾기
                  const maxTime = Math.max(...avgResponseTime.map(i => i.time));
                  const isLongest = item.time === maxTime && item.type !== '전체';
                  const circleColor = item.type === '전체' ? '#4B5563' : (isLongest ? '#EF4444' : '#3B82F6');
                  
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div className="relative" style={{ width: '80px', height: '80px' }}>
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke="#E5E7EB"
                            strokeWidth="8"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke={circleColor}
                            strokeWidth="8"
                            strokeDasharray={`${(item.time / 60) * 219.8} 219.8`}
                            transform="rotate(-90 50 50)"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-lg font-bold text-gray-900">{item.time}분</div>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-gray-700">{item.type}</div>
                      {item.change !== undefined && (
                        <div className="text-xs text-gray-700 flex items-center gap-0.5" style={{ color: item.isIncrease ? '#EF4444' : '#3B82F6' }}>
                          <span>{dateRange.unit === 'YEAR' ? '전년대비' : '전월대비'} {item.change}%</span>
                          {item.isIncrease ? '▲' : '▼'}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
