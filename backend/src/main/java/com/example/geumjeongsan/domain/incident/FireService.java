package com.example.geumjeongsan.domain.incident;

import com.example.geumjeongsan.api.dto.FireDashboardResponse;
import com.example.geumjeongsan.api.dto.FireIncidentItem;
import com.example.geumjeongsan.api.dto.FireStatsDto;
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
public class FireService {

    private final IncidentRepository incidentRepository;
    private final FireDetailRepository fireDetailRepository;
    private final IncidentSummaryRepository incidentSummaryRepository;
    private final FireHotspotCctvRepository fireHotspotCctvRepository;
    private final EntityManager entityManager;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public FireService(IncidentRepository incidentRepository,
                      FireDetailRepository fireDetailRepository,
                      IncidentSummaryRepository incidentSummaryRepository,
                      FireHotspotCctvRepository fireHotspotCctvRepository,
                      EntityManager entityManager) {
        this.incidentRepository = incidentRepository;
        this.fireDetailRepository = fireDetailRepository;
        this.incidentSummaryRepository = incidentSummaryRepository;
        this.fireHotspotCctvRepository = fireHotspotCctvRepository;
        this.entityManager = entityManager;
    }

    // 화재 현황 + 목록 조회
    public FireDashboardResponse getDashboard() {
        LocalDate today = LocalDate.now();
        OffsetDateTime todayStart = today.atStartOfDay().atOffset(java.time.ZoneOffset.of("+09:00"));
        OffsetDateTime todayEnd = today.plusDays(1).atStartOfDay().atOffset(java.time.ZoneOffset.of("+09:00"));

        // 당일 발생 건수
        long todayCount = incidentRepository.findAll().stream()
                .filter(i -> "FIRE".equals(i.getIncidentType()) &&
                        i.getDetectedAt().isAfter(todayStart) &&
                        i.getDetectedAt().isBefore(todayEnd))
                .count();

        // 처리 대기중 건수 (PENDING + EXTINGUISHING)
        long pendingCount = incidentRepository.findByIncidentTypeAndStatusIn("FIRE", 
                List.of("PENDING", "EXTINGUISHING")).size();

        // 평균 대응시간 (분)
        List<Incident> resolvedFires = incidentRepository.findByIncidentTypeAndStatus("FIRE", "RESOLVED");
        double avgResponseTime = 0.0;
        if (!resolvedFires.isEmpty()) {
            long totalMinutes = resolvedFires.stream()
                    .filter(i -> i.getAcknowledgedAt() != null && i.getResolvedAt() != null)
                    .mapToLong(i -> java.time.Duration.between(i.getAcknowledgedAt(), i.getResolvedAt()).toMinutes())
                    .sum();
            long count = resolvedFires.stream()
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
                            "WHERE i.incident_type = 'FIRE' " +
                            "GROUP BY c.cctv_id, c.location_desc, c.name " +
                            "ORDER BY cnt DESC " +
                            "LIMIT 5";
        Query riskQuery = entityManager.createNativeQuery(riskAreaSql);
        @SuppressWarnings("unchecked")
        List<Object[]> riskResults = riskQuery.getResultList();
        List<String> riskAreas = riskResults.stream()
                .map(row -> (String) row[0])
                .collect(Collectors.toList());

        // 현재 풍속 (기상청 API는 나중에 추가, 일단 기본값)
        String currentWindSpeed = getCurrentWindSpeedFromAPI();


        // 발생 목록 (PENDING, EXTINGUISHING, IN_PROGRESS) - 최신순 정렬
        List<Incident> activeIncidents = incidentRepository.findByIncidentTypeAndStatusIn("FIRE",
                List.of("PENDING", "EXTINGUISHING", "IN_PROGRESS"));
        List<FireIncidentItem> activeItems = activeIncidents.stream()
                .sorted((a, b) -> b.getDetectedAt().compareTo(a.getDetectedAt())) // 최신순 정렬
                .map(this::toFireIncidentItem)
                .collect(Collectors.toList());

        // 처리완료 목록 - 최신순 정렬
        List<Incident> resolvedIncidents = incidentRepository.findByIncidentTypeAndStatus("FIRE", "RESOLVED");
        List<FireIncidentItem> resolvedItems = resolvedIncidents.stream()
                .sorted((a, b) -> b.getDetectedAt().compareTo(a.getDetectedAt())) // 최신순 정렬
                .map(this::toFireIncidentItem)
                .collect(Collectors.toList());

        return FireDashboardResponse.builder()
                .todayCount(todayCount)
                .pendingCount(pendingCount)
                .avgResponseTime(avgResponseTime)
                .currentWindSpeed(currentWindSpeed)
                .riskAreas(riskAreas)
                .activeIncidents(activeItems)
                .resolvedIncidents(resolvedItems)
                .build();
    }

    private FireIncidentItem toFireIncidentItem(Incident incident) {
        // 상태 변환 (화재는 진화중과 대기중만 표시)
        String status = switch (incident.getStatus()) {
            case "PENDING" -> "대기중";
            case "EXTINGUISHING", "IN_PROGRESS" -> "진화중"; // IN_PROGRESS도 진화중으로 표시
            case "RESOLVED" -> "처리완료";
            default -> "대기중";
        };

        // 심각도 변환
        String severity = switch (incident.getSeverityLevel()) {
            case "HIGH" -> "high";
            case "MEDIUM" -> "medium";
            case "LOW" -> "low";
            default -> "medium";
        };

        // 풍속 조회
        FireDetail fireDetail = fireDetailRepository.findById(incident.getId()).orElse(null);
        String windSpeed = "N/A";
        if (fireDetail != null && fireDetail.getWindSpeed() != null) {
            windSpeed = fireDetail.getWindSpeed() + "km/h";
            if (fireDetail.getWindInfo() != null) {
                windSpeed = fireDetail.getWindInfo();
            }
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

        return FireIncidentItem.builder()
                .id(incident.getId())
                .cctvId(String.format("CCTV-%03d", incident.getCctvId()))
                .incidentTime(incident.getDetectedAt().format(DATE_FORMATTER))
                .severity(severity)
                .windSpeed(windSpeed)
                .status(status)
                .handler(incident.getHandlerName() != null ? incident.getHandlerName() : "119")
                .responseTime(responseTime)
                .duration(duration)
                .build();
    }
    // 화재 사건 상태 업데이트
    @org.springframework.transaction.annotation.Transactional
    public void updateFireStatus(Long fireId, String status, String handlerName) {
        Incident incident = incidentRepository.findById(fireId)
                .orElseThrow(() -> new RuntimeException("화재 사건을 찾을 수 없습니다: " + fireId));
        
        if (!"FIRE".equals(incident.getIncidentType())) {
            throw new RuntimeException("화재 사건이 아닙니다: " + fireId);
        }
        
        // 상태 업데이트
        String newStatus = switch (status) {
            case "처리완료", "RESOLVED" -> "RESOLVED";
            case "진화중", "EXTINGUISHING" -> "EXTINGUISHING";
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
    
    private String getCurrentWindSpeedFromAPI() {
        // TODO: 실제 기상청/날씨 API 연동
        try {
            // WebClient / RestTemplate 이용해서 외부 API 호출
            // JSON에서 풍속 값 파싱 후
            // return parsedWindSpeed + "km/h(풍향)";
        } catch (Exception e) {
            // 실패 시 기본값
            return "N/A";
        }
        // 임시
        return "12.5km/h";
    }

    // ===== 신규 메서드: Dashboard KPI용 =====
    
    public FireStatsDto getFireStats() {
        LocalDate today = LocalDate.now();
        YearMonth currentMonth = YearMonth.now();

        long todayCount = incidentSummaryRepository.countTodayByType(today, "FIRE");
        long pendingCount = incidentSummaryRepository.countPendingByType("FIRE");
        Double avgResponseMinutes = incidentSummaryRepository.getAvgResponseMinutes(
                currentMonth.getYear(),
                currentMonth.getMonthValue(),
                "FIRE"
        );

        String formattedTime = "-";
        if (avgResponseMinutes != null && avgResponseMinutes > 0) {
            long minutes = Math.round(avgResponseMinutes);
            formattedTime = minutes + "분";
        }

        return FireStatsDto.builder()
                .todayCount(todayCount)
                .pendingCount(pendingCount)
                .avgResponseTime(avgResponseMinutes != null ? avgResponseMinutes : 0.0)
                .avgResponseTimeFormatted(formattedTime)
                .build();
    }

    public List<HotspotDto> getFireHotspots(String period, Long minCount) {
        if (minCount == null || minCount < 1) {
            minCount = 3L;
        }
        
        List<FireHotspotCctv> hotspots;
        
        switch (period.toLowerCase()) {
            case "this_month":
                hotspots = fireHotspotCctvRepository.findHotspotsByThisMonth(minCount);
                break;
            case "30d":
                hotspots = fireHotspotCctvRepository.findHotspotsByLast30Days(minCount);
                break;
            case "7d":
                hotspots = fireHotspotCctvRepository.findHotspotsByLast7Days(minCount);
                break;
            case "all":
                hotspots = fireHotspotCctvRepository.findHotspotsByTotal(minCount);
                break;
            default:
                hotspots = fireHotspotCctvRepository.findHotspotsByThisMonth(minCount);
        }

        return hotspots.stream()
                .map(h -> fromFireHotspot(h, period))
                .collect(Collectors.toList());
    }

    private HotspotDto fromFireHotspot(FireHotspotCctv entity, String period) {
        Long count = switch (period) {
            case "this_month" -> entity.getFireCountThisMonth();
            case "30d" -> entity.getFireCount30d();
            case "7d" -> entity.getFireCount7d();
            default -> entity.getTotalFireCount();
        };

        return HotspotDto.builder()
                .cctvId(entity.getCctvId())
                .cctvCode(entity.getCctvCode())
                .address(entity.getCctvAddress())
                .addressDescription(entity.getCctvAddressDescription())
                .incidentCount(count)
                .avgSeverityScore(entity.getAvgSeverityScore())
                .maxSeverityScore(entity.getMaxSeverityScore())
                .firstIncidentAt(entity.getFirstFireAt() != null ? entity.getFirstFireAt().toString() : null)
                .lastIncidentAt(entity.getLastFireAt() != null ? entity.getLastFireAt().toString() : null)
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .geomWkt(entity.getGeomWkt())
                .build();
    }
    
}

