package com.example.geumjeongsan.domain.incident;

import com.example.geumjeongsan.api.dto.FireCreateRequest;
import com.example.geumjeongsan.api.dto.FireUpdateRequest;
import com.example.geumjeongsan.api.dto.FireDashboardResponse;
import com.example.geumjeongsan.api.dto.FireIncidentItem;
import com.example.geumjeongsan.api.dto.FireStatsDto;
import com.example.geumjeongsan.api.dto.HotspotDto;
import com.example.geumjeongsan.api.dto.IncidentCreateResponse;
import com.example.geumjeongsan.domain.cctv.CCTV;
import com.example.geumjeongsan.domain.cctv.CCTVRepository;
import com.example.geumjeongsan.domain.weather.Weather;
import com.example.geumjeongsan.service.RealtimeSseService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class FireService {

    private final IncidentRepository incidentRepository;
    private final FireDetailRepository fireDetailRepository;
    private final IncidentSummaryRepository incidentSummaryRepository;
    private final FireHotspotCctvRepository fireHotspotCctvRepository;
    private final IncidentActionRepository incidentActionRepository;
    private final IncidentManualRepository incidentManualRepository;
    private final CCTVRepository cctvRepository;
    private final IncidentAutoRepository incidentAutoRepository;
    private final RealtimeSseService realtimeSseService;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final ZoneOffset KST = ZoneOffset.ofHours(9);

    @Value("${gemini.api.model:gemini}")
    private String geminiModelName;

    public FireService(IncidentRepository incidentRepository,
                      FireDetailRepository fireDetailRepository,
                      IncidentSummaryRepository incidentSummaryRepository,
                      FireHotspotCctvRepository fireHotspotCctvRepository,
                      IncidentActionRepository incidentActionRepository,
                      IncidentManualRepository incidentManualRepository,
                      CCTVRepository cctvRepository,
                      IncidentAutoRepository incidentAutoRepository,
                      RealtimeSseService realtimeSseService,
                      EntityManager entityManager,
                      ObjectMapper objectMapper) {
        this.incidentRepository = incidentRepository;
        this.fireDetailRepository = fireDetailRepository;
        this.incidentSummaryRepository = incidentSummaryRepository;
        this.fireHotspotCctvRepository = fireHotspotCctvRepository;
        this.incidentActionRepository = incidentActionRepository;
        this.incidentManualRepository = incidentManualRepository;
        this.cctvRepository = cctvRepository;
        this.incidentAutoRepository = incidentAutoRepository;
        this.realtimeSseService = realtimeSseService;
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
    }

    private String resolveCctvCode(Long cctvId) {
        if (cctvId == null) return "수동등록";
        try {
            return cctvRepository.findById(cctvId)
                    .map(CCTV::getCctvCode)
                    .orElse(String.format("CCTV-%03d", cctvId));
        } catch (Exception e) {
            return String.format("CCTV-%03d", cctvId);
        }
    }

    private void publishAfterCommit(String eventName, Map<String, Object> payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    realtimeSseService.publish(eventName, payload);
                }
            });
        } else {
            realtimeSseService.publish(eventName, payload);
        }
    }

    private static String normalizeSeverityFromRiskLevel(String riskLevelKorean) {
        if (riskLevelKorean == null) return "MEDIUM";
        return switch (riskLevelKorean.trim()) {
            case "심각" -> "HIGH";
            case "경계" -> "MEDIUM";
            case "주의" -> "LOW";
            case "안전" -> "LOW";
            default -> "MEDIUM";
        };
    }

    private static String joinFeatures(Object v) {
        if (v == null) return null;
        try {
            if (v instanceof java.util.List<?> list) {
                return list.stream()
                        .map(x -> x == null ? "" : x.toString())
                        .filter(s -> !s.isBlank())
                        .collect(Collectors.joining(", "));
            }
        } catch (Exception ignore) {}
        return v.toString();
    }

    /**
     * 파이썬 fire_detector.py 결과(JSON Map)로 AUTO 화재 사건 저장
     */
    @Transactional
    public IncidentCreateResponse createFireFromAiAnalysis(
            Map<String, Object> aiJson,
            Long cctvId,
            String locationDesc,
            Weather weather
    ) throws Exception {

        @SuppressWarnings("unchecked")
        Map<String, Object> ar = (Map<String, Object>) aiJson.get("analysis_result");
        if (ar == null) {
            throw new IllegalArgumentException("AI 결과에 analysis_result가 없습니다.");
        }

        boolean isFire = Boolean.TRUE.equals(ar.get("is_fire_detected"));
        if (!isFire) {
            throw new IllegalArgumentException("화재 감지 결과가 아닙니다(is_fire_detected=false).");
        }

        OffsetDateTime now = OffsetDateTime.now(KST);

        // 1) Incident 생성
        Incident incident = new Incident();
        incident.setIncidentType("FIRE");
        incident.setSourceType("AUTO");
        incident.setStatus("PENDING");
        incident.setCctvId(cctvId);
        incident.setDetectedAt(now);
        incident.setLocationDesc(locationDesc != null ? locationDesc : "CCTV 자동 탐지(화재)");
        incident.setCreatedAt(now);
        incident.setUpdatedAt(now);

        String riskLevel = ar.get("risk_level") != null ? ar.get("risk_level").toString() : null;
        incident.setSeverityLevel(normalizeSeverityFromRiskLevel(riskLevel));

        // JSON 원문 저장
        incident.setMemo(objectMapper.writeValueAsString(aiJson));

        // incident_code: F-YYMMDD-XXXA
        String dateStr = incident.getDetectedAt().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String prefix = String.format("F-%s-", dateStr);
        Incident lastIncident = incidentRepository.findTopByIncidentCodeStartingWithOrderByIncidentCodeDesc(prefix);
        int nextSequence = 1;
        if (lastIncident != null && lastIncident.getIncidentCode() != null) {
            String lastCode = lastIncident.getIncidentCode();
            try {
                String[] parts = lastCode.split("-");
                if (parts.length >= 3) {
                    String seqPart = parts[2].substring(0, 3);
                    nextSequence = Integer.parseInt(seqPart) + 1;
                }
            } catch (Exception ignored) {
                nextSequence = 1;
            }
        }
        String sequence = String.format("%03d", nextSequence);
        incident.setIncidentCode(String.format("%s%sA", prefix, sequence));

        incident = incidentRepository.save(incident);

        // 2) FireDetail 생성
        FireDetail detail = new FireDetail();
        detail.setIncidentId(incident.getId());
        detail.setCreatedAt(now);
        detail.setSpreadDirection(ar.get("spread_direction") != null ? ar.get("spread_direction").toString() : null);
        detail.setSpreadRisk(ar.get("spread_risk_level") != null ? ar.get("spread_risk_level").toString() : null);

        String message = ar.get("message") != null ? ar.get("message").toString() : null;
        String confidenceReason = ar.get("detection_confidence_reason") != null ? ar.get("detection_confidence_reason").toString() : null;
        String smokeRegion = ar.get("smoke_region") != null ? ar.get("smoke_region").toString() : null;
        String features = joinFeatures(ar.get("detected_features"));

        StringBuilder note = new StringBuilder();
        if (message != null && !message.isBlank()) note.append(message);
        if (confidenceReason != null && !confidenceReason.isBlank()) note.append(note.length() > 0 ? "\n" : "").append("근거: ").append(confidenceReason);
        if (smokeRegion != null && !smokeRegion.isBlank()) note.append(note.length() > 0 ? "\n" : "").append("연기영역: ").append(smokeRegion);
        if (features != null && !features.isBlank()) note.append(note.length() > 0 ? "\n" : "").append("특징: ").append(features);
        detail.setNote(note.length() > 0 ? note.toString() : null);
        detail.setNearbyRisks(features);

        // 날씨 -> windSpeed/windInfo 세팅(best-effort)
        if (weather != null && weather.getWindSpeed() != null) {
            try {
                BigDecimal kmh = weather.getWindSpeed().multiply(new BigDecimal("3.6"));
                detail.setWindSpeed(kmh);
                String wi = (weather.getWindDirection() != null ? weather.getWindDirection() : "")
                        + " " + kmh.setScale(1, java.math.RoundingMode.HALF_UP) + "km/h"
                        + (weather.getHumidity() != null ? (" (습도 " + weather.getHumidity() + "%)") : "");
                detail.setWindInfo(wi.trim());
            } catch (Exception ignore) {}
        }

        fireDetailRepository.save(detail);

        // 3) IncidentAuto 생성 (confidence/model 등)
        IncidentAuto auto = new IncidentAuto();
        auto.setIncidentId(incident.getId());
        auto.setDetectionModel(geminiModelName != null ? geminiModelName : "gemini");
        auto.setDetectionVersion("fire_detector.py");
        auto.setLocationDesc(locationDesc);
        auto.setIsValid(true);
        auto.setAutoCreatedAt(now);

        Object confObj = ar.get("confidence_score");
        if (confObj instanceof Number n) {
            auto.setDetectionConfidence(n.doubleValue());
        } else if (confObj != null) {
            try {
                auto.setDetectionConfidence(Double.parseDouble(confObj.toString()));
            } catch (Exception ignored) {
                auto.setDetectionConfidence(0.0);
            }
        }
        auto.setConfidenceReason(confidenceReason);
        auto.setSeverityReason(riskLevel != null ? ("risk_level=" + riskLevel + ", spread_risk=" + (detail.getSpreadRisk() != null ? detail.getSpreadRisk() : "")) : null);
        auto.setDetectedFeatures(features);
        incidentAutoRepository.save(auto);

        // 4) IncidentAction 로그 저장 (CREATED)
        IncidentAction action = new IncidentAction();
        action.setIncidentId(incident.getId());
        action.setActionType("CREATED");
        action.setPrevStatus(null);
        action.setNextStatus("PENDING");
        action.setActorId(null);
        action.setAcknowledgedAt(null);
        action.setResolvedAt(null);
        action.setMemo("AI 자동 탐지(화재)");
        action.setCreatedAt(now);
        incidentActionRepository.save(action);

        // 5) 실시간 이벤트 발행 (커밋 후)
        publishAfterCommit("incident.created", Map.of(
                "incidentId", incident.getId(),
                "incidentCode", incident.getIncidentCode(),
                "incidentType", incident.getIncidentType(),
                "status", incident.getStatus(),
                "detectedAt", incident.getDetectedAt() != null ? incident.getDetectedAt().toString() : null,
                "cctvId", incident.getCctvId(),
                "locationDesc", incident.getLocationDesc(),
                "sourceType", incident.getSourceType()
        ));

        return IncidentCreateResponse.success(incident.getId(), incident.getIncidentCode());
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
                .cctvId(resolveCctvCode(incident.getCctvId()))
                .incidentTime(incident.getDetectedAt().format(DATE_FORMATTER))
                .severity(severity)
                .windSpeed(windSpeed)
                .status(status)
                .handler(incident.getHandlerName() != null ? incident.getHandlerName() : "119")
                .responseTime(responseTime)
                .duration(duration)
                .build();
    }
    
    // 화재 사건 전체 정보 수정
    @Transactional
    public FireIncidentItem updateFire(Long fireId, FireUpdateRequest request) {
        Incident incident = incidentRepository.findById(fireId)
                .orElseThrow(() -> new RuntimeException("화재 사건을 찾을 수 없습니다: " + fireId));
        
        if (!"FIRE".equals(incident.getIncidentType())) {
            throw new RuntimeException("화재 사건이 아닙니다: " + fireId);
        }
        
        // 이전 상태 저장 (incident_action 로그용)
        String prevStatus = incident.getStatus();
        
        // Incident 업데이트
        if (request.getDetectedAt() != null) {
            incident.setDetectedAt(request.getDetectedAt());
        }
        if (request.getLocationDesc() != null) {
            incident.setLocationDesc(request.getLocationDesc());
        }
        if (request.getSeverityLevel() != null) {
            incident.setSeverityLevel(request.getSeverityLevel().toUpperCase());
        }
        if (request.getStatus() != null) {
            String newStatus = switch (request.getStatus()) {
                case "처리완료", "RESOLVED" -> "RESOLVED";
                case "진화중", "EXTINGUISHING" -> "EXTINGUISHING";
                case "대응중", "IN_PROGRESS" -> "IN_PROGRESS";
                default -> "PENDING";
            };
            incident.setStatus(newStatus);
        }
        if (request.getHandlerName() != null) {
            incident.setHandlerName(request.getHandlerName());
        }
        
        // 시간 업데이트
        OffsetDateTime now = OffsetDateTime.now();
        if ("IN_PROGRESS".equals(incident.getStatus()) && incident.getAcknowledgedAt() == null) {
            incident.setAcknowledgedAt(now);
        }
        if ("RESOLVED".equals(incident.getStatus())) {
            if (incident.getAcknowledgedAt() == null) {
                incident.setAcknowledgedAt(now);
            }
            if (incident.getResolvedAt() == null) {
                incident.setResolvedAt(now);
            }
        }
        
        incident.setUpdatedAt(now);
        Incident saved = incidentRepository.save(incident);
        
        // FireDetail 업데이트
        FireDetail detail = fireDetailRepository.findByIncidentId(fireId).orElse(null);
        if (detail == null) {
            detail = new FireDetail();
            detail.setIncidentId(fireId);
            detail.setCreatedAt(now);
        }
        
        if (request.getWindSpeed() != null) {
            detail.setWindSpeed(java.math.BigDecimal.valueOf(request.getWindSpeed()));
        }
        if (request.getWindInfo() != null) {
            detail.setWindInfo(request.getWindInfo());
        }
        if (request.getSpreadDirection() != null) {
            detail.setSpreadDirection(request.getSpreadDirection());
        }
        if (request.getSpreadRisk() != null) {
            detail.setSpreadRisk(request.getSpreadRisk());
        }
        if (request.getNearbyRisks() != null) {
            detail.setNearbyRisks(request.getNearbyRisks());
        }
        if (request.getNote() != null) {
            detail.setNote(request.getNote());
        }
        
        fireDetailRepository.save(detail);
        
        // IncidentAction 로그 저장 (상태 변경 시)
        if (!prevStatus.equals(incident.getStatus())) {
            IncidentAction action = new IncidentAction();
            action.setIncidentId(saved.getId());
            action.setActionType("STATUS_CHANGED");
            action.setPrevStatus(prevStatus);
            action.setNextStatus(incident.getStatus());
            action.setActorId(request.getUpdatedById());
            action.setMemo("화재 사건 수정: " + prevStatus + " → " + incident.getStatus());
            action.setCreatedAt(now);
            incidentActionRepository.save(action);
        }
        
        return toFireIncidentItem(saved);
    }
    
    // 화재 사건 상태 업데이트
    @org.springframework.transaction.annotation.Transactional
    public void updateFireStatus(Long fireId, String status, String handlerName) {
        Incident incident = incidentRepository.findById(fireId)
                .orElseThrow(() -> new RuntimeException("화재 사건을 찾을 수 없습니다: " + fireId));
        
        if (!"FIRE".equals(incident.getIncidentType())) {
            throw new RuntimeException("화재 사건이 아닙니다: " + fireId);
        }
        
        // 이전 상태 저장 (incident_action 로그용)
        String prevStatus = incident.getStatus();
        
        // 상태 업데이트
        String newStatus = switch (status) {
            case "처리완료", "RESOLVED" -> "RESOLVED";
            case "진화중", "EXTINGUISHING" -> "EXTINGUISHING";
            case "대응중", "IN_PROGRESS" -> "IN_PROGRESS";
            default -> incident.getStatus();
        };
        incident.setStatus(newStatus);
        incident.setUpdatedAt(OffsetDateTime.now()); // ✅ updated_at 자동 설정
        
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
        
        // IncidentAction 로그 저장 (상태 변경)
        if (!prevStatus.equals(newStatus)) {
            IncidentAction action = new IncidentAction();
            action.setIncidentId(incident.getId());
            
            if ("IN_PROGRESS".equals(newStatus) && "PENDING".equals(prevStatus)) {
                action.setActionType("ACK");
                action.setAcknowledgedAt(now);
            } else if ("RESOLVED".equals(newStatus)) {
                action.setActionType("RESOLVED");
                action.setResolvedAt(now);
            } else {
                action.setActionType("STATUS_CHANGED");
            }
            
            action.setPrevStatus(prevStatus);
            action.setNextStatus(newStatus);
            action.setActorId(null); // TODO: 실제 사용자 ID 연동
            action.setMemo("상태 변경: " + prevStatus + " → " + newStatus);
            action.setCreatedAt(now);
            incidentActionRepository.save(action);
        }
    }
    
    /**
     * 화재 사건 상세정보 업데이트 (수동 등록 전용)
     */
    @Transactional
    public void updateFireDetail(Long id, String memo, String severityLevel) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("화재 사건을 찾을 수 없습니다: " + id));
        
        if (!"FIRE".equals(incident.getIncidentType())) {
            throw new RuntimeException("화재 사건이 아닙니다: " + id);
        }
        
        // 변경 전 값 저장 (이력 기록용)
        String prevMemo = incident.getMemo();
        String prevSeverity = incident.getSeverityLevel();
        
        // 변경된 필드 추적
        StringBuilder changedFields = new StringBuilder();
        
        // incident 테이블 업데이트
        if (memo != null && !memo.equals(prevMemo)) {
            incident.setMemo(memo);
            changedFields.append("메모, ");
        }
        if (severityLevel != null) {
            String dbSeverity = switch (severityLevel) {
                case "상", "HIGH" -> "HIGH";
                case "중", "MEDIUM" -> "MEDIUM";
                case "하", "LOW" -> "LOW";
                default -> incident.getSeverityLevel();
            };
            if (!dbSeverity.equals(prevSeverity)) {
                incident.setSeverityLevel(dbSeverity);
                changedFields.append("심각도, ");
            }
        }
        incident.setUpdatedAt(OffsetDateTime.now());
        incidentRepository.save(incident);
        
        // incident_action 테이블에 수정 이력 기록
        if (changedFields.length() > 0) {
            // 마지막 ", " 제거
            String changedFieldsStr = changedFields.toString().replaceAll(", $", "");
            
            IncidentAction action = new IncidentAction();
            action.setIncidentId(id);
            action.setActionType("DETAIL_UPDATED");
            action.setPrevStatus(incident.getStatus());
            action.setNextStatus(incident.getStatus());  // 상태는 변경되지 않음
            action.setMemo("상세 정보 수정: " + changedFieldsStr);
            action.setCreatedAt(OffsetDateTime.now());
            // actorId는 추후 인증 시스템 구현 시 설정
            incidentActionRepository.save(action);
        }
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
                .maxSeverityScore(entity.getMaxSeverityScore() != null ? entity.getMaxSeverityScore().doubleValue() : null)
                .firstIncidentAt(entity.getFirstFireAt() != null ? entity.getFirstFireAt().toString() : null)
                .lastIncidentAt(entity.getLastFireAt() != null ? entity.getLastFireAt().toString() : null)
                .latitude(null)
                .longitude(null)
                .geomWkt(entity.getGeom() != null ? entity.getGeom().toText() : null)
                .build();
    }
    
    /**
     * 신규 화재 사건 등록 (수동 등록)
     */
    @Transactional
    public IncidentCreateResponse createFire(FireCreateRequest request) {
        // 필수 필드 검증
        if (request.getDetectedAt() == null) {
            throw new IllegalArgumentException("발생시간은 필수입니다.");
        }
        if (request.getLocationDesc() == null || request.getLocationDesc().trim().isEmpty()) {
            throw new IllegalArgumentException("발생 위치는 필수입니다.");
        }
        if (request.getSeverityLevel() == null || request.getSeverityLevel().trim().isEmpty()) {
            throw new IllegalArgumentException("심각도는 필수입니다.");
        }
        
        // 1. Incident 생성
        Incident incident = new Incident();
        incident.setIncidentType("FIRE");
        incident.setSourceType("MANUAL");
        incident.setSeverityLevel(request.getSeverityLevel().toUpperCase());
        incident.setStatus("PENDING");
        incident.setDetectedAt(request.getDetectedAt());
        incident.setLocationDesc(request.getLocationDesc());
        incident.setMemo(request.getMemo());
        incident.setCctvId(null); // ✅ 수동 등록은 CCTV ID 없음
        incident.setCreatedAt(OffsetDateTime.now());
        incident.setUpdatedAt(OffsetDateTime.now());
        
        // 1. 사고 코드 생성 (F-YYMMDD-001A 또는 F-YYMMDD-001M)
        String dateStr = incident.getDetectedAt().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String prefix = String.format("F-%s-", dateStr);
        
        Incident lastIncident = incidentRepository.findTopByIncidentCodeStartingWithOrderByIncidentCodeDesc(prefix);
        int nextSequence = 1;
        
        if (lastIncident != null && lastIncident.getIncidentCode() != null) {
            String lastCode = lastIncident.getIncidentCode();
            try {
                String[] parts = lastCode.split("-");
                if (parts.length >= 3) {
                    String seqPart = parts[2].substring(0, 3);
                    nextSequence = Integer.parseInt(seqPart) + 1;
                }
            } catch (Exception e) {
                nextSequence = 1;
            }
        }
        
        String sequence = String.format("%03d", nextSequence);
        String suffix = "AUTO".equals(incident.getSourceType()) ? "A" : "M";
        String incidentCode = String.format("%s%s%s", prefix, sequence, suffix);
        
        incident.setIncidentCode(incidentCode);
        
        // 2. Incident 저장
        incident = incidentRepository.save(incident);
        
        // 3. FireDetail 생성
        FireDetail detail = new FireDetail();
        detail.setIncidentId(incident.getId());
        detail.setNote(request.getMemo());
        detail.setCreatedAt(OffsetDateTime.now());
        
        fireDetailRepository.save(detail);
        
        // IncidentAction 로그 저장 (CREATED)
        IncidentAction action = new IncidentAction();
        action.setIncidentId(incident.getId());
        action.setActionType("CREATED");
        action.setPrevStatus(null);
        action.setNextStatus("PENDING");
        action.setActorId(null);  // ✅ 등록자 ID 임시 비활성화 (FK 오류 방지)
        // action.setActorId(request.getCreatedById());
        action.setAcknowledgedAt(null);
        action.setResolvedAt(null);
        action.setMemo("신규 화재 사건 등록");
        action.setCreatedAt(OffsetDateTime.now());
        incidentActionRepository.save(action);
        
        // 수동 등록인 경우 IncidentManual 저장
        if ("MANUAL".equals(incident.getSourceType())) {
            // DB: created_by_id NOT NULL. 값이 없으면 400 에러 반환
            if (request.getCreatedById() == null) {
                throw new IllegalArgumentException("createdById는 필수입니다.");
            }
            
            try {
                IncidentManual manual = new IncidentManual();
                manual.setIncidentId(incident.getId());
                manual.setManualDescription(request.getMemo() != null ? request.getMemo() : "");
                manual.setManualLocation(request.getLocationDesc());
                manual.setCreatedById(request.getCreatedById());
                manual.setCreatedAt(OffsetDateTime.now());
                incidentManualRepository.save(manual);
                log.info("✅ [Fire] IncidentManual saved - incidentId: {}, createdById: {}", 
                        incident.getId(), request.getCreatedById());
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                log.error("❌ [Fire] Failed to save IncidentManual - incidentId: {}, createdById: {}, error: {}", 
                        incident.getId(), request.getCreatedById(), e.getMessage(), e);
                // FK 제약 위반인 경우
                if (e.getCause() instanceof org.hibernate.exception.ConstraintViolationException) {
                    org.hibernate.exception.ConstraintViolationException hibernateEx = 
                        (org.hibernate.exception.ConstraintViolationException) e.getCause();
                    if (hibernateEx.getConstraintName() != null && 
                        hibernateEx.getConstraintName().contains("fk_incident_manual_user")) {
                        throw new IllegalArgumentException(
                            "존재하지 않는 사용자 ID입니다: " + request.getCreatedById() + 
                            ". staff_user 테이블에 해당 user_id가 있는지 확인해주세요.");
                    }
                }
                throw e;
            } catch (Exception e) {
                log.error("❌ [Fire] Unexpected error saving IncidentManual - incidentId: {}, createdById: {}, error: {}", 
                        incident.getId(), request.getCreatedById(), e.getMessage(), e);
                throw e;
            }
        }
        
        return IncidentCreateResponse.success(incident.getId(), incidentCode);
    }
    
}

