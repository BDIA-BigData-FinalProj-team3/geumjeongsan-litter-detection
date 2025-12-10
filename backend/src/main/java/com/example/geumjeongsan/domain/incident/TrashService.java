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
    private final IncidentActionRepository incidentActionRepository;
    private final IncidentManualRepository incidentManualRepository;
    private final EntityManager entityManager;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public TrashService(IncidentRepository incidentRepository,
                       TrashDetailRepository trashDetailRepository,
                       IncidentSummaryRepository incidentSummaryRepository,
                       IncidentActionRepository incidentActionRepository,
                       IncidentManualRepository incidentManualRepository,
                       EntityManager entityManager) {
        this.incidentRepository = incidentRepository;
        this.trashDetailRepository = trashDetailRepository;
        this.incidentSummaryRepository = incidentSummaryRepository;
        this.incidentActionRepository = incidentActionRepository;
        this.incidentManualRepository = incidentManualRepository;
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
     * 쓰레기 사건 상세정보 업데이트 (수동 등록 전용)
     */
    @Transactional
    public void updateTrashDetail(Long id, String memo, String severityLevel, 
                                  String trashType, String amount) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("쓰레기 사건을 찾을 수 없습니다: " + id));
        
        if (!"TRASH".equals(incident.getIncidentType())) {
            throw new RuntimeException("쓰레기 사건이 아닙니다: " + id);
        }
        
        // incident 테이블 업데이트
        if (memo != null) {
            incident.setMemo(memo);
        }
        if (severityLevel != null) {
            String dbSeverity = switch (severityLevel) {
                case "상", "HIGH" -> "HIGH";
                case "중", "MEDIUM" -> "MEDIUM";
                case "하", "LOW" -> "LOW";
                default -> incident.getSeverityLevel();
            };
            incident.setSeverityLevel(dbSeverity);
        }
        incident.setUpdatedAt(OffsetDateTime.now());
        incidentRepository.save(incident);
        
        // trash_detail 테이블 업데이트
        TrashDetail detail = trashDetailRepository.findByIncidentId(id)
                .orElse(null);
        
        if (detail != null) {
            if (trashType != null && !trashType.isEmpty()) {
                detail.setMainCategory(trashType);
            }
            if (amount != null && !amount.isEmpty()) {
                detail.setObjectAmount(amount);
            }
            trashDetailRepository.save(detail);
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
        incident.setCctvId(null);
        incident.setCreatedAt(OffsetDateTime.now());
        incident.setUpdatedAt(OffsetDateTime.now());
        
        // Incident 저장
        incident = incidentRepository.save(incident);
        
        // 2. 사고 코드 생성 (T-YYMMDD-XXX)
        String incidentCode = String.format("T-%s-%03d", 
            incident.getDetectedAt().format(DateTimeFormatter.ofPattern("yyMMdd")), 
            incident.getId() % 1000);
        
        // 사고 코드를 Incident에 저장
        incident.setIncidentCode(incidentCode);
        incident = incidentRepository.save(incident);
        
        // 3. TrashDetail 생성
        TrashDetail detail = new TrashDetail();
        detail.setIncidentId(incident.getId());
        detail.setMainCategory(request.getTrashType());
        detail.setObjectAmount(request.getAmount());
        detail.setNote(request.getMemo());
        detail.setCreatedAt(OffsetDateTime.now());
        
        trashDetailRepository.save(detail);
        
        // IncidentAction 로그 저장 (CREATED)
        IncidentAction action = new IncidentAction();
        action.setIncidentId(incident.getId());
        action.setActionType("CREATED");
        action.setPrevStatus(null);
        action.setNextStatus("PENDING");
        action.setActorId(request.getCreatedById());  // ✅ 등록자 저장
        action.setAcknowledgedAt(null);
        action.setResolvedAt(null);
        action.setMemo("신규 쓰레기 사건 등록");
        action.setCreatedAt(OffsetDateTime.now());
        incidentActionRepository.save(action);
        
        // 수동 등록인 경우 IncidentManual 저장
        if ("MANUAL".equals(incident.getSourceType())) {
            IncidentManual manual = new IncidentManual();
            manual.setIncidentId(incident.getId());
            manual.setManualDescription(request.getMemo() != null ? request.getMemo() : "");
            manual.setManualLocation(request.getLocationDesc());
            manual.setCreatedById(null); // TODO: 실제 사용자 ID 연동
            manual.setCreatedAt(OffsetDateTime.now());
            incidentManualRepository.save(manual);
        }
        
        return IncidentCreateResponse.success(incident.getId(), incidentCode);
    }
}

