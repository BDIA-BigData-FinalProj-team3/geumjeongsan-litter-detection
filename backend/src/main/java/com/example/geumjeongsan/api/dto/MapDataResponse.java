package com.example.geumjeongsan.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MapDataResponse {
    private List<CCTVMarker> cctvMarkers;
    private List<IncidentMarker> incidentMarkers;
    private List<HelicopterSpot> helicopterSpots;
    private List<RockfallSensorSpot> rockfallSensorSpots;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CCTVMarker {
        private String id;
        private String cctvCode;
        private String name;
        private String location;
        private String status; // 정상, 점검필요
        private Double longitude;
        private Double latitude;
        private Long incidentCount;
        private IncidentCounts incidents;
    }
    
    @Data
    @Builder(toBuilder = true)
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IncidentMarker {
        private Long id;
        private String cctvId;
        private String incidentType; // FIRE, ROCKFALL, TRASH, EMERGENCY
        private String severity; // high, medium, low
        private String status; // PENDING, IN_PROGRESS, RESOLVED
        private String time;
        private Double longitude;
        private Double latitude;
        private String detectionModel;      // 모델명
        private Double detectionConfidence; // 신뢰도
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HelicopterSpot {
        private Long id;
        private String name;
        private Double longitude;
        private Double latitude;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RockfallSensorSpot {
        private Long id;
        private String name;
        private Double longitude;
        private Double latitude;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IncidentCounts {
        private Long fire;
        private Long rockfall;
        private Long trash;
        private Long emergency;
    }
}

