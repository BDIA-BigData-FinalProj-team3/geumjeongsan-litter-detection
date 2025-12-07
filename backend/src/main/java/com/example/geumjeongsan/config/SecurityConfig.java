package com.example.geumjeongsan.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())  // CSRF 비활성화 (개발용, 실제 배포 시 활성화 고려)
            // CORS는 WebConfig.java에서 설정
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()  // 모든 요청 허용 (인증 불필요)
            );
        
        return http.build();
    }
    
    // 참고: CORS 설정은 WebConfig.java에서 관리
    // WebConfig.java의 allowedOrigins에 필요한 도메인 추가
}

