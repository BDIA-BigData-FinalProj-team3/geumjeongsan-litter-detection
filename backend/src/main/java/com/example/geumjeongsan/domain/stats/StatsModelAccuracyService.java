package com.example.geumjeongsan.domain.stats;

import com.example.geumjeongsan.api.dto.ModelAccuracyPointDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * AI 모델 정확도 통계 Service
 * VIEW: view_stats_model_accuracy_daily
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StatsModelAccuracyService {

    private final StatsModelAccuracyRepository modelAccuracyRepository;

    /**
     * 기간 + 단위별 AI 모델 정확도 조회
     */
    public List<ModelAccuracyPointDto> getModelAccuracy(String unit, LocalDate from, LocalDate to) {
        log.info("📊 [StatsModelAccuracyService] getModelAccuracy - unit: {}, from: {}, to: {}", unit, from, to);

        List<ModelAccuracyPointDto> result = modelAccuracyRepository.findModelAccuracy(from, to, unit);

        log.info("✅ [StatsModelAccuracyService] Loaded {} model accuracy points", result.size());

        return result;
    }
}

