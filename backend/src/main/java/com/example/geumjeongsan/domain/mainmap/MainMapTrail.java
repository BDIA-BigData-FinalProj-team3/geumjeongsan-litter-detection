package com.example.geumjeongsan.domain.mainmap;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.Immutable;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.LineString;

/**
 * 메인맵용 등산로 VIEW Entity
 * VIEW: view_mainmap_trail
 */
@Entity
@Getter
@Immutable
@Table(name = "view_mainmap_trail")
public class MainMapTrail {
    
    @Id
    @Column(name = "segment_id")
    private Long segmentId;
    
    @Column(name = "segment_name")
    private String segmentName;
    
    @Column(name = "trail_name_kor")
    private String trailNameKor;
    
    // LineString geometry
    @JsonIgnore
    @Column(name = "geom", columnDefinition = "geometry(LineString,4326)")
    private LineString geom;
    
    /**
     * LineString을 좌표 배열로 변환하여 JSON으로 직렬화
     */
    @JsonProperty("geom")
    public LineStringDto getGeomDto() {
        if (this.geom != null) {
            Coordinate[] coords = this.geom.getCoordinates();
            double[][] points = new double[coords.length][2];
            for (int i = 0; i < coords.length; i++) {
                points[i][0] = coords[i].x;  // longitude
                points[i][1] = coords[i].y;  // latitude
            }
            return new LineStringDto(points);
        }
        return null;
    }
    
    /**
     * LineString DTO (좌표 배열 전달용)
     */
    public static class LineStringDto {
        public String type = "LineString";
        public double[][] coordinates;  // [[lng, lat], [lng, lat], ...]
        
        public LineStringDto(double[][] coordinates) {
            this.coordinates = coordinates;
        }
    }
}

