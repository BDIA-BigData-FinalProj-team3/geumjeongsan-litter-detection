package com.example.geumjeongsan.domain.incident;

import com.example.geumjeongsan.api.dto.IncidentCreateResponse;
import com.example.geumjeongsan.api.dto.TrashCreateRequest;
import com.example.geumjeongsan.api.dto.TrashUpdateRequest;
import com.example.geumjeongsan.api.dto.TrashDashboardResponse;
import com.example.geumjeongsan.api.dto.TrashIncidentItem;
import com.example.geumjeongsan.api.dto.TrashStatsDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import com.example.geumjeongsan.service.RealtimeSseService;
import com.example.geumjeongsan.domain.cctv.CCTV;
import com.example.geumjeongsan.domain.cctv.CCTVRepository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TrashService {

    private final IncidentRepository incidentRepository;
    private final TrashDetailRepository trashDetailRepository;
    private final IncidentSummaryRepository incidentSummaryRepository;
    private final IncidentActionRepository incidentActionRepository;
    private final IncidentManualRepository incidentManualRepository;
    private final IncidentAutoRepository incidentAutoRepository;
    private final EntityManager entityManager;
    private final RealtimeSseService realtimeSseService;
    private final CCTVRepository cctvRepository;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final ZoneOffset KST = ZoneOffset.ofHours(9);

    @Value("${gemini.api.model:gemini}")
    private String geminiModelName;

    public TrashService(IncidentRepository incidentRepository,
                       TrashDetailRepository trashDetailRepository,
                       IncidentSummaryRepository incidentSummaryRepository,
                       IncidentActionRepository incidentActionRepository,
                       IncidentManualRepository incidentManualRepository,
                       IncidentAutoRepository incidentAutoRepository,
                       EntityManager entityManager,
                       RealtimeSseService realtimeSseService,
                       CCTVRepository cctvRepository) {
        this.incidentRepository = incidentRepository;
        this.trashDetailRepository = trashDetailRepository;
        this.incidentSummaryRepository = incidentSummaryRepository;
        this.incidentActionRepository = incidentActionRepository;
        this.incidentManualRepository = incidentManualRepository;
        this.incidentAutoRepository = incidentAutoRepository;
        this.entityManager = entityManager;
        this.realtimeSseService = realtimeSseService;
        this.cctvRepository = cctvRepository;
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

    private String resolveCctvCodeOrNull(Long cctvId) {
        if (cctvId == null) return null;
        try {
            return cctvRepository.findById(cctvId).map(CCTV::getCctvCode).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private void publishAfterCommit(String eventName, java.util.Map<String, Object> payload) {
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
                .cctvId(resolveCctvCode(incident.getCctvId()))
                .incidentTime(incident.getDetectedAt().format(DATE_FORMATTER))
                .type(type)
                .severity(severity)
                .status(status)
                .handler(incident.getHandlerName() != null ? incident.getHandlerName() : "")
                .responseTime(responseTime)
                .duration(duration)
                .build();
    }
    
    // 쓰레기 사건 전체 정보 수정
    @Transactional
    public TrashIncidentItem updateTrash(Long trashId, TrashUpdateRequest request) {
        Incident incident = incidentRepository.findById(trashId)
                .orElseThrow(() -> new RuntimeException("쓰레기 사건을 찾을 수 없습니다: " + trashId));
        
        if (!"TRASH".equals(incident.getIncidentType())) {
            throw new RuntimeException("쓰레기 사건이 아닙니다: " + trashId);
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
                case "대응중", "IN_PROGRESS" -> "IN_PROGRESS";
                default -> "PENDING";
            };
            incident.setStatus(newStatus);
        }
        if (request.getHandlerName() != null) {
            incident.setHandlerName(request.getHandlerName());
        }
        
        // 시간 업데이트
        OffsetDateTime now = OffsetDateTime.now(KST);
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
        
        // TrashDetail 업데이트
        TrashDetail detail = trashDetailRepository.findByIncidentId(trashId).orElse(null);
        if (detail == null) {
            detail = new TrashDetail();
            detail.setIncidentId(trashId);
            detail.setCreatedAt(now);
        }
        
        if (request.getMainCategory() != null) {
            detail.setMainCategory(request.getMainCategory());
        }
        if (request.getObjectAmount() != null) {
            detail.setObjectAmount(request.getObjectAmount());
        }
        if (request.getNote() != null) {
            detail.setNote(request.getNote());
        }
        
        trashDetailRepository.save(detail);
        
        // IncidentAction 로그 저장 (상태 변경 시)
        if (!prevStatus.equals(incident.getStatus())) {
            IncidentAction action = new IncidentAction();
            action.setIncidentId(saved.getId());
            action.setActionType("STATUS_CHANGED");
            action.setPrevStatus(prevStatus);
            action.setNextStatus(incident.getStatus());
            action.setActorId(request.getUpdatedById());
            action.setMemo("쓰레기 사건 수정: " + prevStatus + " → " + incident.getStatus());
            action.setCreatedAt(now);
            incidentActionRepository.save(action);
        }
        
        return toTrashIncidentItem(saved);
    }

    // 쓰레기 사건 상태 업데이트
    @org.springframework.transaction.annotation.Transactional
    public void updateTrashStatus(Long trashId, String status, String handlerName) {
        Incident incident = incidentRepository.findById(trashId)
                .orElseThrow(() -> new RuntimeException("쓰레기 사건을 찾을 수 없습니다: " + trashId));
        
        if (!"TRASH".equals(incident.getIncidentType())) {
            throw new RuntimeException("쓰레기 사건이 아닙니다: " + trashId);
        }
        
        // 이전 상태 저장 (incident_action 로그용)
        String prevStatus = incident.getStatus();
        
        // 상태 업데이트
        String newStatus = switch (status) {
            case "처리완료", "RESOLVED" -> "RESOLVED";
            case "대응중", "IN_PROGRESS" -> "IN_PROGRESS";
            default -> incident.getStatus();
        };
        incident.setStatus(newStatus);
        incident.setUpdatedAt(OffsetDateTime.now(KST)); // ✅ updated_at 자동 설정
        
        // 처리자 이름 업데이트
        if (handlerName != null && !handlerName.isEmpty()) {
            incident.setHandlerName(handlerName);
        }
        
        // 시간 업데이트
        OffsetDateTime now = OffsetDateTime.now(KST);
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

        // ✅ 실시간 이벤트 (상태 변경)
        publishAfterCommit("incident.updated", java.util.Map.of(
                "incidentId", incident.getId(),
                "incidentCode", incident.getIncidentCode(),
                "incidentType", incident.getIncidentType(),
                "status", incident.getStatus(),
                "detectedAt", incident.getDetectedAt() != null ? incident.getDetectedAt().toString() : null,
                "cctvId", incident.getCctvId(),
                "locationDesc", incident.getLocationDesc(),
                "sourceType", incident.getSourceType()
        ));
    }
    
    /**
     * 쓰레기 사건 상세정보 업데이트 (수동 등록 전용)
     */
    @Transactional
    public void updateTrashDetail(Long id, String memo, String severityLevel,
                                  String trashType, String amount, Long actorId) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("쓰레기 사건을 찾을 수 없습니다: " + id));
        
        if (!"TRASH".equals(incident.getIncidentType())) {
            throw new RuntimeException("쓰레기 사건이 아닙니다: " + id);
        }
        
        // 변경 전 값 저장 (이력 기록용)
        String prevMemo = incident.getMemo();
        String prevSeverity = incident.getSeverityLevel();
        TrashDetail detail = trashDetailRepository.findByIncidentId(id).orElse(null);
        String prevTrashType = detail != null ? detail.getMainCategory() : null;
        String prevAmount = detail != null ? detail.getObjectAmount() : null;
        
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
        incident.setUpdatedAt(OffsetDateTime.now(KST));
        incidentRepository.save(incident);
        
        // trash_detail 테이블 업데이트
        if (detail != null) {
            if (trashType != null && !trashType.isEmpty() && !trashType.equals(prevTrashType)) {
                detail.setMainCategory(trashType);
                changedFields.append("쓰레기종류, ");
            }
            if (amount != null && !amount.isEmpty() && !amount.equals(prevAmount)) {
                detail.setObjectAmount(amount);
                changedFields.append("양, ");
            }
            trashDetailRepository.save(detail);
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
            action.setCreatedAt(OffsetDateTime.now(KST));
            action.setActorId(actorId);
            incidentActionRepository.save(action);
        }
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

    
    /**
     * 신규 쓰레기 사건 등록 (수동 등록)
     */
    @Transactional
    public IncidentCreateResponse createTrash(TrashCreateRequest request) {
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
        incident.setIncidentType("TRASH");
        incident.setSourceType("MANUAL");
        incident.setSeverityLevel(request.getSeverityLevel().toUpperCase());
        incident.setStatus("PENDING");
        incident.setDetectedAt(request.getDetectedAt());
        incident.setLocationDesc(request.getLocationDesc());
        incident.setMemo(request.getMemo());
        incident.setCctvId(null); // ✅ 수동 등록은 CCTV ID 없음
        incident.setCreatedAt(OffsetDateTime.now(KST));
        incident.setUpdatedAt(OffsetDateTime.now(KST));
        
        // 1. 사고 코드 생성 (T-YYMMDD-001A 또는 T-YYMMDD-001M)
        String dateStr = incident.getDetectedAt().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String prefix = String.format("T-%s-", dateStr);
        
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
        
        // 3. TrashDetail 생성
        TrashDetail detail = new TrashDetail();
        detail.setIncidentId(incident.getId());
        detail.setMainCategory(request.getTrashType());
        detail.setObjectAmount(request.getAmount());
        detail.setNote(request.getMemo());
        detail.setCreatedAt(OffsetDateTime.now(KST));
        
        trashDetailRepository.save(detail);
        
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
        action.setMemo("신규 쓰레기 사건 등록");
        action.setCreatedAt(OffsetDateTime.now(KST));
        incidentActionRepository.save(action);
        
        // 수동 등록인 경우 IncidentManual 저장
        if ("MANUAL".equals(incident.getSourceType())) {
            // DB: created_by_id NOT NULL. 값이 없으면 400 에러 반환
            if (request.getCreatedById() == null) {
                throw new IllegalArgumentException("createdById는 필수입니다.");
            }
            IncidentManual manual = new IncidentManual();
            manual.setIncidentId(incident.getId());
            manual.setManualDescription(request.getMemo() != null ? request.getMemo() : "");
            manual.setManualLocation(request.getLocationDesc());
            manual.setCreatedById(request.getCreatedById());
            manual.setCreatedAt(OffsetDateTime.now(KST));
            incidentManualRepository.save(manual);
        }
        
        return IncidentCreateResponse.success(incident.getId(), incidentCode);
    }

    /**
     * Gemini 분석 결과로부터 자동 탐지 쓰레기 사건 등록
     * 
     * @param geminiJson Gemini 응답에서 추출한 JSON 객체 (Map 형태)
     * @param cctvId CCTV ID (선택, null 가능)
     * @param locationDesc 발생 위치 설명 (선택)
     * @return 생성된 사건 정보
     */
    @Transactional
    public IncidentCreateResponse createTrashFromGemini(
            java.util.Map<String, Object> geminiJson,
            Long cctvId,
            String locationDesc) {
        
        // JSON 구조 파싱
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> incidentMap = (java.util.Map<String, Object>) geminiJson.get("incident");
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> trashDetailMap = (java.util.Map<String, Object>) geminiJson.get("trash_detail");
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> incidentAutoMap = (java.util.Map<String, Object>) geminiJson.get("incident_auto");
        
        if (incidentMap == null) {
            throw new IllegalArgumentException("Gemini 응답에 incident 정보가 없습니다.");
        }
        
        // incident_type 확인 (원복: TRASH만 저장)
        String incidentType = (String) incidentMap.get("incident_type");
        if (!"TRASH".equals(incidentType)) {
            throw new IllegalArgumentException("쓰레기 사건이 아닙니다: " + incidentType);
        }
        
        // 1. Incident 생성
        Incident incident = new Incident();
        incident.setIncidentType("TRASH");
        incident.setSourceType("AUTO");
        incident.setStatus("PENDING");
        incident.setCctvId(cctvId);
        incident.setDetectedAt(OffsetDateTime.now(KST));
        incident.setLocationDesc(locationDesc != null ? locationDesc : "CCTV 자동 탐지");
        incident.setCreatedAt(OffsetDateTime.now(KST));
        incident.setUpdatedAt(OffsetDateTime.now(KST));
        
        // severity_level 변환 (VERY_HIGH, HIGH, MEDIUM, LOW, VERY_LOW -> DB 형식)
        String severityLevel = (String) incidentMap.get("severity_level");
        if (severityLevel != null) {
            severityLevel = severityLevel.toUpperCase();
            // VERY_HIGH -> HIGH, VERY_LOW -> LOW로 정규화
            if ("VERY_HIGH".equals(severityLevel)) {
                severityLevel = "HIGH";
            } else if ("VERY_LOW".equals(severityLevel)) {
                severityLevel = "LOW";
            }
            incident.setSeverityLevel(severityLevel);
        } else {
            incident.setSeverityLevel("MEDIUM");
        }
        
        // 1. 사고 코드 생성 (T-YYMMDD-001A)
        String dateStr = incident.getDetectedAt().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String prefix = String.format("T-%s-", dateStr);
        
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
        String incidentCode = String.format("%s%sA", prefix, sequence);
        
        incident.setIncidentCode(incidentCode);
        
        // 2. Incident 저장
        incident = incidentRepository.save(incident);
        
        // 3. TrashDetail 생성
        if (trashDetailMap != null) {
            TrashDetail detail = new TrashDetail();
            detail.setIncidentId(incident.getId());
            detail.setMainCategory((String) trashDetailMap.get("main_category"));
            detail.setObjectAmount((String) trashDetailMap.get("object_amount"));
            detail.setCreatedAt(OffsetDateTime.now(KST));
            trashDetailRepository.save(detail);
        }
        
        // 4. IncidentAuto 생성
        if (incidentAutoMap != null) {
            IncidentAuto incidentAuto = new IncidentAuto();
            incidentAuto.setIncidentId(incident.getId());
            // 모델/버전: Gemini로 고정(설정된 모델명 기록)
            incidentAuto.setDetectionModel(geminiModelName != null ? geminiModelName : "gemini");
            incidentAuto.setDetectionVersion("1.0");
            incidentAuto.setLocationDesc(locationDesc);
            incidentAuto.setIsValid(true);
            
            Object confidenceObj = incidentAutoMap.get("detection_confidence");
            if (confidenceObj != null) {
                if (confidenceObj instanceof Number) {
                    incidentAuto.setDetectionConfidence(((Number) confidenceObj).doubleValue());
                } else if (confidenceObj instanceof String) {
                    try {
                        incidentAuto.setDetectionConfidence(Double.parseDouble((String) confidenceObj));
                    } catch (NumberFormatException e) {
                        incidentAuto.setDetectionConfidence(0.0);
                    }
                }
            }
            
            incidentAuto.setConfidenceReason((String) incidentAutoMap.get("confidence_reason"));
            incidentAuto.setSeverityReason((String) incidentAutoMap.get("severity_level_reason"));
            incidentAuto.setDetectedFeatures((String) incidentAutoMap.get("detected_features"));
            incidentAuto.setAutoCreatedAt(OffsetDateTime.now(KST));
            incidentAutoRepository.save(incidentAuto);
        }
        
        // 5. IncidentAction 로그 저장 (CREATED)
        IncidentAction action = new IncidentAction();
        action.setIncidentId(incident.getId());
        action.setActionType("CREATED");
        action.setPrevStatus(null);
        action.setNextStatus("PENDING");
        action.setActorId(null);
        action.setAcknowledgedAt(null);
        action.setResolvedAt(null);
        action.setMemo("Gemini AI 자동 탐지");
        action.setCreatedAt(OffsetDateTime.now(KST));
        incidentActionRepository.save(action);

        // ✅ 실시간 이벤트 발행 (커밋 후)
        publishAfterCommit("incident.created", java.util.Map.of(
                "incidentId", incident.getId(),
                "incidentCode", incident.getIncidentCode(),
                "incidentType", incident.getIncidentType(),
                "status", incident.getStatus(),
                "detectedAt", incident.getDetectedAt() != null ? incident.getDetectedAt().toString() : null,
                "cctvId", incident.getCctvId(),
                "cctvCode", resolveCctvCodeOrNull(incident.getCctvId()),
                "locationDesc", incident.getLocationDesc(),
                "sourceType", incident.getSourceType()
        ));
        
        return IncidentCreateResponse.success(incident.getId(), incidentCode);
    }
}

