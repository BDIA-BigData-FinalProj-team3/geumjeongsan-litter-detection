package com.example.geumjeongsan.domain.incident;

import com.example.geumjeongsan.api.dto.IncidentCreateResponse;
import com.example.geumjeongsan.api.dto.RockfallCreateRequest;
import com.example.geumjeongsan.api.dto.RockfallDetailDto;
import com.example.geumjeongsan.api.dto.RockfallDashboardResponse;
import com.example.geumjeongsan.api.dto.RockfallIncidentItem;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RockfallService {

    private final IncidentRepository incidentRepository;
    private final RockfallDetailRepository rockfallDetailRepository;
    private final IncidentActionRepository incidentActionRepository;
    private final IncidentManualRepository incidentManualRepository;
    private final EntityManager entityManager;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public RockfallService(IncidentRepository incidentRepository,
                          RockfallDetailRepository rockfallDetailRepository,
                          IncidentActionRepository incidentActionRepository,
                          IncidentManualRepository incidentManualRepository,
                          EntityManager entityManager) {
        this.incidentRepository = incidentRepository;
        this.rockfallDetailRepository = rockfallDetailRepository;
        this.incidentActionRepository = incidentActionRepository;
        this.incidentManualRepository = incidentManualRepository;
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
                        i.getDetectedAt() != null &&
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

        // 위험지역 위치 + 발생 건수 (쿼리 실패해도 대시보드는 살아있게)
        List<RockfallDashboardResponse.RiskArea> riskAreas = List.of();
        try {
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
            riskAreas = riskResults.stream()
                    .map(row -> RockfallDashboardResponse.RiskArea.builder()
                            .address((String) row[0])
                            .incidentCount(((Number) row[1]).longValue())
                            .build())
                    .collect(Collectors.toList());
        } catch (Exception ignore) {
            // TODO: 필요하면 Logger 추가해서 에러 로그 남기기
            riskAreas = List.of();
        }

        // 발생 목록 (PENDING, IN_PROGRESS) - 최신순 정렬
        List<Incident> activeIncidents = incidentRepository.findByIncidentTypeAndStatusIn("ROCKFALL",
                List.of("PENDING", "IN_PROGRESS"));
        List<RockfallIncidentItem> activeItems = activeIncidents.stream()
                .filter(i -> i.getDetectedAt() != null) // null 제외
                .sorted((a, b) -> b.getDetectedAt().compareTo(a.getDetectedAt())) // 최신순 정렬
                .map(this::toRockfallIncidentItem)
                .collect(Collectors.toList());

        // 처리완료 목록 - 최신순 정렬
        List<Incident> resolvedIncidents = incidentRepository.findByIncidentTypeAndStatus("ROCKFALL", "RESOLVED");
        List<RockfallIncidentItem> resolvedItems = resolvedIncidents.stream()
                .filter(i -> i.getDetectedAt() != null) // null 제외
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
        // 상태 변환 (null-safe)
        String rawStatus = incident.getStatus();
        String status = switch (rawStatus == null ? "" : rawStatus) {
            case "PENDING" -> "대기중";
            case "IN_PROGRESS" -> "대응중";
            case "RESOLVED" -> "처리완료";
            default -> rawStatus == null ? "" : rawStatus;
        };

        // 심각도 변환 (null-safe)
        String rawSeverity = incident.getSeverityLevel();
        String severity = switch (rawSeverity == null ? "" : rawSeverity) {
            case "HIGH" -> "high";
            case "MEDIUM" -> "medium";
            case "LOW" -> "low";
            default -> "medium";
        };

        // 암괴 규모(rock_size_class) 조회 (DDL 기준)
        RockfallDetail rockfallDetail = rockfallDetailRepository.findByIncidentId(incident.getId()).orElse(null);
        String magnitude = "N/A";
        if (rockfallDetail != null && rockfallDetail.getRockSizeClass() != null) {
            magnitude = rockfallDetail.getRockSizeClass();
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
                .cctvId(incident.getCctvId() != null ? String.format("CCTV-%03d", incident.getCctvId()) : "수동등록")
                .incidentTime(incident.getDetectedAt() != null ? incident.getDetectedAt().format(DATE_FORMATTER) : "-")
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

    /**
     * 신규 낙석 사건 등록 (수동 등록)
     */
    @Transactional
    public IncidentCreateResponse createRockfall(RockfallCreateRequest request) {
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
        if (request.getRockSizeClass() == null || request.getRockSizeClass().trim().isEmpty()) {
            throw new IllegalArgumentException("암괴 규모(rock_size_class)는 필수입니다.");
        }
        if (request.getAffectedAssetType() == null || request.getAffectedAssetType().trim().isEmpty()) {
            throw new IllegalArgumentException("피해 대상 유형(affected_asset_type)은 필수입니다.");
        }
        
        // 1. Incident 생성
        Incident incident = new Incident();
        incident.setIncidentType("ROCKFALL");
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
        incidentRepository.flush(); // DB에 즉시 반영하여 ID 확보
        
        // flush 후에도 ID가 null일 수 있으므로 확인
        if (incident.getId() == null) {
            throw new IllegalStateException("Incident ID가 생성되지 않았습니다.");
        }
        
        // 2. 사고 코드 생성 (R-YYMMDD-001A 또는 R-YYMMDD-001M)
        LocalDate date = incident.getDetectedAt().toLocalDate();
        long count = incidentRepository.countByIncidentTypeAndDetectedAtDate("ROCKFALL", date);
        String sequence = String.format("%03d", count);
        String suffix = "AUTO".equals(incident.getSourceType()) ? "A" : "M";
        String incidentCode = String.format("R-%s-%s%s",
            incident.getDetectedAt().format(DateTimeFormatter.ofPattern("yyMMdd")),
            sequence,
            suffix
        );
        
        // 사고 코드를 Incident에 저장
        incident.setIncidentCode(incidentCode);
        incident = incidentRepository.save(incident);
        
        // 3. RockfallDetail 생성
        RockfallDetail detail = new RockfallDetail();
        detail.setIncidentId(incident.getId());
        detail.setRockSizeClass(request.getRockSizeClass().trim());
        detail.setAffectedAssetType(request.getAffectedAssetType().trim());
        detail.setAffectedAssetName(request.getAffectedAssetName() != null ? request.getAffectedAssetName().trim() : null);
        detail.setDamageDescription(request.getDamageDescription());
        
        rockfallDetailRepository.save(detail);
        
        // IncidentAction 로그 저장 (CREATED)
        IncidentAction action = new IncidentAction();
        action.setIncidentId(incident.getId());
        action.setActionType("CREATED");
        action.setPrevStatus(null);
        action.setNextStatus("PENDING");
        action.setActorId(request.getCreatedById());  // ✅ 등록자 저장
        action.setAcknowledgedAt(null);
        action.setResolvedAt(null);
        action.setMemo("신규 낙석 사건 등록");
        action.setCreatedAt(OffsetDateTime.now());
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
            manual.setCreatedAt(OffsetDateTime.now());
            incidentManualRepository.save(manual);
        }
        
        return IncidentCreateResponse.success(incident.getId(), incidentCode);
    }

    /**
     * 낙석 상세 조회 (rockfall_detail)
     */
    public RockfallDetailDto getRockfallDetail(Long incidentId) {
        RockfallDetail detail = rockfallDetailRepository.findByIncidentId(incidentId)
                .orElseThrow(() -> new RuntimeException("낙석 상세를 찾을 수 없습니다: " + incidentId));
        return RockfallDetailDto.from(detail);
    }

    /**
     * 낙석 상세 업데이트 (수동 등록/수정)
     * - incident: memo, severityLevel 업데이트
     * - rockfall_detail: DDL 컬럼 업데이트
     */
    @Transactional
    public void updateRockfallDetail(
            Long incidentId,
            String memo,
            String severityLevel,
            String rockSizeClass,
            String affectedAssetType,
            String affectedAssetName,
            String damageDescription
    ) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new RuntimeException("낙석 사건을 찾을 수 없습니다: " + incidentId));
        if (!"ROCKFALL".equals(incident.getIncidentType())) {
            throw new RuntimeException("낙석 사건이 아닙니다: " + incidentId);
        }

        // 변경 전 값 저장 (이력 기록용)
        String prevMemo = incident.getMemo();
        String prevSeverity = incident.getSeverityLevel();
        RockfallDetail detail = rockfallDetailRepository.findByIncidentId(incidentId).orElse(null);
        String prevRockSizeClass = detail != null ? detail.getRockSizeClass() : null;
        String prevAffectedAssetType = detail != null ? detail.getAffectedAssetType() : null;
        String prevAffectedAssetName = detail != null ? detail.getAffectedAssetName() : null;
        String prevDamageDescription = detail != null ? detail.getDamageDescription() : null;
        
        // 변경된 필드 추적
        StringBuilder changedFields = new StringBuilder();

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

        if (detail == null) {
            // 기존 데이터가 없으면 생성 (incident_id UNIQUE)
            detail = new RockfallDetail();
            detail.setIncidentId(incidentId);
        }

        if (rockSizeClass != null && !rockSizeClass.trim().isEmpty() && !rockSizeClass.trim().equals(prevRockSizeClass)) {
            detail.setRockSizeClass(rockSizeClass.trim());
            changedFields.append("암괴규모, ");
        }
        if (affectedAssetType != null && !affectedAssetType.trim().isEmpty() && !affectedAssetType.trim().equals(prevAffectedAssetType)) {
            detail.setAffectedAssetType(affectedAssetType.trim());
            changedFields.append("피해대상유형, ");
        }
        if (affectedAssetName != null) {
            String trimmedName = affectedAssetName.trim().isEmpty() ? null : affectedAssetName.trim();
            if (!trimmedName.equals(prevAffectedAssetName)) {
                detail.setAffectedAssetName(trimmedName);
                changedFields.append("피해대상식별, ");
            }
        }
        if (damageDescription != null && !damageDescription.equals(prevDamageDescription)) {
            detail.setDamageDescription(damageDescription);
            changedFields.append("피해설명, ");
        }

        rockfallDetailRepository.save(detail);
        
        // incident_action 테이블에 수정 이력 기록
        if (changedFields.length() > 0) {
            // 마지막 ", " 제거
            String changedFieldsStr = changedFields.toString().replaceAll(", $", "");
            
            IncidentAction action = new IncidentAction();
            action.setIncidentId(incidentId);
            action.setActionType("DETAIL_UPDATED");
            action.setPrevStatus(incident.getStatus());
            action.setNextStatus(incident.getStatus());  // 상태는 변경되지 않음
            action.setMemo("상세 정보 수정: " + changedFieldsStr);
            action.setCreatedAt(OffsetDateTime.now());
            // actorId는 추후 인증 시스템 구현 시 설정
            incidentActionRepository.save(action);
        }
    }
}

