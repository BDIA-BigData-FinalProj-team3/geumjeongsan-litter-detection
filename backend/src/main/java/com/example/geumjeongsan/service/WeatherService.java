package com.example.geumjeongsan.service;

import com.example.geumjeongsan.domain.weather.Weather;
import com.example.geumjeongsan.domain.weather.WeatherRepository;
import com.example.geumjeongsan.dto.WeatherApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeatherService {
    
    private final WeatherRepository weatherRepository;
    private final RestTemplate restTemplate;
    
    @Value("${weather.api.key}")
    private String apiKey;
    
    @Value("${weather.api.url}")
    private String apiUrl;
    
    @Value("${weather.location.code}")
    private String locationCode;
    
    @Value("${weather.location.nx}")
    private int nx;
    
    @Value("${weather.location.ny}")
    private int ny;
    
    /**
     * 기상청 API 호출 → DB 저장
     */
    public void fetchAndSaveWeather() {
        try {
            log.info("🌤️ [Weather] Fetching from KMA API...");
            
            LocalDateTime now = LocalDateTime.now();
            String baseDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            String baseTime = now.format(DateTimeFormatter.ofPattern("HH00"));
            
            String url = String.format(
                "%s?serviceKey=%s&numOfRows=10&pageNo=1&dataType=JSON&base_date=%s&base_time=%s&nx=%d&ny=%d",
                apiUrl, apiKey, baseDate, baseTime, nx, ny
            );
            
            WeatherApiResponse response = restTemplate.getForObject(url, WeatherApiResponse.class);
            
            if (response == null || response.getResponse() == null) {
                log.warn("⚠️ [Weather] Empty response");
                return;
            }
            
            Weather weather = parseWeatherData(response);
            weatherRepository.save(weather);
            
            log.info("✅ [Weather] Saved: {} {}°C, {}%, {}m/s, {}mm", 
                weather.getWeatherCondition(),
                weather.getTemperature(),
                weather.getHumidity(),
                weather.getWindSpeed(),
                weather.getRainfall()
            );
            
        } catch (Exception e) {
            log.error("❌ [Weather] Failed to fetch", e);
        }
    }
    
    /**
     * 최신 날씨 조회
     */
    public Weather getLatestWeather() {
        return weatherRepository
            .findFirstByLocationCodeOrderByObsTimeDesc(locationCode)
            .orElse(null);
    }
    
    /**
     * API 응답 → Weather Entity 변환
     */
    private Weather parseWeatherData(WeatherApiResponse response) {
        Weather weather = new Weather();
        weather.setLocationCode(locationCode);
        weather.setObsTime(OffsetDateTime.now());
        weather.setSource("KMA");
        weather.setCreatedAt(OffsetDateTime.now());
        
        Map<String, String> dataMap = new HashMap<>();
        List<WeatherApiResponse.Item> items = response.getResponse().getBody().getItems().getItem();
        
        for (WeatherApiResponse.Item item : items) {
            dataMap.put(item.getCategory(), item.getObsrValue());
        }
        
        // T1H: 기온
        if (dataMap.containsKey("T1H")) {
            weather.setTemperature(new BigDecimal(dataMap.get("T1H")));
        }
        
        // REH: 습도
        if (dataMap.containsKey("REH")) {
            weather.setHumidity(new BigDecimal(dataMap.get("REH")));
        }
        
        // WSD: 풍속
        if (dataMap.containsKey("WSD")) {
            weather.setWindSpeed(new BigDecimal(dataMap.get("WSD")));
        }
        
        // VEC: 풍향
        if (dataMap.containsKey("VEC")) {
            weather.setWindDirection(convertWindDirection(dataMap.get("VEC")));
        }
        
        // RN1: 강수량
        if (dataMap.containsKey("RN1")) {
            String rainfall = dataMap.get("RN1");
            weather.setRainfall(
                rainfall.equals("강수없음") || rainfall.equals("0") 
                    ? BigDecimal.ZERO 
                    : new BigDecimal(rainfall)
            );
        } else {
            weather.setRainfall(BigDecimal.ZERO);
        }
        
        // PTY + SKY: 날씨 상태
        String pty = dataMap.getOrDefault("PTY", "0");
        String sky = dataMap.getOrDefault("SKY", "1");
        weather.setWeatherCondition(determineWeatherCondition(pty, sky));
        
        return weather;
    }
    
    /**
     * 풍향 각도 → 방향 변환
     */
    private String convertWindDirection(String degree) {
        double deg = Double.parseDouble(degree);
        
        if (deg >= 337.5 || deg < 22.5) return "N";
        if (deg >= 22.5 && deg < 67.5) return "NE";
        if (deg >= 67.5 && deg < 112.5) return "E";
        if (deg >= 112.5 && deg < 157.5) return "SE";
        if (deg >= 157.5 && deg < 202.5) return "S";
        if (deg >= 202.5 && deg < 247.5) return "SW";
        if (deg >= 247.5 && deg < 292.5) return "W";
        if (deg >= 292.5 && deg < 337.5) return "NW";
        
        return "N";
    }
    
    /**
     * PTY + SKY → 날씨 상태 통합
     */
    private String determineWeatherCondition(String pty, String sky) {
        // PTY (강수형태) 우선 확인
        switch (pty) {
            case "1": return "RAIN";      // 비
            case "2": return "SLEET";     // 비/눈
            case "3": return "SNOW";      // 눈
            case "4": return "SHOWER";    // 소나기
        }
        
        // 강수 없으면 SKY (하늘상태) 확인
        switch (sky) {
            case "1": return "CLEAR";          // 맑음
            case "3": return "PARTLY_CLOUDY";  // 구름많음
            case "4": return "CLOUDY";         // 흐림
            default: return "CLEAR";
        }
    }
}

