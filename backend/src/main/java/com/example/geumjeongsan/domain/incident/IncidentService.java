package com.example.geumjeongsan.domain.incident;

import com.example.geumjeongsan.api.dto.CCTVIncidentDetailResponse;
import com.example.geumjeongsan.api.dto.CCTVResponse;
import com.example.geumjeongsan.api.dto.DashboardStatsResponse;
import com.example.geumjeongsan.api.dto.EmergencyRequest;
import com.example.geumjeongsan.api.dto.EmergencyResponse;
import com.example.geumjeongsan.api.dto.FireResponse;
import com.example.geumjeongsan.api.dto.MapDataResponse;
import com.example.geumjeongsan.api.dto.MediaFileResponse;
import com.example.geumjeongsan.domain.cctv.CCTV;
import com.example.geumjeongsan.domain.cctv.CCTVRepository;
import com.example.geumjeongsan.domain.cctv.MapCCTV;
import com.example.geumjeongsan.domain.cctv.MapCCTVRepository;
import com.example.geumjeongsan.domain.media.MediaFile;
import com.example.geumjeongsan.domain.media.MediaFileRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Comparator;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final EmergencyDetailRepository emergencyDetailRepository;
    private final IncidentActionRepository incidentActionRepository;
    private final IncidentFalseReportRepository incidentFalseReportRepository;
    private final IncidentResponseRepository incidentResponseRepository;
    private final com.example.geumjeongsan.domain.staff.StaffUserRepository staffUserRepository;
    private final CCTVRepository cctvRepository;
    private final MapCCTVRepository mapCCTVRepository;
    private final MediaFileRepository mediaFileRepository;
    private final IncidentListViewRepository incidentListViewRepository;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    // 화면 표시는 항상 cctvCode를 우선
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

    private static String toKstIso(OffsetDateTime t) {
        if (t == null) return null;
        try {
            return t.atZoneSameInstant(KST).toOffsetDateTime().toString();
        } catch (Exception e) {
            // fallback: 기존 방식
            return t.toString();
        }
    }

    public IncidentService(IncidentRepository incidentRepository, 
                         EmergencyDetailRepository emergencyDetailRepository,
                         IncidentActionRepository incidentActionRepository,
                         IncidentFalseReportRepository incidentFalseReportRepository,
                         IncidentResponseRepository incidentResponseRepository,
                         CCTVRepository cctvRepository,
                         MapCCTVRepository mapCCTVRepository,
                         MediaFileRepository mediaFileRepository,
                         IncidentListViewRepository incidentListViewRepository,
                         EntityManager entityManager,
                         ObjectMapper objectMapper,
                         com.example.geumjeongsan.domain.staff.StaffUserRepository staffUserRepository) {
        this.incidentRepository = incidentRepository;
        this.emergencyDetailRepository = emergencyDetailRepository;
        this.incidentActionRepository = incidentActionRepository;
        this.incidentFalseReportRepository = incidentFalseReportRepository;
        this.incidentResponseRepository = incidentResponseRepository;
        this.cctvRepository = cctvRepository;
        this.mapCCTVRepository = mapCCTVRepository;
        this.mediaFileRepository = mediaFileRepository;
        this.incidentListViewRepository = incidentListViewRepository;
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
        this.staffUserRepository = staffUserRepository;
    }

    /**
     * 처리카드(incident_response) upsert + 담당자 배정(STAFF만)
     */
    @Transactional
    public IncidentResponse upsertIncidentResponse(Long incidentId, Long assignedToId, OffsetDateTime now) {
        IncidentResponse ir = incidentResponseRepository.findByIncidentId(incidentId)
                .orElseGet(() -> {
                    IncidentResponse x = new IncidentResponse();
                    x.setIncidentId(incidentId);
                    x.setCreatedAt(now);
                    return x;
                });

        if (assignedToId != null) {
            // STAFF 존재 확인(활성)
            staffUserRepository.findByIdAndIsActiveTrue(assignedToId)
                    .orElseThrow(() -> new IllegalArgumentException("처리자(STAFF)를 찾을 수 없습니다: " + assignedToId));
            ir.setAssignedToId(assignedToId);
        }
        ir.setUpdatedAt(now);
        return incidentResponseRepository.save(ir);
    }

    /**
     * 공통 Workflow: status 변경 + 담당자 배정 + action(actor) 로그
     */
    @Transactional
    public void updateIncidentWorkflow(Long incidentId, com.example.geumjeongsan.api.dto.IncidentWorkflowUpdateRequest req) {
        if (req == null) throw new IllegalArgumentException("request is null");
        if (req.getActorId() == null) throw new IllegalArgumentException("actorId required");

        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new RuntimeException("사건을 찾을 수 없습니다: " + incidentId));

        String prevStatus = incident.getStatus();
        String nextStatus = req.getStatus() != null ? req.getStatus() : prevStatus;

        OffsetDateTime now = OffsetDateTime.now();

        // 1) 처리카드 upsert + 담당자 배정
        IncidentResponse ir = upsertIncidentResponse(incidentId, req.getAssignedToId(), now);

        // 상태 기반 시간(간단 정책)
        if ("IN_PROGRESS".equals(nextStatus) || "EXTINGUISHING".equals(nextStatus)) {
            if (ir.getDispatchAt() == null) ir.setDispatchAt(now);
        }
        if ("RESOLVED".equals(nextStatus)) {
            if (ir.getCompletedAt() == null) ir.setCompletedAt(now);
        }
        ir.setUpdatedAt(now);
        incidentResponseRepository.save(ir);

        // 2) incident.status 업데이트
        incident.setStatus(nextStatus);
        incident.setUpdatedAt(now);
        incidentRepository.save(incident);

        // 3) incident_action 로그(actor)
        IncidentAction action = new IncidentAction();
        action.setIncidentId(incidentId);
        action.setActionType("STATUS_CHANGED");
        action.setPrevStatus(prevStatus);
        action.setNextStatus(nextStatus);
        action.setActorId(req.getActorId());
        action.setCreatedAt(now);
        incidentActionRepository.save(action);
    }

    // 화재 발생(PENDING, IN_PROGRESS) 목록 - 프론트엔드 형식으로 변환
    public List<FireResponse> getActiveFires() {
        // DB에서 직접 조회
        List<Incident> incidents = incidentRepository.findByIncidentTypeAndStatusIn("FIRE", List.of("PENDING", "IN_PROGRESS"));
        
        // DB에서 가져온 데이터를 프론트엔드 형식으로 변환
        return incidents.stream()
                .map(this::toFireResponse)
                .collect(Collectors.toList());
    }

    // 화재 처리완료(RESOLVED) 목록
    public List<FireResponse> getCompletedFires() {
        List<Incident> incidents = incidentRepository.findByIncidentTypeAndStatus("FIRE", "RESOLVED");
        
        return incidents.stream()
                .map(this::toFireResponse)
                .collect(Collectors.toList());
    }

    // 화재 상태 업데이트
    @Transactional
    public FireResponse updateFireStatus(Long id, com.example.geumjeongsan.api.dto.FireStatusUpdateRequest request) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("화재 기록을 찾을 수 없습니다: " + id));
        
        if (!"FIRE".equals(incident.getIncidentType())) {
            throw new RuntimeException("화재 기록이 아닙니다: " + id);
        }
        
        // 상태 변환: 진화중 -> IN_PROGRESS, 진화완료 -> RESOLVED
        String newStatus = switch (request.getStatus()) {
            case "진화중" -> "IN_PROGRESS";
            case "진화완료" -> "RESOLVED";
            default -> incident.getStatus();
        };
        
        incident.setStatus(newStatus);
        
        // 처리자 이름 업데이트
        if (request.getHandlerName() != null && !request.getHandlerName().isEmpty()) {
            incident.setHandlerName(request.getHandlerName());
        }
        
        // 상태에 따른 시간 업데이트
        if ("IN_PROGRESS".equals(newStatus) && incident.getAcknowledgedAt() == null) {
            incident.setAcknowledgedAt(OffsetDateTime.now());
        }
        if ("RESOLVED".equals(newStatus) && incident.getResolvedAt() == null) {
            incident.setResolvedAt(OffsetDateTime.now());
        }
        
        Incident saved = incidentRepository.save(incident);
        return toFireResponse(saved);
    }

    private FireResponse toFireResponse(Incident incident) {
        // 상태 변환: PENDING -> 대기중, IN_PROGRESS -> 진화중, RESOLVED -> 진화완료
        String status = switch (incident.getStatus()) {
            case "PENDING" -> "대기중";
            case "IN_PROGRESS" -> "진화중";
            case "RESOLVED" -> "진화완료";
            default -> incident.getStatus();
        };

        // 심각도 변환: HIGH -> high, MEDIUM -> medium, LOW -> low
        String severity = switch (incident.getSeverityLevel()) {
            case "HIGH" -> "high";
            case "MEDIUM" -> "medium";
            case "LOW" -> "low";
            default -> incident.getSeverityLevel().toLowerCase();
        };

        // 대응시각 및 소요시간 계산
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

        return FireResponse.builder()
                .id(incident.getId())
                .cctvId(resolveCctvCode(incident.getCctvId()))
                .time(incident.getDetectedAt().format(DATE_FORMATTER))
                .status(status)
                .severity(severity)
                .windSpeed("12km/h") // 기본값 (나중에 실제 풍속 데이터 추가 가능)
                .handler(incident.getHandlerName() != null ? incident.getHandlerName() : "119")
                .responseTime(responseTime)
                .duration(duration)
                .build();
    }

    // 쓰레기 투기 발생(PENDING, IN_PROGRESS) 목록
    public List<com.example.geumjeongsan.api.dto.TrashResponse> getActiveTrashIncidents() {
        List<Incident> incidents = incidentRepository.findByIncidentTypeAndStatusIn("TRASH", List.of("PENDING", "IN_PROGRESS"));
        return incidents.stream()
                .map(this::toTrashResponse)
                .collect(Collectors.toList());
    }

    // 쓰레기 투기 처리완료(RESOLVED) 목록
    public List<com.example.geumjeongsan.api.dto.TrashResponse> getCompletedTrashIncidents() {
        List<Incident> incidents = incidentRepository.findByIncidentTypeAndStatus("TRASH", "RESOLVED");
        return incidents.stream()
                .map(this::toTrashResponse)
                .collect(Collectors.toList());
    }

    // 낙석 발생(PENDING, IN_PROGRESS) 목록
    public List<com.example.geumjeongsan.api.dto.RockfallResponse> getActiveRockfalls() {
        List<Incident> incidents = incidentRepository.findByIncidentTypeAndStatusIn("ROCKFALL", List.of("PENDING", "IN_PROGRESS"));
        return incidents.stream()
                .map(this::toRockfallResponse)
                .collect(Collectors.toList());
    }

    // 낙석 처리완료(RESOLVED) 목록
    public List<com.example.geumjeongsan.api.dto.RockfallResponse> getCompletedRockfalls() {
        List<Incident> incidents = incidentRepository.findByIncidentTypeAndStatus("ROCKFALL", "RESOLVED");
        return incidents.stream()
                .map(this::toRockfallResponse)
                .collect(Collectors.toList());
    }

    // 응급 상황 발생(PENDING, IN_PROGRESS) 목록 (EmergencyDashboard용)
    public List<com.example.geumjeongsan.api.dto.EmergencyResponse> getActiveEmergencies() {
        List<Incident> incidents = incidentRepository.findByIncidentTypeAndStatusIn("EMERGENCY", List.of("PENDING", "IN_PROGRESS"));
        return incidents.stream()
                .map(this::toEmergencyResponse)
                .collect(Collectors.toList());
    }

    // 응급 상황 처리완료(RESOLVED) 목록 (EmergencyDashboard용)
    public List<com.example.geumjeongsan.api.dto.EmergencyResponse> getCompletedEmergencies() {
        List<Incident> incidents = incidentRepository.findByIncidentTypeAndStatus("EMERGENCY", "RESOLVED");
        return incidents.stream()
                .map(this::toEmergencyResponse)
                .collect(Collectors.toList());
    }

    // Incident -> TrashResponse 변환
    private com.example.geumjeongsan.api.dto.TrashResponse toTrashResponse(Incident incident) {
        String status = switch (incident.getStatus()) {
            case "PENDING" -> "대기중";
            case "IN_PROGRESS" -> "대응중";
            case "RESOLVED" -> "처리완료";
            default -> incident.getStatus();
        };

        String severity = switch (incident.getSeverityLevel()) {
            case "HIGH" -> "high";
            case "MEDIUM" -> "medium";
            case "LOW" -> "low";
            default -> incident.getSeverityLevel().toLowerCase();
        };

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

        // memo에서 쓰레기 유형 추출 (없으면 기본값)
        String trashType = "일반쓰레기";
        if (incident.getMemo() != null && !incident.getMemo().isEmpty()) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> memoData = (Map<String, Object>) objectMapper.readValue(incident.getMemo(), Map.class);
                trashType = (String) memoData.getOrDefault("trashType", "일반쓰레기");
            } catch (JsonProcessingException e) {
                // 파싱 실패 시 기본값 사용
            }
        }

        return com.example.geumjeongsan.api.dto.TrashResponse.builder()
                .id(incident.getId())
                .cctvId(resolveCctvCode(incident.getCctvId()))
                .time(incident.getDetectedAt().format(DATE_FORMATTER))
                .status(status)
                .severity(severity)
                .type(trashType)
                .handler(incident.getHandlerName() != null ? incident.getHandlerName() : "환경 관리 직원")
                .responseTime(responseTime)
                .duration(duration)
                .build();
    }

    // Incident -> RockfallResponse 변환
    @SuppressWarnings("unchecked")
    private com.example.geumjeongsan.api.dto.RockfallResponse toRockfallResponse(Incident incident) {
        String status = switch (incident.getStatus()) {
            case "PENDING" -> "대기중";
            case "IN_PROGRESS" -> "대응중";
            case "RESOLVED" -> "처리완료";
            default -> incident.getStatus();
        };

        String severity = switch (incident.getSeverityLevel()) {
            case "HIGH" -> "high";
            case "MEDIUM" -> "medium";
            case "LOW" -> "low";
            default -> incident.getSeverityLevel().toLowerCase();
        };

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

        // memo에서 규모 추출 (없으면 기본값)
        String magnitude = "2.0";
        if (incident.getMemo() != null && !incident.getMemo().isEmpty()) {
            try {
                Map<String, Object> memoData = (Map<String, Object>) objectMapper.readValue(incident.getMemo(), Map.class);
                magnitude = (String) memoData.getOrDefault("magnitude", "2.0");
            } catch (JsonProcessingException e) {
                // 파싱 실패 시 기본값 사용
            }
        }

        return com.example.geumjeongsan.api.dto.RockfallResponse.builder()
                .id(incident.getId())
                .cctvId(resolveCctvCode(incident.getCctvId()))
                .time(incident.getDetectedAt().format(DATE_FORMATTER))
                .status(status)
                .severity(severity)
                .magnitude(magnitude)
                .handler(incident.getHandlerName() != null ? incident.getHandlerName() : "산림 관리 직원")
                .responseTime(responseTime)
                .duration(duration)
                .build();
    }

    // 응급환자 기록 저장
    @Transactional
    public EmergencyResponse createEmergency(EmergencyRequest request) {
        Incident incident = new Incident();
        
        // CCTV ID에서 숫자 추출 (예: "CCTV-001" -> 1)
        String cctvIdStr = request.getCctvId().replace("CCTV-", "").trim();
        Long cctvId = Long.parseLong(cctvIdStr);
        incident.setCctvId(cctvId);
        
        incident.setIncidentType("EMERGENCY");
        
        // 심각도 변환: critical -> HIGH, moderate -> MEDIUM, low -> LOW
        String severityLevel = switch (request.getSeverity()) {
            case "critical" -> "HIGH";
            case "moderate" -> "MEDIUM";
            case "low" -> "LOW";
            default -> "MEDIUM";
        };
        incident.setSeverityLevel(severityLevel);
        
        // 상태 변환: 대응중 -> IN_PROGRESS, 이송완료/처리완료 -> RESOLVED
        String status = switch (request.getStatus()) {
            case "대응중" -> "IN_PROGRESS";
            case "이송완료", "처리완료" -> "RESOLVED";
            default -> "PENDING";
        };
        incident.setStatus(status);
        
        // 발생시간 파싱
        LocalDateTime localDateTime = LocalDateTime.parse(request.getIncidentTime(), DATE_FORMATTER);
        incident.setDetectedAt(localDateTime.atOffset(java.time.ZoneOffset.of("+09:00")));
        
        // 대응중이면 acknowledged_at도 설정
        if ("대응중".equals(request.getStatus())) {
            incident.setAcknowledgedAt(OffsetDateTime.now());
        }
        
        // 처리완료면 resolved_at 설정
        if ("처리완료".equals(request.getStatus())) {
            incident.setResolvedAt(OffsetDateTime.now());
        }
        
        incident.setLocationDesc(request.getLocation());
        incident.setHandlerName(request.getResponseTeam());
        
        Incident saved = incidentRepository.save(incident);
        
        // emergency_detail 테이블에 저장
        EmergencyDetail emergencyDetail = new EmergencyDetail();
        emergencyDetail.setIncidentId(saved.getId());
        emergencyDetail.setPatientName(request.getPatientName());
        emergencyDetail.setPatientAge(request.getAge() != null ? String.valueOf(request.getAge()) : null);
        emergencyDetail.setPatientGender(request.getGender());
        emergencyDetail.setSymptom(request.getSymptoms());
        emergencyDetail.setSeverityLevel(severityLevel);
        // emergencyDetail.setStatus(status); // DB에 status 컬럼 없음
        emergencyDetail.setResponseTeam(request.getResponseTeam());
        emergencyDetail.setLocationDesc(request.getLocation());
        emergencyDetail.setOccurredAt(saved.getDetectedAt());
        emergencyDetail.setCreatedAt(OffsetDateTime.now());
        
        emergencyDetailRepository.save(emergencyDetail);
        
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
        
        // 수동 등록인 경우 IncidentManual 저장 (IncidentService는 대부분 MANUAL)
        if (saved.getSourceType() == null || "MANUAL".equals(saved.getSourceType())) {
            // DB: created_by_id NOT NULL. IncidentService 쪽은 request에 createdById가 없어서 저장을 생략.
            // (필요하면 인증 연동 후 SecurityContext의 userId로 채우도록 개선)
            // IncidentManual은 optional이므로 없는 상태로 incident만 저장해도 무방.
        }
        
        return toEmergencyResponse(saved);
    }

    // 응급환자 기록 조회 - DB에서 직접 조회
    public List<EmergencyResponse> getAllEmergencies() {
        // DB에서 EMERGENCY 타입의 모든 기록 조회
        List<Incident> incidents = incidentRepository.findByIncidentType("EMERGENCY");
        
        // DB에서 가져온 데이터를 프론트엔드 형식으로 변환
        return incidents.stream()
                .map(this::toEmergencyResponse)
                .collect(Collectors.toList());
    }

    // 응급환자 기록 수정
    @Transactional
    public EmergencyResponse updateEmergency(Long id, EmergencyRequest request) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("응급환자 기록을 찾을 수 없습니다: " + id));
        
        // CCTV ID 업데이트
        String cctvIdStr = request.getCctvId().replace("CCTV-", "").trim();
        Long cctvId = Long.parseLong(cctvIdStr);
        incident.setCctvId(cctvId);
        
        // 이전 상태 저장 (incident_action 로그용)
        String prevStatus = incident.getStatus();
        
        // 심각도 업데이트
        String severityLevel = switch (request.getSeverity()) {
            case "critical" -> "HIGH";
            case "moderate" -> "MEDIUM";
            case "low" -> "LOW";
            default -> "MEDIUM";
        };
        incident.setSeverityLevel(severityLevel);
        
        // 상태 업데이트
        String status = switch (request.getStatus()) {
            case "대응중" -> "IN_PROGRESS";
            case "이송완료", "처리완료" -> "RESOLVED";
            default -> "PENDING";
        };
        incident.setStatus(status);
        
        // 발생시간 업데이트
        LocalDateTime localDateTime = LocalDateTime.parse(request.getIncidentTime(), DATE_FORMATTER);
        incident.setDetectedAt(localDateTime.atOffset(java.time.ZoneOffset.of("+09:00")));
        
        // 상태에 따른 시간 업데이트
        if ("대응중".equals(request.getStatus()) && incident.getAcknowledgedAt() == null) {
            incident.setAcknowledgedAt(OffsetDateTime.now());
        }
        if ("처리완료".equals(request.getStatus()) && incident.getResolvedAt() == null) {
            incident.setResolvedAt(OffsetDateTime.now());
        }
        
        incident.setLocationDesc(request.getLocation());
        incident.setHandlerName(request.getResponseTeam());
        
        Incident saved = incidentRepository.save(incident);
        
        // emergency_detail 테이블 업데이트 (존재하면 업데이트, 없으면 생성)
        EmergencyDetail emergencyDetail = emergencyDetailRepository.findByIncidentId(id)
                .orElse(new EmergencyDetail());
        
        emergencyDetail.setIncidentId(saved.getId());
        emergencyDetail.setPatientName(request.getPatientName());
        emergencyDetail.setPatientAge(request.getAge() != null ? String.valueOf(request.getAge()) : null);
        emergencyDetail.setPatientGender(request.getGender());
        emergencyDetail.setSymptom(request.getSymptoms());
        emergencyDetail.setSeverityLevel(severityLevel);
        // emergencyDetail.setStatus(status); // DB에 status 컬럼 없음
        emergencyDetail.setResponseTeam(request.getResponseTeam());
        emergencyDetail.setLocationDesc(request.getLocation());
        emergencyDetail.setOccurredAt(saved.getDetectedAt());
        if (emergencyDetail.getCreatedAt() == null) {
            emergencyDetail.setCreatedAt(OffsetDateTime.now());
        }
        
        emergencyDetailRepository.save(emergencyDetail);
        
        // IncidentAction 로그 저장 (상태 변경)
        if (!prevStatus.equals(status)) {
            IncidentAction action = new IncidentAction();
            action.setIncidentId(saved.getId());
            action.setActionType("STATUS_CHANGED");
            action.setPrevStatus(prevStatus);
            action.setNextStatus(status);
            action.setActorId(null); // TODO: 실제 사용자 ID 연동
            action.setMemo("상태 변경: " + prevStatus + " → " + status);
            action.setCreatedAt(OffsetDateTime.now());
            incidentActionRepository.save(action);
        }
        
        return toEmergencyResponse(saved);
    }

    // 응급환자 기록 삭제
    @Transactional
    public void deleteEmergency(Long id) {
        incidentRepository.deleteById(id);
    }

    // Incident -> EmergencyResponse 변환
    private EmergencyResponse toEmergencyResponse(Incident incident) {
        // emergency_detail 테이블에서 데이터 가져오기
        EmergencyDetail emergencyDetail = emergencyDetailRepository.findByIncidentId(incident.getId())
                .orElse(null);
        
        // 상태 변환: IN_PROGRESS -> 대응중, RESOLVED -> 처리완료/이송완료
        String status = switch (incident.getStatus()) {
            case "IN_PROGRESS" -> "대응중";
            case "RESOLVED" -> {
                // transfer_dest가 있으면 "이송완료", 아니면 "처리완료"
                if (emergencyDetail != null && emergencyDetail.getTransferDest() != null && !emergencyDetail.getTransferDest().isEmpty()) {
                    yield "이송완료";
                }
                yield "처리완료";
            }
            default -> "대기중";
        };
        
        // 심각도 변환: HIGH -> critical, MEDIUM -> moderate, LOW -> low
        String severity = switch (incident.getSeverityLevel()) {
            case "HIGH" -> "critical";
            case "MEDIUM" -> "moderate";
            case "LOW" -> "low";
            default -> "moderate";
        };
        
        // emergency_detail이 있으면 그 데이터 사용, 없으면 incident의 기본값 사용
        String patientName = emergencyDetail != null ? emergencyDetail.getPatientName() : "";
        String patientAge = emergencyDetail != null ? emergencyDetail.getPatientAge() : null;
        String gender = emergencyDetail != null ? emergencyDetail.getPatientGender() : "";
        String symptoms = emergencyDetail != null ? emergencyDetail.getSymptom() : "";
        String responseTeam = emergencyDetail != null && emergencyDetail.getResponseTeam() != null 
                ? emergencyDetail.getResponseTeam() 
                : incident.getHandlerName();
        String location = emergencyDetail != null && emergencyDetail.getLocationDesc() != null
                ? emergencyDetail.getLocationDesc()
                : incident.getLocationDesc();
        
        // notes는 emergency_detail에 없으므로 memo에서 가져오기 (하위 호환성)
        String notes = "";
        if (incident.getMemo() != null && !incident.getMemo().isEmpty()) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> memoData = (Map<String, Object>) objectMapper.readValue(incident.getMemo(), Map.class);
                notes = (String) memoData.getOrDefault("notes", "");
            } catch (JsonProcessingException e) {
                // JSON 파싱 실패 시 빈 문자열 사용
            }
        }
        
        return EmergencyResponse.builder()
                .id(incident.getId())
                .patientName(patientName != null ? patientName : "")
                .age(patientAge != null && !patientAge.isEmpty() ? Integer.parseInt(patientAge.replaceAll("[^0-9]", "0")) : null)
                .gender(gender != null ? gender : "")
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

    // 대시보드 통계 조회
    public DashboardStatsResponse getDashboardStats() {
        // 전체 사건 수
        long totalIncidents = incidentRepository.count();
        
        // 활성 사건 수 (PENDING, IN_PROGRESS)
        long activeIncidents = incidentRepository.findByIncidentTypeAndStatusIn("FIRE", List.of("PENDING", "IN_PROGRESS")).size()
                + incidentRepository.findByIncidentTypeAndStatusIn("EMERGENCY", List.of("PENDING", "IN_PROGRESS")).size()
                + incidentRepository.findByIncidentTypeAndStatusIn("ROCKFALL", List.of("PENDING", "IN_PROGRESS")).size()
                + incidentRepository.findByIncidentTypeAndStatusIn("TRASH", List.of("PENDING", "IN_PROGRESS")).size();
        
        // 처리완료 사건 수
        long resolvedIncidents = incidentRepository.findByIncidentTypeAndStatus("FIRE", "RESOLVED").size()
                + incidentRepository.findByIncidentTypeAndStatus("EMERGENCY", "RESOLVED").size()
                + incidentRepository.findByIncidentTypeAndStatus("ROCKFALL", "RESOLVED").size()
                + incidentRepository.findByIncidentTypeAndStatus("TRASH", "RESOLVED").size();
        
        // 유형별 통계
        long fireCount = incidentRepository.findByIncidentType("FIRE").size();
        long emergencyCount = incidentRepository.findByIncidentType("EMERGENCY").size();
        long rockfallCount = incidentRepository.findByIncidentType("ROCKFALL").size();
        long trashCount = incidentRepository.findByIncidentType("TRASH").size();
        
        // 상태별 통계
        long pendingCount = incidentRepository.findAll().stream()
                .filter(i -> "PENDING".equals(i.getStatus())).count();
        long inProgressCount = incidentRepository.findAll().stream()
                .filter(i -> "IN_PROGRESS".equals(i.getStatus())).count();
        long resolvedCount = incidentRepository.findAll().stream()
                .filter(i -> "RESOLVED".equals(i.getStatus())).count();
        
        // CCTV 통계
        long totalCctv = cctvRepository.count();
        long activeCctv = cctvRepository.findByIsActiveTrue().size();
        long inactiveCctv = cctvRepository.findByIsActiveFalse().size();
        
        // 평균 대응시간 계산 (acknowledged_at과 resolved_at이 모두 있는 경우)
        List<Incident> resolvedIncidentsList = incidentRepository.findAll().stream()
                .filter(i -> i.getAcknowledgedAt() != null && i.getResolvedAt() != null)
                .collect(Collectors.toList());
        
        double avgResponseTime = 0.0;
        if (!resolvedIncidentsList.isEmpty()) {
            long totalMinutes = resolvedIncidentsList.stream()
                    .mapToLong(i -> java.time.Duration.between(i.getAcknowledgedAt(), i.getResolvedAt()).toMinutes())
                    .sum();
            avgResponseTime = (double) totalMinutes / resolvedIncidentsList.size();
        }
        
        return DashboardStatsResponse.builder()
                .totalIncidents(totalIncidents)
                .activeIncidents(activeIncidents)
                .resolvedIncidents(resolvedIncidents)
                .fireCount(fireCount)
                .emergencyCount(emergencyCount)
                .rockfallCount(rockfallCount)
                .trashCount(trashCount)
                .pendingCount(pendingCount)
                .inProgressCount(inProgressCount)
                .resolvedCount(resolvedCount)
                .totalCctv(totalCctv)
                .activeCctv(activeCctv)
                .inactiveCctv(inactiveCctv)
                .avgResponseTime(avgResponseTime)
                .build();
    }

    // 모든 CCTV 조회 (VIEW 사용)
    // 
    // VIEW 확장 SQL (DB에서 실행 필요):
    // DROP VIEW IF EXISTS view_map_cctv;
    // CREATE OR REPLACE VIEW view_map_cctv AS
    // SELECT 
    //     c.cctv_id,
    //     c.cctv_code,
    //     c.cctv_code as name,
    //     COALESCE(c.cctv_address_description, c.cctv_address) as location_desc,
    //     c.install_date,
    //     c.model_name,
    //     NULL::VARCHAR(20) as resolution,
    //     c.is_active,
    //     COALESCE(s.power_status, 'OFF') as power_status,
    //     c.geom,
    //     COUNT(i.incident_id) as incident_count,
    //     MAX(i.detected_at) as last_incident_at,
    //     MAX(CASE 
    //         WHEN i.detected_at = (
    //             SELECT MAX(detected_at) 
    //             FROM incident 
    //             WHERE cctv_id = c.cctv_id
    //         ) 
    //         THEN i.incident_type 
    //     END) as last_incident_type
    // FROM cctv_info c
    // LEFT JOIN cctv_status s ON c.cctv_id = s.cctv_id
    // LEFT JOIN incident i ON c.cctv_id = i.cctv_id
    // GROUP BY 
    //     c.cctv_id, 
    //     c.cctv_code, 
    //     c.cctv_address,
    //     c.cctv_address_description,
    //     c.install_date, 
    //     c.model_name, 
    //     c.is_active, 
    //     s.power_status, 
    //     c.geom;
    //
    public List<CCTVResponse> getAllCCTV() {
        List<MapCCTV> viewList = mapCCTVRepository.findAll();

        // ✅ CCTV 관리 화면의 "사건/최근 탐지시간/유형"은 '미처리(status != RESOLVED)' 기준이어야 함.
        // DB View(view_cctv_management)가 전체 사건 기준으로 집계되어 있어도, 여기서 한 번 더 "미처리"로 덮어쓴다.
        // - incident.status 기반 (PENDING/IN_PROGRESS/EXTINGUISHING 등 모두 포함)
        // - incident_response.completed_at 등과 무관하게 프론트 표시 정책을 status로 통일
        final Map<Long, ActiveIncidentSummary> activeSummaryByCctvId = loadActiveIncidentSummaryByCctvId();

        return viewList.stream().map(view -> {
            // geom에서 경도/위도 추출
            Double longitude = null;
            Double latitude = null;
            if (view.getGeomDto() != null) {
                longitude = view.getGeomDto().x;
                latitude = view.getGeomDto().y;
            }

            ActiveIncidentSummary s = activeSummaryByCctvId.get(view.getCctvId());
            Long activeCount = s != null ? s.incidentCount : 0L;
            OffsetDateTime lastAt = s != null ? s.lastIncidentAt : null;
            String lastType = s != null ? s.lastIncidentType : null;
            
            return CCTVResponse.builder()
                    .id(view.getCctvId())
                    .cctvCode(view.getCctvCode())
                    .name(view.getName())
                    .locationDesc(view.getLocationDesc())
                    .cctvAddress(view.getCctvAddress())
                    .installDate(view.getInstallDate() != null ? view.getInstallDate().toString() : null)
                    .modelName(view.getModelName())
                    .resolution(view.getResolution())
                    .isActive(view.getIsActive())
                    .powerStatus(view.getPowerStatus())
                    .healthStatus(view.getHealthStatus())
                    .lastHeartbeat(toKstIso(view.getLastHeartbeat()))
                    .longitude(longitude)
                    .latitude(latitude)
                    .incidentCount(activeCount)
                    .lastIncidentTime(toKstIso(lastAt))
                    .lastIncidentType(lastType)
                    .build();
        }).collect(Collectors.toList());
    }

    // 활성 CCTV만 조회
    public List<CCTVResponse> getActiveCCTV() {
        return getAllCCTV().stream()
                .filter(c -> c.getIsActive() != null && c.getIsActive())
                .collect(Collectors.toList());
    }

    // CCTV ID로 조회 (VIEW 사용)
    public CCTVResponse getCCTVById(Long id) {
        MapCCTV view = mapCCTVRepository.findById(id).orElse(null);
        
        if (view == null) {
            return null;
        }
        
        // geom에서 경도/위도 추출
        Double longitude = null;
        Double latitude = null;
        if (view.getGeomDto() != null) {
            longitude = view.getGeomDto().x;
            latitude = view.getGeomDto().y;
        }
        
        // 미처리 사건 요약 (단건)
        ActiveIncidentSummary s = loadActiveIncidentSummaryByCctvId().get(view.getCctvId());
        Long activeCount = s != null ? s.incidentCount : 0L;
        OffsetDateTime lastAt = s != null ? s.lastIncidentAt : null;
        String lastType = s != null ? s.lastIncidentType : null;

        return CCTVResponse.builder()
                .id(view.getCctvId())
                .cctvCode(view.getCctvCode())
                .name(view.getName())
                .locationDesc(view.getLocationDesc())
                .cctvAddress(view.getCctvAddress())
                .installDate(view.getInstallDate() != null ? view.getInstallDate().toString() : null)
                .modelName(view.getModelName())
                .resolution(view.getResolution())
                .isActive(view.getIsActive())
                .powerStatus(view.getPowerStatus())
                .healthStatus(view.getHealthStatus())
                .lastHeartbeat(toKstIso(view.getLastHeartbeat()))
                .longitude(longitude)
                .latitude(latitude)
                .incidentCount(activeCount)
                .lastIncidentTime(toKstIso(lastAt))
                .lastIncidentType(lastType)
                .build();
    }

    private static class ActiveIncidentSummary {
        final Long incidentCount;
        final OffsetDateTime lastIncidentAt;
        final String lastIncidentType;

        private ActiveIncidentSummary(Long incidentCount, OffsetDateTime lastIncidentAt, String lastIncidentType) {
            this.incidentCount = incidentCount;
            this.lastIncidentAt = lastIncidentAt;
            this.lastIncidentType = lastIncidentType;
        }
    }

    /**
     * CCTV별 "미처리(status != RESOLVED)" 사건 요약을 한 번에 로드한다.
     * - incidentCount: 미처리 사건 수
     * - lastIncidentAt/Type: 미처리 사건 중 가장 최근 1건
     */
    private Map<Long, ActiveIncidentSummary> loadActiveIncidentSummaryByCctvId() {
        try {
            final String sql =
                    "WITH counts AS ( " +
                    "  SELECT i.cctv_id, COUNT(*)::bigint AS incident_count " +
                    "  FROM incident i " +
                    "  WHERE i.cctv_id IS NOT NULL AND i.status IS DISTINCT FROM 'RESOLVED' " +
                    "  GROUP BY i.cctv_id " +
                    "), lasts AS ( " +
                    "  SELECT DISTINCT ON (i.cctv_id) i.cctv_id, i.detected_at AS last_incident_at, i.incident_type AS last_incident_type " +
                    "  FROM incident i " +
                    "  WHERE i.cctv_id IS NOT NULL AND i.status IS DISTINCT FROM 'RESOLVED' " +
                    "  ORDER BY i.cctv_id, i.detected_at DESC " +
                    ") " +
                    "SELECT c.cctv_id, c.incident_count, l.last_incident_at, l.last_incident_type " +
                    "FROM counts c " +
                    "LEFT JOIN lasts l ON l.cctv_id = c.cctv_id";

            Query q = entityManager.createNativeQuery(sql);
            @SuppressWarnings("unchecked")
            List<Object[]> rows = q.getResultList();
            Map<Long, ActiveIncidentSummary> map = new HashMap<>();
            for (Object[] r : rows) {
                if (r == null || r.length < 4) continue;
                Long cctvId = r[0] instanceof Number ? ((Number) r[0]).longValue() : null;
                if (cctvId == null) continue;
                Long cnt = r[1] instanceof Number ? ((Number) r[1]).longValue() : 0L;
                OffsetDateTime lastAt = (r[2] instanceof OffsetDateTime) ? (OffsetDateTime) r[2] : null;
                String lastType = r[3] != null ? String.valueOf(r[3]) : null;
                map.put(cctvId, new ActiveIncidentSummary(cnt, lastAt, lastType));
            }
            return map;
        } catch (Exception e) {
            // 실패 시: "미처리 사건 없음"으로 처리 (UI가 과잉 경고하지 않게)
            return Map.of();
        }
    }

    // 지도 데이터 조회 (CCTV, 사건, 헬기 착륙지, 낙석 센서)
    public MapDataResponse getMapData() {
        // CCTV 마커 조회 (경도/위도 포함)
        String cctvSql = "SELECT c.cctv_id, c.cctv_code, c.name, c.location_desc, " +
                         "c.is_active, c.power_status, " +
                         "ST_X(c.geom) as longitude, ST_Y(c.geom) as latitude, " +
                         "COUNT(DISTINCT CASE WHEN i.incident_type = 'FIRE' THEN i.incident_id END) as fire_count, " +
                         "COUNT(DISTINCT CASE WHEN i.incident_type = 'ROCKFALL' THEN i.incident_id END) as rockfall_count, " +
                         "COUNT(DISTINCT CASE WHEN i.incident_type = 'TRASH' THEN i.incident_id END) as trash_count, " +
                         "COUNT(DISTINCT CASE WHEN i.incident_type = 'EMERGENCY' THEN i.incident_id END) as emergency_count " +
                         "FROM cctv c " +
                         "LEFT JOIN incident i ON c.cctv_id = i.cctv_id " +
                         "GROUP BY c.cctv_id, c.cctv_code, c.name, c.location_desc, c.is_active, c.power_status, c.geom " +
                         "ORDER BY c.cctv_id";
        
        Query cctvQuery = entityManager.createNativeQuery(cctvSql);
        @SuppressWarnings("unchecked")
        List<Object[]> cctvResults = cctvQuery.getResultList();
        
        List<MapDataResponse.CCTVMarker> cctvMarkers = cctvResults.stream().map(row -> {
            String cctvCode = (String) row[1];
            String name = (String) row[2];
            String locationDesc = (String) row[3];
            Boolean isActive = (Boolean) row[4];
            String powerStatus = (String) row[5];
            Double longitude = row[6] != null ? ((Number) row[6]).doubleValue() : null;
            Double latitude = row[7] != null ? ((Number) row[7]).doubleValue() : null;
            Long fireCount = ((Number) row[8]).longValue();
            Long rockfallCount = ((Number) row[9]).longValue();
            Long trashCount = ((Number) row[10]).longValue();
            Long emergencyCount = ((Number) row[11]).longValue();
            
            String status = (isActive != null && isActive && "on".equals(powerStatus)) ? "정상" : "점검필요";
            
            MapDataResponse.IncidentCounts incidents = MapDataResponse.IncidentCounts.builder()
                    .fire(fireCount > 0 ? fireCount : null)
                    .rockfall(rockfallCount > 0 ? rockfallCount : null)
                    .trash(trashCount > 0 ? trashCount : null)
                    .emergency(emergencyCount > 0 ? emergencyCount : null)
                    .build();
            
            return MapDataResponse.CCTVMarker.builder()
                    .id(cctvCode)
                    .cctvCode(cctvCode)
                    .name(name)
                    .location(locationDesc != null ? locationDesc : name)
                    .status(status)
                    .longitude(longitude)
                    .latitude(latitude)
                    .incidentCount(fireCount + rockfallCount + trashCount + emergencyCount)
                    .incidents(incidents)
                    .build();
        }).collect(Collectors.toList());
        
        // 활성 사건 마커 조회 (CCTV 위치 기반)
        String incidentSql = "SELECT i.incident_id, i.cctv_id, i.incident_type, i.severity_level, i.status, " +
                             "i.detected_at, " +
                             "i.detection_model, i.detection_confidence, " +
                             "ST_X(c.geom) as longitude, ST_Y(c.geom) as latitude " +
                             "FROM incident i " +
                             "JOIN cctv c ON i.cctv_id = c.cctv_id " +
                             "WHERE i.status IN ('PENDING', 'IN_PROGRESS', 'EXTINGUISHING') " +
                             "ORDER BY i.detected_at DESC";
        
        Query incidentQuery = entityManager.createNativeQuery(incidentSql);
        @SuppressWarnings("unchecked")
        List<Object[]> incidentResults = incidentQuery.getResultList();
        
        List<MapDataResponse.IncidentMarker> incidentMarkers = incidentResults.stream().map(row -> {
            Long id = ((Number) row[0]).longValue();
            Long cctvId = ((Number) row[1]).longValue();
            String incidentType = (String) row[2];
            String severityLevel = (String) row[3];
            String status = (String) row[4];
            OffsetDateTime detectedAt = (OffsetDateTime) row[5];
            String detectionModel = (String) row[6];
            Double detectionConfidence = row[7] != null ? ((Number) row[7]).doubleValue() : null;
            Double longitude = row[8] != null ? ((Number) row[8]).doubleValue() : null;
            Double latitude = row[9] != null ? ((Number) row[9]).doubleValue() : null;
            
            String severity = switch (severityLevel) {
                case "HIGH" -> "high";
                case "MEDIUM" -> "medium";
                case "LOW" -> "low";
                default -> "medium";
            };
            
            return MapDataResponse.IncidentMarker.builder()
                    .id(id)
                    .cctvId(resolveCctvCode(cctvId))
                    .incidentType(incidentType)
                    .severity(severity)
                    .status(status)
                    .time(detectedAt != null ? detectedAt.format(DATE_FORMATTER) : "")
                    .longitude(longitude)
                    .latitude(latitude)
                    .detectionModel(detectionModel)
                    .detectionConfidence(detectionConfidence)
                    .build();
        }).collect(Collectors.toList());
        
        // 헬기 착륙 지점 조회
        String heliSql = "SELECT spot_id, name, ST_X(geom) as longitude, ST_Y(geom) as latitude " +
                        "FROM heli_landing_spot " +
                        "WHERE is_active = true " +
                        "ORDER BY spot_id";
        
        Query heliQuery = entityManager.createNativeQuery(heliSql);
        @SuppressWarnings("unchecked")
        List<Object[]> heliResults = heliQuery.getResultList();
        
        List<MapDataResponse.HelicopterSpot> helicopterSpots = heliResults.stream().map(row -> {
            Long id = ((Number) row[0]).longValue();
            String name = (String) row[1];
            Double longitude = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            Double latitude = row[3] != null ? ((Number) row[3]).doubleValue() : null;
            
            return MapDataResponse.HelicopterSpot.builder()
                    .id(id)
                    .name(name)
                    .longitude(longitude)
                    .latitude(latitude)
                    .build();
        }).collect(Collectors.toList());
        
        // 낙석 센서 위치 조회
        String sensorSql = "SELECT spot_id, name, ST_X(geom) as longitude, ST_Y(geom) as latitude " +
                          "FROM rockfall_sensor_spot " +
                          "ORDER BY spot_id";
        
        Query sensorQuery = entityManager.createNativeQuery(sensorSql);
        @SuppressWarnings("unchecked")
        List<Object[]> sensorResults = sensorQuery.getResultList();
        
        List<MapDataResponse.RockfallSensorSpot> rockfallSensorSpots = sensorResults.stream().map(row -> {
            Long id = ((Number) row[0]).longValue();
            String name = (String) row[1];
            Double longitude = row[2] != null ? ((Number) row[2]).doubleValue() : null;
            Double latitude = row[3] != null ? ((Number) row[3]).doubleValue() : null;
            
            return MapDataResponse.RockfallSensorSpot.builder()
                    .id(id)
                    .name(name)
                    .longitude(longitude)
                    .latitude(latitude)
                    .build();
        }).collect(Collectors.toList());
        
        return MapDataResponse.builder()
                .cctvMarkers(cctvMarkers)
                .incidentMarkers(incidentMarkers)
                .helicopterSpots(helicopterSpots)
                .rockfallSensorSpots(rockfallSensorSpots)
                .build();
    }

    // CCTV별 사건 상세 조회 (VIEW 사용)
    public List<CCTVIncidentDetailResponse.IncidentDetail> getCCTVIncidents(Long cctvId) {
        // view_all_incidents_list에서 CCTV ID로 조회
        List<IncidentListView> viewList = incidentListViewRepository.findByCctvIdOrderByDetectedAtDesc(cctvId);
        
        System.out.println("🔍 [IncidentService] getCCTVIncidents - CCTV ID: " + cctvId + ", Found " + viewList.size() + " incidents");
        
        return viewList.stream().map(view -> {
            // 디버깅: incidentCode 확인
            String incidentCode = view.getIncidentCode();
            System.out.println("🔍 [IncidentService] Processing incident - ID: " + view.getIncidentId() + ", Code: " + incidentCode);
            
            String severity = switch (view.getSeverityLevel()) {
                case "HIGH" -> "high";
                case "MEDIUM" -> "medium";
                case "LOW" -> "low";
                default -> "medium";
            };
            
            // detectedAt을 문자열로 변환
            String detectedAtStr = toKstIso(view.getDetectedAt());
            if (detectedAtStr == null) detectedAtStr = "";
            
            CCTVIncidentDetailResponse.IncidentDetail detail = CCTVIncidentDetailResponse.IncidentDetail.builder()
                    .id(view.getIncidentId())
                    .incidentType(view.getIncidentType())
                    .incidentCode(incidentCode)  // 실제 DB의 incident_code 사용
                    .detectedAt(detectedAtStr)
                    .detectionModel(view.getDetectionModel())
                    .detectionConfidence(view.getDetectionConfidence())
                    .severity(severity)
                    .status(view.getStatus())
                    .sourceType(view.getSourceType())
                    .locationDesc(view.getLocationDesc())
                    .build();
            
            System.out.println("✅ [IncidentService] Built detail - ID: " + detail.getId() + ", Code: " + detail.getIncidentCode());
            return detail;
        }).collect(Collectors.toList());
    }

    // CCTV별 미디어 조회
    public List<MediaFileResponse> getCCTVMedia(Long cctvId, String fileType) {
        List<MediaFile> mediaFiles;
        if (fileType != null && !fileType.isEmpty()) {
            mediaFiles = mediaFileRepository.findByCctvIdAndFileType(cctvId, fileType);
        } else {
            mediaFiles = mediaFileRepository.findByCctvId(cctvId);
        }
        
        return mediaFiles.stream().map(media -> {
            return MediaFileResponse.builder()
                    .fileId(media.getId())
                    .url(media.getUrl())
                    .fileType(media.getFileType())
                    .capturedAt(toKstIso(media.getCapturedAt()))
                    .incidentId(media.getIncident() != null ? media.getIncident().getId() : null)
                    .build();
        }).collect(Collectors.toList());
    }

    public record IncidentMediaBundle(String clipUrl, List<String> frameUrls) {}

    /**
     * 사건(incidentId) 기준으로 미디어 URL을 묶어서 반환
     * - clipUrl: VIDEO 중 최신 1개
     * - frameUrls: FRAME(및 THUMBNAIL) 전체(시간순)
     */
    public IncidentMediaBundle getIncidentMediaBundle(Long incidentId) {
        if (incidentId == null) {
            return new IncidentMediaBundle(null, List.of());
        }

        List<MediaFile> mediaFiles = mediaFileRepository.findByIncidentId(incidentId);
        if (mediaFiles == null || mediaFiles.isEmpty()) {
            return new IncidentMediaBundle(null, List.of());
        }

        Comparator<MediaFile> descTime = Comparator
                .comparing(MediaFile::getCapturedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(MediaFile::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .reversed();

        String clipUrl = mediaFiles.stream()
                .filter(m -> m != null && m.getFileType() != null && m.getUrl() != null)
                .filter(m -> "VIDEO".equalsIgnoreCase(m.getFileType()))
                .sorted(descTime)
                .map(MediaFile::getUrl)
                .findFirst()
                .orElse(null);

        Comparator<MediaFile> ascTime = Comparator
                .comparing(MediaFile::getCapturedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(MediaFile::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()));

        List<String> frameUrls = mediaFiles.stream()
                .filter(m -> m != null && m.getFileType() != null && m.getUrl() != null)
                .filter(m -> "FRAME".equalsIgnoreCase(m.getFileType()) || "THUMBNAIL".equalsIgnoreCase(m.getFileType()))
                .sorted(ascTime)
                .map(MediaFile::getUrl)
                .filter(u -> !u.isBlank())
                .distinct()
                .collect(Collectors.toList());

        return new IncidentMediaBundle(clipUrl, frameUrls);
    }
    
    /**
     * 오탐 처리 공통 메서드
     * @param incidentId 사건 ID
     * @param reason 오탐 사유
     */
    @Transactional
    public void markAsFalsePositive(Long incidentId, String reason) {
        // backward-compatible: actorId가 없으면 null로 기록될 수 있음(제약이 있으면 프론트에서 actorId를 보내야 함)
        markAsFalsePositive(incidentId, null, reason);
    }

    /**
     * 오탐 처리 (actorId=현재 접속자). 정책: 오탐 담당자 = 처리자(assigned_to_id = actorId)
     */
    @Transactional
    public void markAsFalsePositive(Long incidentId, Long actorId, String reason) {
        // 1. Incident 조회 및 검증
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new RuntimeException("사건을 찾을 수 없습니다: " + incidentId));
        
        // AUTO (AI 자동 탐지)인 경우에만 오탐 처리 가능
        if (!"AUTO".equals(incident.getSourceType())) {
            throw new RuntimeException("AI 자동 탐지 사건만 오탐 처리할 수 있습니다.");
        }
        
        // 2. Incident 상태 변경 (FALSE_POSITIVE 또는 RESOLVED)
        String prevStatus = incident.getStatus();
        incident.setStatus("RESOLVED");  // 또는 "FALSE_POSITIVE"라는 별도 상태 사용 가능
        incident.setMemo((incident.getMemo() != null ? incident.getMemo() + "\n" : "") + 
                        "[오탐 처리] " + (reason != null ? reason : "사유 없음"));
        incident.setUpdatedAt(OffsetDateTime.now());
        incidentRepository.save(incident);

        // ✅ 처리카드 upsert + 오탐 담당자를 처리자로 지정(STAFF만)
        if (actorId != null) {
            upsertIncidentResponse(incidentId, actorId, OffsetDateTime.now());
        }
        
        // 3. IncidentAction 생성
        IncidentAction action = new IncidentAction();
        action.setIncidentId(incidentId);
        action.setActionType("FALSE_POSITIVE");
        action.setPrevStatus(prevStatus);
        action.setNextStatus("RESOLVED");
        action.setResolvedAt(OffsetDateTime.now());
        action.setActorId(actorId);
        action.setMemo("오탐 처리: " + (reason != null ? reason : "사유 없음"));
        action.setCreatedAt(OffsetDateTime.now());
        // actorId는 추후 인증 시스템 구현 시 설정
        incidentActionRepository.save(action);
        
        // 4. IncidentFalseReport 생성
        IncidentFalseReport falseReport = new IncidentFalseReport();
        falseReport.setActionId(action.getId());
        falseReport.setReason(reason);
        falseReport.setCreatedAt(OffsetDateTime.now());
        incidentFalseReportRepository.save(falseReport);
    }
}