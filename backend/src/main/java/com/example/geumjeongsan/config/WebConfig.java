package com.example.geumjeongsan.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableScheduling  // 스케줄러 활성화
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                // 로컬 개발: localhost:3000 (기존 프론트), localhost:5173 (Vite)
                // 배포 환경: 실제 도메인
                .allowedOrigins(
                    "http://localhost:3000", 
                    "http://localhost:5173",  // Vite 개발 서버 추가
                    "http://127.0.0.1:3000",
                    "http://127.0.0.1:5173",  // Vite 개발 서버 추가
                    "https://geumjeongsan-admin.org", 
                    "https://www.geumjeongsan-admin.org"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
    
    /**
     * RestTemplate Bean 등록 (기상청 API 호출용)
     */
    @Bean
    public RestTemplate restTemplate(
            @Value("${app.http.connect-timeout-ms:5000}") int connectTimeoutMs,
            @Value("${app.http.read-timeout-ms:600000}") int readTimeoutMs
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        return new RestTemplate(factory);
    }

    // WebClient.Builder Bean은 별도 설정 클래스에서 제공합니다.
}

