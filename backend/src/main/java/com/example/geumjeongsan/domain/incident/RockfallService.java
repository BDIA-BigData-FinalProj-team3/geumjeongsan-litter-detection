package com.example.geumjeongsan.domain.incident;

import com.example.geumjeongsan.api.dto.RockfallDashboardResponse;
import com.example.geumjeongsan.api.dto.RockfallIncidentItem;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RockfallService {

    private final IncidentRepository incidentRepository;
    private final RockfallDetailRepository rockfallDetailRepository;
    private final EntityManager entityManager;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public RockfallService(IncidentRepository incidentRepository,
                          RockfallDetailRepository rockfallDetailRepository,
                          EntityManager entityManager) {
        this.incidentRepository = incidentRepository;
        this.rockfallDetailRepository = rockfallDetailRepository;
        this.entityManager = entityManager;
    }

    // 낙석 현황 + 목록 조회
    public RockfallDashboardResponse getDashboard() {
        LocalDate today = LocalDate.now();
        OffsetDateTime todayStart = today.atStartOfDay().atOffset(java.time.ZoneOffset.of("+09:00"));
        OffsetDateTime todayEnd = today.plusDays(1).atStartOfDay().atOffset(java.time.ZoneOffset.of("+09:00"));

        // 당일 발생 건수
        long todayCount = incidentRepository.findAll().stream()
                .filter(i -> "ROCKFALL".equals(i.getIncidentType()) &&
                        i.getDetectedAt().isAfter(todayStart) &&
                        i.getDetectedAt().isBefore(todayEnd))
                .count();

        // 처리 대기중 건수 (PENDING)
        long pendingCount = incidentRepository.findByIncidentTypeAndStatus("ROCKFALL", "PENDING").size();

        // 평균 대응시간
        List<Incident> resolvedRockfalls = incidentRepository.findByIncidentTypeAndStatus("ROCKFALL", "RESOLVED");
        double avgResponseTime = 0.0;
        if (!resolvedRockfalls.isEmpty()) {
            long totalMinutes = resolvedRockfalls.stream()
                    .filter(i -> i.getAcknowledgedAt() != null && i.getResolvedAt() != null)
                    .mapToLong(i -> java.time.Duration.between(i.getAcknowledgedAt(), i.getResolvedAt()).toMinutes())
                    .sum();
            long count = resolvedRockfalls.stream()
                    .filter(i -> i.getAcknowledgedAt() != null && i.getResolvedAt() != null)
                    .count();
            if (count > 0) {
                avgResponseTime = (double) totalMinutes / count;
            }
        }

        // 위험지역 위치 (CCTV ID 기준으로 그룹화하고 CCTV의 지역명 표시)
        String riskAreaSql = "SELECT COALESCE(c.location_desc, c.name, 'CCTV-' || TO_CHAR(c.cctv_id, 'FM000')), COUNT(*) as cnt " +
                            "FROM incident i " +
                            "JOIN cctv c ON i.cctv_id = c.cctv_id " +
                            "WHERE i.incident_type = 'ROCKFALL' " +
                            "GROUP BY c.cctv_id, c.location_desc, c.name " +
                            "ORDER BY cnt DESC " +
                            "LIMIT 5";
        Query riskQuery = entityManager.createNativeQuery(riskAreaSql);
        @SuppressWarnings("unchecked")
        List<Object[]> riskResults = riskQuery.getResultList();
        List<String> riskAreas = riskResults.stream()
                .map(row -> (String) row[0])
                .collect(Collectors.toList());

        // 발생 목록 (PENDING, IN_PROGRESS) - 최신순 정렬
        List<Incident> activeIncidents = incidentRepository.findByIncidentTypeAndStatusIn("ROCKFALL",
                List.of("PENDING", "IN_PROGRESS"));
        List<RockfallIncidentItem> activeItems = activeIncidents.stream()
                .sorted((a, b) -> b.getDetectedAt().compareTo(a.getDetectedAt())) // 최신순 정렬
                .map(this::toRockfallIncidentItem)
                .collect(Collectors.toList());

        // 처리완료 목록 - 최신순 정렬
        List<Incident> resolvedIncidents = incidentRepository.findByIncidentTypeAndStatus("ROCKFALL", "RESOLVED");
        List<RockfallIncidentItem> resolvedItems = resolvedIncidents.stream()
                .sorted((a, b) -> b.getDetectedAt().compareTo(a.getDetectedAt())) // 최신순 정렬
                .map(this::toRockfallIncidentItem)
                .collect(Collectors.toList());

        return RockfallDashboardResponse.builder()
                .todayCount(todayCount)
                .pendingCount(pendingCount)
                .avgResponseTime(avgResponseTime)
                .riskAreas(riskAreas)
                .activeIncidents(activeItems)
                .resolvedIncidents(resolvedItems)
                .build();
    }

    private RockfallIncidentItem toRockfallIncidentItem(Incident incident) {
        // 상태 변환
        String status = switch (incident.getStatus()) {
            case "PENDING" -> "대기중";
            case "IN_PROGRESS" -> "대응중";
            case "RESOLVED" -> "처리완료";
            default -> incident.getStatus();
        };

        // 심각도 변환
        String severity = switch (incident.getSeverityLevel()) {
            case "HIGH" -> "high";
            case "MEDIUM" -> "medium";
            case "LOW" -> "low";
            default -> "medium";
        };

        // 규모 조회
        RockfallDetail rockfallDetail = rockfallDetailRepository.findById(incident.getId()).orElse(null);
        String magnitude = "N/A";
        if (rockfallDetail != null && rockfallDetail.getMagnitude() != null) {
            magnitude = rockfallDetail.getMagnitude().toString();
        }

        // 대응시각 및 소요시간
        String responseTime = null;
        String duration = null;
        if (incident.getAcknowledgedAt() != null) {
            responseTime = incident.getAcknowledgedAt().format(DATE_FORMATTER);
        }
        if (incident.getAcknowledgedAt() != null && incident.getResolvedAt() != null) {
            long minutes = java.time.Duration.between(
                    incident.getAcknowledgedAt(),
                    incident.getResolvedAt()
            ).toMinutes();
            duration = minutes + "분";
        }

        return RockfallIncidentItem.builder()
                .id(incident.getId())
                .cctvId(String.format("CCTV-%03d", incident.getCctvId()))
                .incidentTime(incident.getDetectedAt().format(DATE_FORMATTER))
                .magnitude(magnitude)
                .severity(severity)
                .status(status)
                .handler(incident.getHandlerName() != null ? incident.getHandlerName() : "")
                .responseTime(responseTime)
                .duration(duration)
                .build();
    }

    // 낙석 사건 상태 업데이트
    @org.springframework.transaction.annotation.Transactional
    public void updateRockfallStatus(Long rockfallId, String status, String handlerName) {
        Incident incident = incidentRepository.findById(rockfallId)
                .orElseThrow(() -> new RuntimeException("낙석 사건을 찾을 수 없습니다: " + rockfallId));
        
        if (!"ROCKFALL".equals(incident.getIncidentType())) {
            throw new RuntimeException("낙석 사건이 아닙니다: " + rockfallId);
        }
        
        // 상태 업데이트
        String newStatus = switch (status) {
            case "처리완료", "RESOLVED" -> "RESOLVED";
            case "대응중", "IN_PROGRESS" -> "IN_PROGRESS";
            default -> incident.getStatus();
        };
        incident.setStatus(newStatus);
        
        // 처리자 이름 업데이트
        if (handlerName != null && !handlerName.isEmpty()) {
            incident.setHandlerName(handlerName);
        }
        
        // 시간 업데이트
        OffsetDateTime now = OffsetDateTime.now();
        if ("IN_PROGRESS".equals(newStatus) && incident.getAcknowledgedAt() == null) {
            incident.setAcknowledgedAt(now);
        }
        if ("RESOLVED".equals(newStatus)) {
            if (incident.getAcknowledgedAt() == null) {
                incident.setAcknowledgedAt(now);
            }
            incident.setResolvedAt(now);
        }
        
        incidentRepository.save(incident);
    }
}

