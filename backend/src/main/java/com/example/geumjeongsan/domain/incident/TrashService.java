package com.example.geumjeongsan.domain.incident;

import com.example.geumjeongsan.api.dto.TrashDashboardResponse;
import com.example.geumjeongsan.api.dto.TrashIncidentItem;
import com.example.geumjeongsan.api.dto.TrashStatsDto;
import com.example.geumjeongsan.api.dto.HotspotDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TrashService {

    private final IncidentRepository incidentRepository;
    private final TrashDetailRepository trashDetailRepository;
    private final IncidentSummaryRepository incidentSummaryRepository;
    private final TrashHotspotCctvRepository trashHotspotCctvRepository;
    private final EntityManager entityManager;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public TrashService(IncidentRepository incidentRepository,
                       TrashDetailRepository trashDetailRepository,
                       IncidentSummaryRepository incidentSummaryRepository,
                       TrashHotspotCctvRepository trashHotspotCctvRepository,
                       EntityManager entityManager) {
        this.incidentRepository = incidentRepository;
        this.trashDetailRepository = trashDetailRepository;
        this.incidentSummaryRepository = incidentSummaryRepository;
        this.trashHotspotCctvRepository = trashHotspotCctvRepository;
        this.entityManager = entityManager;
    }

    // 쓰레기 현황 + 목록 조회
    public TrashDashboardResponse getDashboard() {
        LocalDate today = LocalDate.now();
        OffsetDateTime todayStart = today.atStartOfDay().atOffset(java.time.ZoneOffset.of("+09:00"));
        OffsetDateTime todayEnd = today.plusDays(1).atStartOfDay().atOffset(java.time.ZoneOffset.of("+09:00"));

        // 당일 발생 건수
        long todayCount = incidentRepository.findAll().stream()
                .filter(i -> "TRASH".equals(i.getIncidentType()) &&
                        i.getDetectedAt().isAfter(todayStart) &&
                        i.getDetectedAt().isBefore(todayEnd))
                .count();

        // 처리 대기중 건수 (PENDING)
        long pendingCount = incidentRepository.findByIncidentTypeAndStatus("TRASH", "PENDING").size();

        // 평균 대응시간
        List<Incident> resolvedTrash = incidentRepository.findByIncidentTypeAndStatus("TRASH", "RESOLVED");
        double avgResponseTime = 0.0;
        if (!resolvedTrash.isEmpty()) {
            long totalMinutes = resolvedTrash.stream()
                    .filter(i -> i.getAcknowledgedAt() != null && i.getResolvedAt() != null)
                    .mapToLong(i -> java.time.Duration.between(i.getAcknowledgedAt(), i.getResolvedAt()).toMinutes())
                    .sum();
            long count = resolvedTrash.stream()
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
                            "WHERE i.incident_type = 'TRASH' " +
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
        List<Incident> activeIncidents = incidentRepository.findByIncidentTypeAndStatusIn("TRASH",
                List.of("PENDING", "IN_PROGRESS"));
        List<TrashIncidentItem> activeItems = activeIncidents.stream()
                .sorted((a, b) -> b.getDetectedAt().compareTo(a.getDetectedAt())) // 최신순 정렬
                .map(this::toTrashIncidentItem)
                .collect(Collectors.toList());

        // 처리완료 목록 - 최신순 정렬
        List<Incident> resolvedIncidents = incidentRepository.findByIncidentTypeAndStatus("TRASH", "RESOLVED");
        List<TrashIncidentItem> resolvedItems = resolvedIncidents.stream()
                .sorted((a, b) -> b.getDetectedAt().compareTo(a.getDetectedAt())) // 최신순 정렬
                .map(this::toTrashIncidentItem)
                .collect(Collectors.toList());

        return TrashDashboardResponse.builder()
                .todayCount(todayCount)
                .pendingCount(pendingCount)
                .avgResponseTime(avgResponseTime)
                .riskAreas(riskAreas)
                .activeIncidents(activeItems)
                .resolvedIncidents(resolvedItems)
                .build();
    }

    private TrashIncidentItem toTrashIncidentItem(Incident incident) {
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

        // 쓰레기 유형 조회
        TrashDetail trashDetail = trashDetailRepository.findById(incident.getId()).orElse(null);
        String type = "일반쓰레기";
        if (trashDetail != null && trashDetail.getMainCategory() != null) {
            type = trashDetail.getMainCategory();
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

        return TrashIncidentItem.builder()
                .id(incident.getId())
                .cctvId(String.format("CCTV-%03d", incident.getCctvId()))
                .incidentTime(incident.getDetectedAt().format(DATE_FORMATTER))
                .type(type)
                .severity(severity)
                .status(status)
                .handler(incident.getHandlerName() != null ? incident.getHandlerName() : "")
                .responseTime(responseTime)
                .duration(duration)
                .build();
    }

    // 쓰레기 사건 상태 업데이트
    @org.springframework.transaction.annotation.Transactional
    public void updateTrashStatus(Long trashId, String status, String handlerName) {
        Incident incident = incidentRepository.findById(trashId)
                .orElseThrow(() -> new RuntimeException("쓰레기 사건을 찾을 수 없습니다: " + trashId));
        
        if (!"TRASH".equals(incident.getIncidentType())) {
            throw new RuntimeException("쓰레기 사건이 아닙니다: " + trashId);
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

    // ===== 신규 메서드: Dashboard KPI용 =====
    
    public TrashStatsDto getTrashStats() {
        LocalDate today = LocalDate.now();
        YearMonth currentMonth = YearMonth.now();

        long todayCount = incidentSummaryRepository.countTodayByType(today, "TRASH");
        long pendingCount = incidentSummaryRepository.countPendingByType("TRASH");
        Double avgResponseMinutes = incidentSummaryRepository.getAvgResponseMinutes(
                currentMonth.getYear(),
                currentMonth.getMonthValue(),
                "TRASH"
        );

        String formattedTime = "-";
        if (avgResponseMinutes != null && avgResponseMinutes > 0) {
            long minutes = Math.round(avgResponseMinutes);
            formattedTime = minutes + "분";
        }

        return TrashStatsDto.builder()
                .todayCount(todayCount)
                .pendingCount(pendingCount)
                .avgResponseTime(avgResponseMinutes != null ? avgResponseMinutes : 0.0)
                .avgResponseTimeFormatted(formattedTime)
                .build();
    }

    public List<HotspotDto> getTrashHotspots(String period, Long minCount) {
        if (minCount == null || minCount < 1) {
            minCount = 3L;
        }
        
        List<TrashHotspotCctv> hotspots;
        
        switch (period.toLowerCase()) {
            case "this_month":
                hotspots = trashHotspotCctvRepository.findHotspotsByThisMonth(minCount);
                break;
            case "30d":
                hotspots = trashHotspotCctvRepository.findHotspotsByLast30Days(minCount);
                break;
            case "7d":
                hotspots = trashHotspotCctvRepository.findHotspotsByLast7Days(minCount);
                break;
            case "all":
                hotspots = trashHotspotCctvRepository.findHotspotsByTotal(minCount);
                break;
            default:
                hotspots = trashHotspotCctvRepository.findHotspotsByThisMonth(minCount);
        }

        return hotspots.stream()
                .map(h -> fromTrashHotspot(h, period))
                .collect(Collectors.toList());
    }

    private HotspotDto fromTrashHotspot(TrashHotspotCctv entity, String period) {
        Long count = switch (period) {
            case "this_month" -> entity.getTrashCountThisMonth();
            case "30d" -> entity.getTrashCount30d();
            case "7d" -> entity.getTrashCount7d();
            default -> entity.getTotalTrashCount();
        };

        return HotspotDto.builder()
                .cctvId(entity.getCctvId())
                .cctvCode(entity.getCctvCode())
                .address(entity.getCctvAddress())
                .addressDescription(entity.getCctvAddressDescription())
                .incidentCount(count)
                .avgSeverityScore(entity.getAvgSeverityScore())
                .maxSeverityScore(entity.getMaxSeverityScore())
                .firstIncidentAt(entity.getFirstTrashAt() != null ? entity.getFirstTrashAt().toString() : null)
                .lastIncidentAt(entity.getLastTrashAt() != null ? entity.getLastTrashAt().toString() : null)
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .geomWkt(entity.getGeomWkt())
                .build();
    }
}

