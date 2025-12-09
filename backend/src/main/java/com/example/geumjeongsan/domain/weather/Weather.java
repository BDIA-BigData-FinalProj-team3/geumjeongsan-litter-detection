package com.example.geumjeongsan.domain.weather;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "weather")
@Getter
@Setter
@NoArgsConstructor
public class Weather {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "weather_id")
    private Long weatherId;
    
    @Column(name = "obs_time")
    private OffsetDateTime obsTime;
    
    @Column(name = "location_code")
    private String locationCode;
    
    @Column(name = "temperature")
    private BigDecimal temperature;
    
    @Column(name = "humidity")
    private BigDecimal humidity;
    
    @Column(name = "wind_direction")
    private String windDirection;
    
    @Column(name = "wind_speed")
    private BigDecimal windSpeed;
    
    @Column(name = "rainfall")
    private BigDecimal rainfall;
    
    @Column(name = "weather_condition")
    private String weatherCondition;
    
    @Column(name = "source")
    private String source;
    
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

