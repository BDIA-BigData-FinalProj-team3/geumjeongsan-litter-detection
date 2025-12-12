package com.example.geumjeongsan.domain.report;

import com.example.geumjeongsan.api.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

/**
 * 월간보고서 Service
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ReportRepository reportRepository;

    /**
     * 월간 통계 조회
     * @param month "2025-12" 형식
     */
    public MonthlyStatsResponse getMonthlyStats(String month) {
        log.info("📊 [ReportService] getMonthlyStats - month: {}", month);
        
        // "2025-12" → LocalDate
        YearMonth ym = YearMonth.parse(month);
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();
        
        // ① 사고 유형별 통계
        Map<String, Object[]> incidentStats = reportRepository.getMonthlyIncidentStats(monthStart, monthEnd);
        
        // ② 평균 대응시간
        Map<String, Double> responseTime = reportRepository.getMonthlyResponseTime(monthStart, monthEnd);
        
        // ③ CCTV 운영율
        int[] cctvStats = reportRepository.getMonthlyCctvStats(monthStart, monthEnd);
        
        // ④ AI 탐지 vs 신고 통계
        Map<String, Integer> sourceTypeStats = reportRepository.getMonthlySourceTypeStats(monthStart, monthEnd);
        AiDetectionStats aiDetection = new AiDetectionStats(
            sourceTypeStats.getOrDefault("AUTO", 0),
            sourceTypeStats.getOrDefault("MANUAL", 0)
        );
        
        // ⑤ DTO 조합
        IncidentTypeStats fire = buildIncidentStats("FIRE", incidentStats, responseTime);
        IncidentTypeStats trash = buildIncidentStats("TRASH", incidentStats, responseTime);
        IncidentTypeStats emergency = buildIncidentStats("EMERGENCY", incidentStats, responseTime);
        IncidentTypeStats rockfall = buildIncidentStats("ROCKFALL", incidentStats, responseTime);
        
        CctvStats cctv = new CctvStats(
            cctvStats[0] + cctvStats[1],  // total
            cctvStats[0],                  // operational
            cctvStats[1]                   // maintenance
        );
        
        log.info("✅ [ReportService] Returning monthly stats - fire: {}, trash: {}, emergency: {}, rockfall: {}, cctv: {}, aiDetection: {}/{}",
            fire.total(), trash.total(), emergency.total(), rockfall.total(), cctv.total(), 
            aiDetection.aiTotal(), aiDetection.manualTotal());
        
        return new MonthlyStatsResponse(fire, trash, emergency, rockfall, cctv, aiDetection);
    }
    
    private IncidentTypeStats buildIncidentStats(
        String type,
        Map<String, Object[]> incidentStats,
        Map<String, Double> responseTime
    ) {
        Object[] stats = incidentStats.getOrDefault(type, new Object[]{0, 0, 0});
        Double avgMin = responseTime.getOrDefault(type, 0.0);
        
        return new IncidentTypeStats(
            (int) stats[0],  // total
            (int) stats[1],  // resolved
            (int) stats[2],  // pending
            String.format("%.1f분", avgMin)
        );
    }

    /**
     * 주요 사건 목록 조회
     */
    public List<MajorIncidentDto> getMajorIncidents(String month) {
        log.info("📋 [ReportService] getMajorIncidents - month: {}", month);
        
        YearMonth ym = YearMonth.parse(month);
        LocalDate selectedMonth = ym.atDay(1);
        
        List<MajorIncidentDto> incidents = reportRepository.getMajorIncidents(selectedMonth, 20);
        
        log.info("✅ [ReportService] Returning {} major incidents", incidents.size());
        
        return incidents;
    }

    /**
     * 가능한 월 목록 조회
     */
    public List<String> getAvailableMonths() {
        log.info("📅 [ReportService] getAvailableMonths");
        
        List<String> months = reportRepository.getAvailableMonths();
        
        log.info("✅ [ReportService] Returning {} available months", months.size());
        
        return months;
    }
}

