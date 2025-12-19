package com.example.geumjeongsan.domain.incident;

import com.example.geumjeongsan.api.dto.EmergencyCreateRequest;
import com.example.geumjeongsan.api.dto.EmergencyDashboardResponse;
import com.example.geumjeongsan.api.dto.EmergencyIncidentItem;
import com.example.geumjeongsan.api.dto.EmergencyIncidentListDto;
import com.example.geumjeongsan.api.dto.EmergencyRequest;
import com.example.geumjeongsan.api.dto.EmergencyResponse;
import com.example.geumjeongsan.api.dto.EmergencyStatsDto;
import com.example.geumjeongsan.api.dto.IncidentCreateResponse;
import com.example.geumjeongsan.service.RealtimeSseService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import com.example.geumjeongsan.domain.cctv.CCTV;
import com.example.geumjeongsan.domain.cctv.CCTVRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class EmergencyService {

    private final IncidentRepository incidentRepository;
    private final EmergencyDetailRepository emergencyDetailRepository;
    private final IncidentSummaryRepository incidentSummaryRepository;
    private final IncidentActionRepository incidentActionRepository;
    private final IncidentManualRepository incidentManualRepository;
    private final IncidentAutoRepository incidentAutoRepository;
    private final CCTVRepository cctvRepository;
    private final RealtimeSseService realtimeSseService;
    private final EntityManager entityManager;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final ZoneOffset KST = ZoneOffset.ofHours(9);

    @Value("${gemini.api.model:}")
    private String geminiModelName;

    public EmergencyService(IncidentRepository incidentRepository,
                           EmergencyDetailRepository emergencyDetailRepository,
                           IncidentSummaryRepository incidentSummaryRepository,
                           IncidentActionRepository incidentActionRepository,
                           IncidentManualRepository incidentManualRepository,
                           IncidentAutoRepository incidentAutoRepository,
                           CCTVRepository cctvRepository,
                           RealtimeSseService realtimeSseService,
                           EntityManager entityManager) {
        this.incidentRepository = incidentRepository;
        this.emergencyDetailRepository = emergencyDetailRepository;
        this.incidentSummaryRepository = incidentSummaryRepository;
        this.incidentActionRepository = incidentActionRepository;
        this.incidentManualRepository = incidentManualRepository;
        this.incidentAutoRepository = incidentAutoRepository;
        this.cctvRepository = cctvRepository;
        this.realtimeSseService = realtimeSseService;
        this.entityManager = entityManager;
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

    private String resolveCctvCode(Long cctvId) {
        if (cctvId == null) return "수동등록";
        return cctvRepository.findById(cctvId)
                .map(CCTV::getCctvCode)
                .orElse("수동등록");
    }

    private static String joinFeatures(Object v) {
        if (v == null) return null;
        try {
            if (v instanceof List<?> list) {
                return list.stream()
                        .map(x -> x == null ? "" : x.toString())
                        .filter(s -> !s.isBlank())
                        .collect(Collectors.joining(", "));
            }
        } catch (Exception ignore) {}
        return v.toString();
    }

    private static String normalizeSeverity(String severityLevel) {
        if (severityLevel == null) return "MEDIUM";
        String s = severityLevel.trim().toUpperCase();
        if ("VERY_HIGH".equals(s)) return "HIGH";
        if ("VERY_LOW".equals(s)) return "LOW";
        if ("HIGH".equals(s) || "MEDIUM".equals(s) || "LOW".equals(s)) return s;
        return "MEDIUM";
    }

    /**
     * Gemini 응급 분석 결과(JSON Map)로 AUTO 응급 사건 저장
     * @param hasYolo YOLO 모델을 함께 사용했는지 여부
     */
    @Transactional
    public IncidentCreateResponse createEmergencyFromGemini(
            Map<String, Object> geminiJson,
            Long cctvId,
            String locationDesc,
            OffsetDateTime detectedAtKst,
            boolean hasYolo
    ) {
        if (geminiJson == null) throw new IllegalArgumentException("Gemini 결과가 비어 있습니다.");

        @SuppressWarnings("unchecked")
        Map<String, Object> incidentMap = (Map<String, Object>) geminiJson.get("incident");
        @SuppressWarnings("unchecked")
        Map<String, Object> emergencyDetailMap = (Map<String, Object>) geminiJson.get("emergency_detail");
        @SuppressWarnings("unchecked")
        Map<String, Object> incidentAutoMap = (Map<String, Object>) geminiJson.get("incident_auto");

        if (incidentMap == null) throw new IllegalArgumentException("Gemini 결과에 incident가 없습니다.");
        String incidentType = incidentMap.get("incident_type") != null ? incidentMap.get("incident_type").toString() : null;
        if (!"EMERGENCY".equals(incidentType)) {
            throw new IllegalArgumentException("응급 사건이 아닙니다: " + incidentType);
        }

        OffsetDateTime now = OffsetDateTime.now(KST);
        OffsetDateTime detectedAt = detectedAtKst != null ? detectedAtKst : now;

        // 1) Incident 생성
        Incident incident = new Incident();
        incident.setIncidentType("EMERGENCY");
        incident.setSourceType("AUTO");
        incident.setStatus("PENDING");
        incident.setCctvId(cctvId);
        incident.setDetectedAt(detectedAt);
        incident.setLocationDesc(locationDesc != null ? locationDesc : "CCTV 자동 탐지(응급)");
        incident.setCreatedAt(now);
        incident.setUpdatedAt(now);

        String severityLevel = normalizeSeverity(incidentMap.get("severity_level") != null ? incidentMap.get("severity_level").toString() : null);
        incident.setSeverityLevel(severityLevel);

        String description = geminiJson.get("description") != null ? geminiJson.get("description").toString() : null;
        String reportScore = geminiJson.get("report_possibility_score") != null ? geminiJson.get("report_possibility_score").toString() : null;
        String emergencyLevel = geminiJson.get("emergency_level") != null ? geminiJson.get("emergency_level").toString() : null;

        StringBuilder memoBuilder = new StringBuilder();
        memoBuilder.append("AI 응급 분석");
        if (emergencyLevel != null && !emergencyLevel.isBlank()) memoBuilder.append("\n긴급도: ").append(emergencyLevel);
        if (reportScore != null && !reportScore.isBlank()) memoBuilder.append("\n").append(reportScore);
        if (description != null && !description.isBlank()) memoBuilder.append("\n요약: ").append(description);
        incident.setMemo(memoBuilder.toString());

        // incident_code: E-YYMMDD-XXXA
        String dateStr = incident.getDetectedAt().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String prefix = String.format("E-%s-", dateStr);
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
            } catch (Exception ignore) {
                nextSequence = 1;
            }
        }
        String sequence = String.format("%03d", nextSequence);
        incident.setIncidentCode(String.format("%s%sA", prefix, sequence));

        incident = incidentRepository.save(incident);

        // 2) EmergencyDetail 생성/저장
        EmergencyDetail detail = new EmergencyDetail();
        detail.setIncidentId(incident.getId());
        detail.setSeverityLevel(severityLevel);
        detail.setLocationDesc(locationDesc);
        detail.setOccurredAt(detectedAt);
        detail.setCreatedAt(now);

        // injured_count
        Integer injuredCount = null;
        if (emergencyDetailMap != null) {
            Object ic = emergencyDetailMap.get("injured_count");
            if (ic instanceof Number n) injuredCount = n.intValue();
            else if (ic != null) {
                try { injuredCount = Integer.parseInt(ic.toString()); } catch (Exception ignore) {}
            }
        }
        detail.setInjuredCount(injuredCount);

        // UI 노출용 필드(최소한): emergencyType/symptom에 요약 저장
        detail.setEmergencyType(emergencyLevel != null && !emergencyLevel.isBlank() ? ("AI-" + emergencyLevel) : "AI-응급");
        StringBuilder symptomBuilder = new StringBuilder();
        if (reportScore != null && !reportScore.isBlank()) symptomBuilder.append(reportScore);
        if (description != null && !description.isBlank()) symptomBuilder.append(symptomBuilder.length() > 0 ? "\n" : "").append(description);
        detail.setSymptom(symptomBuilder.length() > 0 ? symptomBuilder.toString() : null);

        emergencyDetailRepository.save(detail);

        // 3) IncidentAuto 저장
        if (incidentAutoMap != null) {
            IncidentAuto auto = new IncidentAuto();
            auto.setIncidentId(incident.getId());
            // YOLO와 Gemini를 함께 사용한 경우 모델명에 둘 다 표시
            String geminiModel = geminiModelName != null && !geminiModelName.isBlank() ? geminiModelName : "gemini-2.5-flash";
            String detectionModel = hasYolo ? ("yolo + " + geminiModel) : geminiModel;
            auto.setDetectionModel(detectionModel);
            auto.setDetectionVersion("emergency-analysis");
            auto.setLocationDesc(locationDesc);
            auto.setIsValid(true);
            auto.setAutoCreatedAt(now);

            Object confObj = incidentAutoMap.get("detection_confidence");
            if (confObj instanceof Number n) auto.setDetectionConfidence(n.doubleValue());
            else if (confObj != null) {
                try { auto.setDetectionConfidence(Double.parseDouble(confObj.toString())); } catch (Exception ignore) { auto.setDetectionConfidence(0.0); }
            }

            // 키 호환: detection_confidence_reason / confidence_reason
            Object cr = incidentAutoMap.get("detection_confidence_reason");
            if (cr == null) cr = incidentAutoMap.get("confidence_reason");
            auto.setConfidenceReason(cr != null ? cr.toString() : null);

            Object sr = incidentAutoMap.get("severity_level_reason");
            auto.setSeverityReason(sr != null ? sr.toString() : null);

            Object features = incidentAutoMap.get("detected_features");
            auto.setDetectedFeatures(joinFeatures(features));

            incidentAutoRepository.save(auto);
        }

        // 4) IncidentAction 로그 저장(CREATED)
        IncidentAction action = new IncidentAction();
        action.setIncidentId(incident.getId());
        action.setActionType("CREATED");
        action.setPrevStatus(null);
        action.setNextStatus("PENDING");
        action.setActorId(null);
        action.setAcknowledgedAt(null);
        action.setResolvedAt(null);
        action.setMemo("Gemini AI 자동 탐지(응급)");
        action.setCreatedAt(now);
        incidentActionRepository.save(action);

        // 5) SSE 실시간 알림 발행
        publishAfterCommit("incident.created", Map.of(
                "incidentId", incident.getId(),
                "incidentCode", incident.getIncidentCode(),
                "incidentType", incident.getIncidentType(),
                "status", incident.getStatus(),
                "detectedAt", incident.getDetectedAt() != null ? incident.getDetectedAt().toString() : null,
                "cctvId", cctvId != null ? cctvId : 0,
                "cctvCode", resolveCctvCode(cctvId),
                "locationDesc", locationDesc != null ? locationDesc : "",
                "severityLevel", incident.getSeverityLevel() != null ? incident.getSeverityLevel() : "MEDIUM"
        ));

        return IncidentCreateResponse.success(incident.getId(), incident.getIncidentCode());
    }
    
    /**
     * 응급 대시보드 상단 통계 (VIEW 기반)
     */
    public EmergencyStatsDto getEmergencyStats() {
        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();
        int currentMonth = today.getMonthValue();
        
        // 당일 발생건수
        long todayCount = incidentSummaryRepository.countTodayByType(today, "EMERGENCY");
        
        // 대기중 건수
        long pendingCount = incidentSummaryRepository.countPendingByType("EMERGENCY");
        
        // 월평균 처리시간 (분)
        Double avgResponseTime = incidentSummaryRepository.getAvgResponseMinutes(
                currentYear, currentMonth, "EMERGENCY"
        );
        
        // 포맷팅 (예: 5분 30초)
        String avgResponseTimeFormatted = formatResponseTime(avgResponseTime);
        
        return EmergencyStatsDto.builder()
                .todayCount(todayCount)
                .pendingCount(pendingCount)
                .avgResponseTime(avgResponseTime != null ? avgResponseTime : 0.0)
                .avgResponseTimeFormatted(avgResponseTimeFormatted)
                .build();
    }
    
    private String formatResponseTime(Double minutes) {
        if (minutes == null || minutes == 0) {
            return "-";
        }
        int totalSeconds = (int) (minutes * 60);
        int mins = totalSeconds / 60;
        int secs = totalSeconds % 60;
        
        if (mins > 0) {
            return mins + "분 " + secs + "초";
        } else {
            return secs + "초";
        }
    }
    
    // 응급 현황 + 목록 조회
    public EmergencyDashboardResponse getDashboard() {
        LocalDate today = LocalDate.now();
        OffsetDateTime todayStart = today.atStartOfDay().atOffset(java.time.ZoneOffset.of("+09:00"));
        OffsetDateTime todayEnd = today.plusDays(1).atStartOfDay().atOffset(java.time.ZoneOffset.of("+09:00"));

        // 당일 발생 건수
        long todayCount = incidentRepository.findAll().stream()
                .filter(i -> "EMERGENCY".equals(i.getIncidentType()) &&
                        i.getDetectedAt().isAfter(todayStart) &&
                        i.getDetectedAt().isBefore(todayEnd))
                .count();

        // 처리 대기중 건수 (PENDING)
        long pendingCount = incidentRepository.findByIncidentTypeAndStatus("EMERGENCY", "PENDING").size();

        // 평균 대응시간
        List<Incident> resolvedEmergencies = incidentRepository.findByIncidentTypeAndStatus("EMERGENCY", "RESOLVED");
        double avgResponseTime = 0.0;
        if (!resolvedEmergencies.isEmpty()) {
            long totalMinutes = resolvedEmergencies.stream()
                    .filter(i -> i.getAcknowledgedAt() != null && i.getResolvedAt() != null)
                    .mapToLong(i -> java.time.Duration.between(i.getAcknowledgedAt(), i.getResolvedAt()).toMinutes())
                    .sum();
            long count = resolvedEmergencies.stream()
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
                            "WHERE i.incident_type = 'EMERGENCY' " +
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
        List<Incident> activeIncidents = incidentRepository.findByIncidentTypeAndStatusIn("EMERGENCY",
                List.of("PENDING", "IN_PROGRESS"));
        List<EmergencyIncidentItem> activeItems = activeIncidents.stream()
                .sorted((a, b) -> b.getDetectedAt().compareTo(a.getDetectedAt())) // 최신순 정렬
                .map(this::toEmergencyIncidentItem)
                .collect(Collectors.toList());

        // 처리완료 목록 - 최신순 정렬
        List<Incident> resolvedIncidents = incidentRepository.findByIncidentTypeAndStatus("EMERGENCY", "RESOLVED");
        List<EmergencyIncidentItem> resolvedItems = resolvedIncidents.stream()
                .sorted((a, b) -> b.getDetectedAt().compareTo(a.getDetectedAt())) // 최신순 정렬
                .map(this::toEmergencyIncidentItem)
                .collect(Collectors.toList());

        return EmergencyDashboardResponse.builder()
                .todayCount(todayCount)
                .pendingCount(pendingCount)
                .avgResponseTime(avgResponseTime)
                .riskAreas(riskAreas)
                .activeIncidents(activeItems)
                .resolvedIncidents(resolvedItems)
                .build();
    }

    private EmergencyIncidentItem toEmergencyIncidentItem(Incident incident) {
        EmergencyDetail detail = emergencyDetailRepository.findById(incident.getId()).orElse(null);

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

        // 유형 (emergency_type)
        String type = detail != null && detail.getEmergencyType() != null 
                ? detail.getEmergencyType() 
                : "응급상황";

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

        return EmergencyIncidentItem.builder()
                .id(incident.getId())
                .type(type)
                .cctvId(resolveCctvCode(incident.getCctvId()))
                .incidentTime(incident.getDetectedAt().format(DATE_FORMATTER))
                .severity(severity)
                .status(status)
                .handler(incident.getHandlerName() != null ? incident.getHandlerName() : "")
                .responseTime(responseTime)
                .duration(duration)
                .build();
    }

    // 응급환자 기록 저장
    @Transactional
    public EmergencyResponse createEmergency(EmergencyRequest request) {
        // 필수 필드 검증
        if (request.getCctvId() == null || request.getCctvId().trim().isEmpty()) {
            throw new IllegalArgumentException("CCTV ID는 필수입니다.");
        }
        if (request.getIncidentTime() == null || request.getIncidentTime().trim().isEmpty()) {
            throw new IllegalArgumentException("발생시간은 필수입니다.");
        }
        if (request.getPatientName() == null || request.getPatientName().trim().isEmpty()) {
            throw new IllegalArgumentException("환자명은 필수입니다.");
        }
        
        Incident incident = new Incident();
        
        // CCTV ID에서 숫자 추출
        if (request.getCctvId() == null || request.getCctvId().trim().isEmpty()) {
            throw new IllegalArgumentException("CCTV ID는 필수입니다.");
        }
        String cctvIdStr = request.getCctvId().replace("CCTV-", "").trim();
        if (cctvIdStr.isEmpty()) {
            throw new IllegalArgumentException("CCTV ID 형식이 올바르지 않습니다: " + request.getCctvId());
        }
        Long cctvId;
        try {
            cctvId = Long.parseLong(cctvIdStr);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("CCTV ID는 숫자여야 합니다: " + cctvIdStr);
        }
        incident.setCctvId(cctvId);
        
        incident.setIncidentType("EMERGENCY");
        incident.setSourceType("MANUAL"); // 수동 등록
        
        // 심각도 변환
        String severityLevel = switch (request.getSeverity()) {
            case "critical" -> "HIGH";
            case "moderate" -> "MEDIUM";
            case "low" -> "LOW";
            default -> "MEDIUM";
        };
        incident.setSeverityLevel(severityLevel);
        
        // 상태 변환
        String status = switch (request.getStatus()) {
            case "대응중" -> "IN_PROGRESS";
            case "이송완료", "처리완료" -> "RESOLVED";
            default -> "PENDING";
        };
        incident.setStatus(status);
        
        // 발생시간 파싱
        if (request.getIncidentTime() == null || request.getIncidentTime().isEmpty()) {
            throw new IllegalArgumentException("발생시간은 필수입니다.");
        }
        String incidentTimeStr = request.getIncidentTime().trim();
        // T가 있으면 공백으로 변환 (datetime-local 형식 대응)
        incidentTimeStr = incidentTimeStr.replace('T', ' ');
        
        // 초 단위(:ss)가 포함되어 있다면 제거 (yyyy-MM-dd HH:mm 형식으로 맞춤)
        if (incidentTimeStr.length() > 16) {
            incidentTimeStr = incidentTimeStr.substring(0, 16);
        }
        
        LocalDateTime localDateTime;
        try {
            localDateTime = LocalDateTime.parse(incidentTimeStr, DATE_FORMATTER);
        } catch (Exception e) {
            // 파싱 실패 시 현재 시간으로 fallback하거나 에러 명시
             throw new IllegalArgumentException("날짜 형식이 올바르지 않습니다. (입력값: " + request.getIncidentTime() + ", 기대형식: yyyy-MM-dd HH:mm)");
        }
        
        incident.setDetectedAt(localDateTime.atOffset(java.time.ZoneOffset.of("+09:00")));
        
        incident.setLocationDesc(request.getLocation());
        // acknowledged_at, resolved_at, handler_name은 incident_action에만 저장 ✅
        
        // 1. 사고 코드 생성 (E-YYMMDD-001A 또는 E-YYMMDD-001M)
        String dateStr = incident.getDetectedAt().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String prefix = String.format("E-%s-", dateStr);
        
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
        Incident saved = incidentRepository.save(incident);
        // ID를 확보하기 위해 flush (트랜잭션 내에서 ID 생성 보장)
        incidentRepository.flush();
        
        // EmergencyDetail 저장 (@MapsId를 사용하므로 incident만 설정하면 incidentId가 자동 설정됨)
        EmergencyDetail detail = new EmergencyDetail();
        // incidentId 설정
        detail.setIncidentId(saved.getId());
        detail.setPatientName(request.getPatientName());
        detail.setPatientAge(request.getAge() != null ? String.valueOf(request.getAge()) : null);
        detail.setPatientGender(request.getGender());
        detail.setEmergencyType(request.getSymptoms()); // 증상을 유형으로 사용
        detail.setSymptom(request.getSymptoms());
        detail.setSeverityLevel(severityLevel);
        // detail.setStatus(status); // DB에 status 컬럼 없음
        detail.setResponseTeam(request.getResponseTeam());
        detail.setLocationDesc(request.getLocation());
        detail.setOccurredAt(saved.getDetectedAt());
        detail.setCreatedAt(OffsetDateTime.now());
        
        emergencyDetailRepository.save(detail);
        
        // IncidentAction 로그 저장 (CREATED)
        IncidentAction action = new IncidentAction();
        action.setIncidentId(saved.getId());
        action.setActionType("CREATED");
        action.setPrevStatus(null);
        action.setNextStatus(status);
        action.setActorId(null); // TODO: 실제 사용자 ID 연동
        action.setMemo("신규 응급 사건 등록");
        action.setCreatedAt(OffsetDateTime.now());
        incidentActionRepository.save(action);
        
        // 수동 등록인 경우 IncidentManual 저장
        if ("MANUAL".equals(saved.getSourceType())) {
            // EmergencyRequest에는 createdById가 없으므로 incident_manual 저장을 생략.
            // (인증 연동 후 SecurityContext의 userId로 채우도록 개선 가능)
        }
        
        return toEmergencyResponse(saved);
    }

    // 응급환자 기록 수정
    @Transactional
    public EmergencyResponse updateEmergency(Long id, EmergencyRequest request) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("응급 기록을 찾을 수 없습니다: " + id));
        
        if (!"EMERGENCY".equals(incident.getIncidentType())) {
            throw new RuntimeException("응급 기록이 아닙니다: " + id);
        }
        
        // 이전 상태 저장 (incident_action 로그용)
        String prevStatus = incident.getStatus();
        
        // 상태 변환
        String status = switch (request.getStatus()) {
            case "대응중" -> "IN_PROGRESS";
            case "이송완료", "처리완료" -> "RESOLVED";
            default -> "PENDING";
        };
        incident.setStatus(status);
        
        // 심각도 변환
        String severityLevel = switch (request.getSeverity()) {
            case "critical" -> "HIGH";
            case "moderate" -> "MEDIUM";
            case "low" -> "LOW";
            default -> "MEDIUM";
        };
        incident.setSeverityLevel(severityLevel);
        
        incident.setLocationDesc(request.getLocation());
        // acknowledged_at, resolved_at, handler_name은 incident_action에만 저장 ✅
        
        Incident saved = incidentRepository.save(incident);
        
        // EmergencyDetail 업데이트
        EmergencyDetail detail = emergencyDetailRepository.findById(id).orElse(new EmergencyDetail());
        // incidentId 설정
        if (detail.getIncidentId() == null) {
            detail.setIncidentId(saved.getId());
        }
        detail.setPatientName(request.getPatientName());
        detail.setPatientAge(request.getAge() != null ? String.valueOf(request.getAge()) : null);
        detail.setPatientGender(request.getGender());
        detail.setEmergencyType(request.getSymptoms());
        detail.setSymptom(request.getSymptoms());
        detail.setSeverityLevel(severityLevel);
        // detail.setStatus(status); // DB에 status 컬럼 없음
        detail.setResponseTeam(request.getResponseTeam());
        detail.setLocationDesc(request.getLocation());
        
        emergencyDetailRepository.save(detail);
        
        // IncidentAction 로그 저장 (상태 변경)
        if (!prevStatus.equals(status)) {
            IncidentAction action = new IncidentAction();
            action.setIncidentId(saved.getId());
            
            // 상태에 따라 action_type 결정
            if ("IN_PROGRESS".equals(status) && "PENDING".equals(prevStatus)) {
                action.setActionType("ACK");
                action.setAcknowledgedAt(OffsetDateTime.now());  // ✅ 확인 시각
            } else if ("RESOLVED".equals(status)) {
                action.setActionType("RESOLVED");
                action.setResolvedAt(OffsetDateTime.now());  // ✅ 해결 시각
            } else {
                action.setActionType("STATUS_CHANGED");
            }
            
            action.setPrevStatus(prevStatus);
            action.setNextStatus(status);
            action.setActorId(null); // TODO: 실제 사용자 ID 연동
            action.setMemo("상태 변경: " + prevStatus + " → " + status);
            action.setCreatedAt(OffsetDateTime.now());
            incidentActionRepository.save(action);
        }
        
        return toEmergencyResponse(saved);
    }

    // 응급 사건 상태 업데이트
    @Transactional
    public EmergencyResponse updateEmergencyStatus(Long id, String status, String handlerName) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("응급 기록을 찾을 수 없습니다: " + id));
        
        if (!"EMERGENCY".equals(incident.getIncidentType())) {
            throw new RuntimeException("응급 기록이 아닙니다: " + id);
        }
        
        String prevStatus = incident.getStatus();
        String newStatus = switch (status) {
            case "대응중", "IN_PROGRESS" -> "IN_PROGRESS";
            case "이송완료", "처리완료", "RESOLVED" -> "RESOLVED";
            default -> "PENDING";
        };
        
        incident.setStatus(newStatus);
        incident.setUpdatedAt(OffsetDateTime.now()); // ✅ updated_at 자동 설정
        
        if (handlerName != null && !handlerName.isEmpty()) {
            incident.setHandlerName(handlerName);
        }
        
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
        
        Incident saved = incidentRepository.save(incident);
        
        // incident_action 테이블에 로그 기록
        if (!prevStatus.equals(newStatus)) {
            IncidentAction action = new IncidentAction();
            action.setIncidentId(saved.getId());
            
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
            action.setActorId(null);
            action.setMemo("상태 변경: " + prevStatus + " → " + newStatus);
            action.setCreatedAt(now);
            incidentActionRepository.save(action);
        }
        
        return toEmergencyResponse(saved);
    }
    
    /**
     * 응급 사건 상세정보 업데이트 (수동 등록 전용)
     */
    @Transactional
    public void updateEmergencyDetail(Long id, String memo, String severityLevel,
                                      String patientName, String patientGender, String transferHospital,
                                      Long actorId) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("응급 기록을 찾을 수 없습니다: " + id));
        
        if (!"EMERGENCY".equals(incident.getIncidentType())) {
            throw new RuntimeException("응급 기록이 아닙니다: " + id);
        }
        
        // 변경 전 값 저장 (이력 기록용)
        String prevMemo = incident.getMemo();
        String prevSeverity = incident.getSeverityLevel();
        EmergencyDetail detail = emergencyDetailRepository.findByIncidentId(id).orElse(null);
        String prevPatientName = detail != null ? detail.getPatientName() : null;
        String prevPatientGender = detail != null ? detail.getPatientGender() : null;
        String prevTransferHospital = detail != null ? detail.getTransferDest() : null;
        
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
        
        // emergency_detail 테이블 업데이트
        if (detail != null) {
            if (patientName != null && !patientName.isEmpty() && !"미상".equals(patientName) && !patientName.equals(prevPatientName)) {
                detail.setPatientName(patientName);
                changedFields.append("환자명, ");
            }
            if (patientGender != null && !patientGender.isEmpty() && !"미상".equals(patientGender)) {
                String dbGender = switch (patientGender) {
                    case "남성", "남" -> "M";
                    case "여성", "여" -> "F";
                    default -> patientGender;
                };
                if (!dbGender.equals(prevPatientGender)) {
                    detail.setPatientGender(dbGender);
                    changedFields.append("환자성별, ");
                }
            }
            if (transferHospital != null && !transferHospital.isEmpty() && !transferHospital.equals(prevTransferHospital)) {
                detail.setTransferDest(transferHospital);
                changedFields.append("이송병원, ");
            }
            emergencyDetailRepository.save(detail);
        }
        
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
            action.setActorId(actorId);
            incidentActionRepository.save(action);
        }
    }

    // 응급환자 기록 삭제
    @Transactional
    public void deleteEmergency(Long id) {
        EmergencyDetail detail = emergencyDetailRepository.findById(id).orElse(null);
        if (detail != null) {
            emergencyDetailRepository.delete(detail);
        }
        incidentRepository.deleteById(id);
    }

    // 모든 응급환자 기록 조회
    public List<EmergencyResponse> getAllEmergencies() {
        List<Incident> incidents = incidentRepository.findByIncidentType("EMERGENCY");
        return incidents.stream()
                .sorted((a, b) -> b.getDetectedAt().compareTo(a.getDetectedAt())) // 최신순 정렬
                .map(this::toEmergencyResponse)
                .collect(Collectors.toList());
    }

    // Incident -> EmergencyResponse 변환
    private EmergencyResponse toEmergencyResponse(Incident incident) {
        EmergencyDetail detail = emergencyDetailRepository.findById(incident.getId()).orElse(null);

        String patientName = (detail != null) ? detail.getPatientName() : "";
        String patientAge = (detail != null) ? detail.getPatientAge() : null;
        // 성별 변환 (M/F -> 남/여)
        String gender = "";
        if (detail != null && detail.getPatientGender() != null) {
            String genderValue = detail.getPatientGender();
            gender = switch (genderValue) {
                case "M", "남", "남성" -> "남";
                case "F", "여", "여성" -> "여";
                default -> genderValue; // 이미 "남"/"여"인 경우 그대로 사용
            };
        }
        String symptoms = (detail != null && detail.getSymptom() != null) ? detail.getSymptom() : "";
        String notes = "";

        // 상태 변환
        String status = switch (incident.getStatus()) {
            case "IN_PROGRESS" -> "대응중";
            case "RESOLVED" -> {
                if (incident.getHandlerName() != null && incident.getHandlerName().contains("이송")) {
                    yield "이송완료";
                }
                yield "처리완료";
            }
            default -> "대기중";
        };

        // 심각도 변환
        String severity = switch (incident.getSeverityLevel()) {
            case "HIGH" -> "critical";
            case "MEDIUM" -> "moderate";
            case "LOW" -> "low";
            default -> "moderate";
        };

        String location = (detail != null && detail.getLocationDesc() != null) 
                ? detail.getLocationDesc() 
                : incident.getLocationDesc();
        String responseTeam = (detail != null && detail.getResponseTeam() != null) 
                ? detail.getResponseTeam() 
                : incident.getHandlerName();

        return EmergencyResponse.builder()
                .id(incident.getId())
                .patientName(patientName)
                .age(patientAge != null ? Integer.parseInt(patientAge.replaceAll("[^0-9]", "0")) : null)
                .gender(gender)
                .location(location != null ? location : "")
                .cctvId(resolveCctvCode(incident.getCctvId()))
                .incidentTime(incident.getDetectedAt().format(DATE_FORMATTER))
                .symptoms(symptoms != null ? symptoms : "")
                .severity(severity)
                .status(status)
                .responseTeam(responseTeam != null ? responseTeam : "")
                .notes(notes)
                .build();
    }
    
    /**
     * 응급 사고 목록 조회 (페이지네이션)
     */
    public Page<EmergencyIncidentListDto> getEmergencyIncidents(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("detectedAt").descending());
        Page<IncidentSummary> incidents = incidentSummaryRepository
                .findByIncidentTypeOrderByDetectedAtDesc("EMERGENCY", pageable);
        
        return incidents.map(EmergencyIncidentListDto::fromEntity);
    }
    
    /**
     * 신규 응급 사건 등록 (수동 등록)
     */
    @Transactional
    public IncidentCreateResponse createEmergency(EmergencyCreateRequest request) {
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
        incident.setIncidentType("EMERGENCY");
        incident.setSourceType("MANUAL");
        incident.setSeverityLevel(request.getSeverityLevel().toUpperCase());
        incident.setStatus("PENDING");
        incident.setDetectedAt(request.getDetectedAt());
        incident.setLocationDesc(request.getLocationDesc());
        incident.setMemo(request.getMemo());
        incident.setCctvId(null);
        incident.setCreatedAt(OffsetDateTime.now());
        incident.setUpdatedAt(OffsetDateTime.now());
        
        // 1. 사고 코드 생성 (E-YYMMDD-001A 또는 E-YYMMDD-001M)
        String dateStr = incident.getDetectedAt().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String prefix = String.format("E-%s-", dateStr);
        
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
        
        // 3. EmergencyDetail 생성
        EmergencyDetail detail = new EmergencyDetail();
        detail.setIncidentId(incident.getId());
        detail.setPatientName(request.getPatientName());
        detail.setPatientAge(request.getPatientAge());
        detail.setPatientGender(request.getPatientGender());
        detail.setResponseTeam(request.getResponseTeam());
        detail.setTransferDest(request.getTransferDest());
        detail.setOccurredAt(request.getDetectedAt());
        detail.setLocationDesc(request.getLocationDesc());
        detail.setCreatedAt(OffsetDateTime.now());
        
        emergencyDetailRepository.save(detail);
        
        // 4. IncidentAction 로그 저장 (CREATED)
        IncidentAction action = new IncidentAction();
        action.setIncidentId(incident.getId());
        action.setActionType("CREATED");
        action.setPrevStatus(null);
        action.setNextStatus("PENDING");
        action.setActorId(null);  // ✅ 등록자 ID 임시 비활성화 (FK 오류 방지)
        // action.setActorId(request.getCreatedById());
        action.setAcknowledgedAt(null);
        action.setResolvedAt(null);
        action.setMemo("신규 응급 사건 등록 (수동)");
        action.setCreatedAt(OffsetDateTime.now());
        incidentActionRepository.save(action);
        
        // 5. IncidentManual 저장
        // DB: created_by_id NOT NULL. 값이 없으면 400 에러 반환
        if (request.getCreatedById() == null) {
            throw new IllegalArgumentException("createdById는 필수입니다.");
        }
        IncidentManual manual = new IncidentManual();
        manual.setIncidentId(incident.getId());
        manual.setManualDescription(request.getMemo() != null ? request.getMemo() : "");
        manual.setManualLocation(request.getLocationDesc());
        manual.setCreatedById(request.getCreatedById());
        manual.setCreatedAt(OffsetDateTime.now());
        incidentManualRepository.save(manual);
        
        return IncidentCreateResponse.success(incident.getId(), incidentCode);
    }
}

