package com.example.geumjeongsan.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
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
}

