package com.example.geumjeongsan.domain.stats;

import com.example.geumjeongsan.api.dto.CctvUptimePointDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * CCTV 가동률 통계 Service
 * VIEW: view_stats_daily_cctv_uptime
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StatsCctvUptimeService {

    private final StatsCctvUptimeRepository cctvUptimeRepository;

    /**
     * CCTV 가동률 조회
     * 
     * @param unit 기간 단위 ("YEAR" | "MONTH" | "DAY")
     * @param from 시작 날짜
     * @param to 종료 날짜
     * @return 기간별 CCTV 가동률 데이터
     */
    public List<CctvUptimePointDto> getCctvUptime(String unit, LocalDate from, LocalDate to) {
        log.info("📊 [StatsCctvService] getCctvUptime - unit: {}, from: {}, to: {}", unit, from, to);
        
        List<CctvUptimePointDto> result = cctvUptimeRepository.findCctvUptime(from, to, unit);
        
        log.info("✅ [StatsCctvService] Loaded {} CCTV uptime points", result.size());
        
        return result;
    }
}

