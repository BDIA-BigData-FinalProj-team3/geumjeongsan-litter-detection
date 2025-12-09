package com.example.geumjeongsan.scheduler;

import com.example.geumjeongsan.service.WeatherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WeatherScheduler {
    
    private final WeatherService weatherService;
    
    /**
     * 20분마다 기상청 API 호출하여 날씨 데이터 저장
     */
    @Scheduled(cron = "0 */20 * * * *")  // 매 20분마다 실행
    public void updateWeather() {
        log.info("⏰ [Weather] Scheduler triggered - updating weather data");
        weatherService.fetchAndSaveWeather();
    }
}

