package com.example.geumjeongsan.domain.weather;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WeatherRepository extends JpaRepository<Weather, Long> {
    
    /**
     * 특정 위치의 최신 날씨 조회
     */
    Optional<Weather> findFirstByLocationCodeOrderByObsTimeDesc(String locationCode);
}

