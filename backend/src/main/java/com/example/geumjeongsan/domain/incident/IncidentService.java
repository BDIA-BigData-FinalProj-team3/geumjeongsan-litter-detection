package com.example.geumjeongsan.domain.incident;

import com.example.geumjeongsan.api.dto.CCTVIncidentDetailResponse;
import com.example.geumjeongsan.api.dto.CCTVResponse;
import com.example.geumjeongsan.api.dto.DashboardStatsResponse;
import com.example.geumjeongsan.api.dto.EmergencyRequest;
import com.example.geumjeongsan.api.dto.EmergencyResponse;
import com.example.geumjeongsan.api.dto.FireResponse;
import com.example.geumjeongsan.api.dto.MapDataResponse;
import com.example.geumjeongsan.api.dto.MediaFileResponse;
import com.example.geumjeongsan.domain.cctv.CCTVRepository;
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
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final EmergencyDetailRepository emergencyDetailRepository;
    private final CCTVRepository cctvRepository;
    private final MediaFileRepository mediaFileRepository;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public IncidentService(IncidentRepository incidentRepository, 
                         EmergencyDetailRepository emergencyDetailRepository,
                         CCTVRepository cctvRepository,
                         MediaFileRepository mediaFileRepository,
                         EntityManager entityManager,
                         ObjectMapper objectMapper) {
        this.incidentRepository = incidentRepository;
        this.emergencyDetailRepository = emergencyDetailRepository;
        this.cctvRepository = cctvRepository;
        this.mediaFileRepository = mediaFileRepository;
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
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
                .cctvId(String.format("CCTV-%03d", incident.getCctvId()))
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
                .cctvId(String.format("CCTV-%03d", incident.getCctvId()))
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
                .cctvId(String.format("CCTV-%03d", incident.getCctvId()))
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
        emergencyDetail.setIncident(saved);
        emergencyDetail.setPatientName(request.getPatientName());
        emergencyDetail.setAge(request.getAge());
        emergencyDetail.setGender(request.getGender());
        emergencyDetail.setSymptom(request.getSymptoms());
        emergencyDetail.setSeverityLevel(severityLevel);
        emergencyDetail.setStatus(status);
        emergencyDetail.setResponseTeam(request.getResponseTeam());
        emergencyDetail.setLocationDesc(request.getLocation());
        emergencyDetail.setOccurredAt(saved.getDetectedAt());
        emergencyDetail.setCreatedAt(OffsetDateTime.now());
        
        emergencyDetailRepository.save(emergencyDetail);
        
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
        emergencyDetail.setIncident(saved);
        emergencyDetail.setPatientName(request.getPatientName());
        emergencyDetail.setAge(request.getAge());
        emergencyDetail.setGender(request.getGender());
        emergencyDetail.setSymptom(request.getSymptoms());
        emergencyDetail.setSeverityLevel(severityLevel);
        emergencyDetail.setStatus(status);
        emergencyDetail.setResponseTeam(request.getResponseTeam());
        emergencyDetail.setLocationDesc(request.getLocation());
        emergencyDetail.setOccurredAt(saved.getDetectedAt());
        if (emergencyDetail.getCreatedAt() == null) {
            emergencyDetail.setCreatedAt(OffsetDateTime.now());
        }
        
        emergencyDetailRepository.save(emergencyDetail);
        
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
        Integer age = emergencyDetail != null ? emergencyDetail.getAge() : null;
        String gender = emergencyDetail != null ? emergencyDetail.getGender() : "";
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
                .age(age)
                .gender(gender != null ? gender : "")
                .location(location != null ? location : "")
                .cctvId(String.format("CCTV-%03d", incident.getCctvId()))
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

    // 모든 CCTV 조회
    public List<CCTVResponse> getAllCCTV() {
        try {
            // PostGIS 함수를 사용하여 경도/위도 추출 시도
            String sql = "SELECT c.cctv_id, c.cctv_code, c.name, c.location_desc, " +
                         "c.install_date, c.model_name, c.resolution, c.is_active, c.power_status, " +
                         "ST_X(c.geom) as longitude, ST_Y(c.geom) as latitude, " +
                         "COUNT(i.incident_id) as incident_count, " +
                         "MAX(i.detected_at) as last_incident_at, " +
                         "MAX(CASE WHEN i.detected_at = (SELECT MAX(detected_at) FROM incident WHERE cctv_id = c.cctv_id) " +
                         "THEN i.incident_type END) as last_incident_type " +
                         "FROM cctv c " +
                         "LEFT JOIN incident i ON c.cctv_id = i.cctv_id " +
                         "GROUP BY c.cctv_id, c.cctv_code, c.name, c.location_desc, " +
                         "c.install_date, c.model_name, c.resolution, c.is_active, c.power_status, c.geom " +
                         "ORDER BY c.cctv_id";
            
            Query query = entityManager.createNativeQuery(sql);
            @SuppressWarnings("unchecked")
            List<Object[]> results = query.getResultList();
            
            return results.stream().map(row -> {
                Long id = ((Number) row[0]).longValue();
                String cctvCode = (String) row[1];
                String name = (String) row[2];
                String locationDesc = (String) row[3];
                java.sql.Date installDate = (java.sql.Date) row[4];
                String modelName = (String) row[5];
                String resolution = (String) row[6];
                Boolean isActive = (Boolean) row[7];
                String powerStatus = (String) row[8];
                Double longitude = row[9] != null ? ((Number) row[9]).doubleValue() : null;
                Double latitude = row[10] != null ? ((Number) row[10]).doubleValue() : null;
                Long incidentCount = ((Number) row[11]).longValue();
                OffsetDateTime lastIncidentAt = null;
                if (row[12] != null) {
                    if (row[12] instanceof OffsetDateTime) {
                        lastIncidentAt = (OffsetDateTime) row[12];
                    } else if (row[12] instanceof java.time.Instant) {
                        lastIncidentAt = ((java.time.Instant) row[12]).atOffset(java.time.ZoneOffset.of("+09:00"));
                    } else if (row[12] instanceof java.sql.Timestamp) {
                        lastIncidentAt = ((java.sql.Timestamp) row[12]).toInstant().atOffset(java.time.ZoneOffset.of("+09:00"));
                    }
                }
                String lastIncidentType = (String) row[13];
                
                return CCTVResponse.builder()
                        .id(id)
                        .cctvCode(cctvCode)
                        .name(name)
                        .locationDesc(locationDesc)
                        .installDate(installDate != null ? installDate.toString() : null)
                        .modelName(modelName)
                        .resolution(resolution)
                        .isActive(isActive)
                        .powerStatus(powerStatus)
                        .longitude(longitude)
                        .latitude(latitude)
                        .incidentCount(incidentCount)
                        .lastIncidentTime(lastIncidentAt != null ? lastIncidentAt.format(DATE_FORMATTER) : null)
                        .lastIncidentType(lastIncidentType)
                        .build();
            }).collect(Collectors.toList());
        } catch (Exception e) {
            // PostGIS 함수가 작동하지 않을 경우 대체 쿼리 (geom 컬럼 제외)
            System.err.println("PostGIS 함수 사용 실패, 대체 쿼리 사용: " + e.getMessage());
            e.printStackTrace();
            
            String sql = "SELECT c.cctv_id, c.cctv_code, c.name, c.location_desc, " +
                         "c.install_date, c.model_name, c.resolution, c.is_active, c.power_status, " +
                         "COUNT(i.incident_id) as incident_count, " +
                         "MAX(i.detected_at) as last_incident_at, " +
                         "MAX(CASE WHEN i.detected_at = (SELECT MAX(detected_at) FROM incident WHERE cctv_id = c.cctv_id) " +
                         "THEN i.incident_type END) as last_incident_type " +
                         "FROM cctv c " +
                         "LEFT JOIN incident i ON c.cctv_id = i.cctv_id " +
                         "GROUP BY c.cctv_id, c.cctv_code, c.name, c.location_desc, " +
                         "c.install_date, c.model_name, c.resolution, c.is_active, c.power_status " +
                         "ORDER BY c.cctv_id";
            
            Query query = entityManager.createNativeQuery(sql);
            @SuppressWarnings("unchecked")
            List<Object[]> results = query.getResultList();
            
            return results.stream().map(row -> {
                Long id = ((Number) row[0]).longValue();
                String cctvCode = (String) row[1];
                String name = (String) row[2];
                String locationDesc = (String) row[3];
                java.sql.Date installDate = (java.sql.Date) row[4];
                String modelName = (String) row[5];
                String resolution = (String) row[6];
                Boolean isActive = (Boolean) row[7];
                String powerStatus = (String) row[8];
                Long incidentCount = ((Number) row[9]).longValue();
                OffsetDateTime lastIncidentAt = null;
                if (row[10] != null) {
                    if (row[10] instanceof OffsetDateTime) {
                        lastIncidentAt = (OffsetDateTime) row[10];
                    } else if (row[10] instanceof java.time.Instant) {
                        lastIncidentAt = ((java.time.Instant) row[10]).atOffset(java.time.ZoneOffset.of("+09:00"));
                    } else if (row[10] instanceof java.sql.Timestamp) {
                        lastIncidentAt = ((java.sql.Timestamp) row[10]).toInstant().atOffset(java.time.ZoneOffset.of("+09:00"));
                    }
                }
                String lastIncidentType = (String) row[11];
                
                return CCTVResponse.builder()
                        .id(id)
                        .cctvCode(cctvCode)
                        .name(name)
                        .locationDesc(locationDesc)
                        .installDate(installDate != null ? installDate.toString() : null)
                        .modelName(modelName)
                        .resolution(resolution)
                        .isActive(isActive)
                        .powerStatus(powerStatus)
                        .longitude(null) // PostGIS 사용 불가 시 null
                        .latitude(null)  // PostGIS 사용 불가 시 null
                        .incidentCount(incidentCount)
                        .lastIncidentTime(lastIncidentAt != null ? lastIncidentAt.format(DATE_FORMATTER) : null)
                        .lastIncidentType(lastIncidentType)
                        .build();
            }).collect(Collectors.toList());
        }
    }

    // 활성 CCTV만 조회
    public List<CCTVResponse> getActiveCCTV() {
        return getAllCCTV().stream()
                .filter(c -> c.getIsActive() != null && c.getIsActive())
                .collect(Collectors.toList());
    }

    // CCTV ID로 조회
    public CCTVResponse getCCTVById(Long id) {
        String sql = "SELECT c.cctv_id, c.cctv_code, c.name, c.location_desc, " +
                     "c.install_date, c.model_name, c.resolution, c.is_active, c.power_status, " +
                     "ST_X(c.geom) as longitude, ST_Y(c.geom) as latitude, " +
                     "COUNT(i.incident_id) as incident_count " +
                     "FROM cctv c " +
                     "LEFT JOIN incident i ON c.cctv_id = i.cctv_id " +
                     "WHERE c.cctv_id = :id " +
                     "GROUP BY c.cctv_id, c.cctv_code, c.name, c.location_desc, " +
                     "c.install_date, c.model_name, c.resolution, c.is_active, c.power_status, c.geom";
        
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", id);
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();
        
        if (results.isEmpty()) {
            return null;
        }
        
        Object[] row = results.get(0);
        Long cctvId = ((Number) row[0]).longValue();
        String cctvCode = (String) row[1];
        String name = (String) row[2];
        String locationDesc = (String) row[3];
        java.sql.Date installDate = (java.sql.Date) row[4];
        String modelName = (String) row[5];
        String resolution = (String) row[6];
        Boolean isActive = (Boolean) row[7];
        String powerStatus = (String) row[8];
        Double longitude = row[9] != null ? ((Number) row[9]).doubleValue() : null;
        Double latitude = row[10] != null ? ((Number) row[10]).doubleValue() : null;
        Long incidentCount = ((Number) row[11]).longValue();
        
        return CCTVResponse.builder()
                .id(cctvId)
                .cctvCode(cctvCode)
                .name(name)
                .locationDesc(locationDesc)
                .installDate(installDate != null ? installDate.toString() : null)
                .modelName(modelName)
                .resolution(resolution)
                .isActive(isActive)
                .powerStatus(powerStatus)
                .longitude(longitude)
                .latitude(latitude)
                .incidentCount(incidentCount)
                .build();
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
                    .cctvId(String.format("CCTV-%03d", cctvId))
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

    // CCTV별 사건 상세 조회
    public List<CCTVIncidentDetailResponse.IncidentDetail> getCCTVIncidents(Long cctvId) {
        List<Incident> incidents = incidentRepository.findAll().stream()
                .filter(i -> i.getCctvId().equals(cctvId))
                .sorted((a, b) -> b.getDetectedAt().compareTo(a.getDetectedAt()))
                .collect(Collectors.toList());
        
        return incidents.stream().map(incident -> {
            String severity = switch (incident.getSeverityLevel()) {
                case "HIGH" -> "high";
                case "MEDIUM" -> "medium";
                case "LOW" -> "low";
                default -> "medium";
            };
            
            return CCTVIncidentDetailResponse.IncidentDetail.builder()
                    .id(incident.getId())
                    .incidentType(incident.getIncidentType())
                    .detectedAt(incident.getDetectedAt().format(DATE_FORMATTER))
                    .detectionModel(incident.getDetectionModel())
                    .detectionConfidence(incident.getDetectionConfidence())
                    .severity(severity)
                    .status(incident.getStatus())
                    .build();
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
                    .capturedAt(media.getCapturedAt() != null ? 
                        media.getCapturedAt().format(DATE_FORMATTER) : null)
                    .incidentId(media.getIncident() != null ? media.getIncident().getId() : null)
                    .build();
        }).collect(Collectors.toList());
    }
}