package com.example.geumjeongsan.domain.mainmap;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 낙석 위험 VIEW
 * VIEW: view_mainmap_rockfall_risk
 * 
 * 문화재 낙석 위험(rockfall_risk_cultural)과 
 * 등산로 낙석 위험(rockfall_risk_trail)을 통합한 뷰
 */
@Entity
@Table(name = "view_mainmap_rockfall_risk")
@Immutable
public class RockfallRisk {
    
    @Id
    private String id;
    
    @Column(name = "source_id")
    private Long sourceId;
    
    @Column(name = "risk_type")
    private String riskType; // 'cultural' or 'trail'
    
    private String name;
    
    private String cultural;
    
    @Column(name = "risk_value")
    private BigDecimal riskValue;
    
    @Column(name = "style_c")
    private Integer styleC;
    
    @Column(name = "geom_geojson", columnDefinition = "json")
    private String geomGeojson;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    // Getters
    public String getId() {
        return id;
    }
    
    public Long getSourceId() {
        return sourceId;
    }
    
    public String getRiskType() {
        return riskType;
    }
    
    public String getName() {
        return name;
    }
    
    public String getCultural() {
        return cultural;
    }
    
    public BigDecimal getRiskValue() {
        return riskValue;
    }
    
    public Integer getStyleC() {
        return styleC;
    }
    
    public String getGeomGeojson() {
        return geomGeojson;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}

