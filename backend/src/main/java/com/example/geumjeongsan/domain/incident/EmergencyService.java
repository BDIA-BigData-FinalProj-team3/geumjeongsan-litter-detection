package com.example.geumjeongsan.domain.incident;

import com.example.geumjeongsan.api.dto.EmergencyDashboardResponse;
import com.example.geumjeongsan.api.dto.EmergencyIncidentItem;
import com.example.geumjeongsan.api.dto.EmergencyRequest;
import com.example.geumjeongsan.api.dto.EmergencyResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EmergencyService {

    private final IncidentRepository incidentRepository;
    private final EmergencyDetailRepository emergencyDetailRepository;
    private final EntityManager entityManager;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public EmergencyService(IncidentRepository incidentRepository,
                           EmergencyDetailRepository emergencyDetailRepository,
                           EntityManager entityManager) {
        this.incidentRepository = incidentRepository;
        this.emergencyDetailRepository = emergencyDetailRepository;
        this.entityManager = entityManager;
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
                .cctvId(String.format("CCTV-%03d", incident.getCctvId()))
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
        LocalDateTime localDateTime = LocalDateTime.parse(incidentTimeStr, DATE_FORMATTER);
        incident.setDetectedAt(localDateTime.atOffset(java.time.ZoneOffset.of("+09:00")));
        
        if ("대응중".equals(request.getStatus())) {
            incident.setAcknowledgedAt(OffsetDateTime.now());
        }
        
        if ("처리완료".equals(request.getStatus())) {
            incident.setResolvedAt(OffsetDateTime.now());
        }
        
        incident.setLocationDesc(request.getLocation());
        incident.setHandlerName(request.getResponseTeam());
        
        Incident saved = incidentRepository.save(incident);
        // ID를 확보하기 위해 flush (트랜잭션 내에서 ID 생성 보장)
        incidentRepository.flush();
        
        // flush 후에도 ID가 null일 수 있으므로 확인
        if (saved.getId() == null) {
            throw new IllegalStateException("Incident ID가 생성되지 않았습니다.");
        }
        
        // EmergencyDetail 저장 (@MapsId를 사용하므로 incident만 설정하면 incidentId가 자동 설정됨)
        EmergencyDetail detail = new EmergencyDetail();
        // @MapsId를 사용할 때는 incident를 설정하면 자동으로 incidentId가 설정됨
        // 명시적으로 setIncidentId()를 호출하면 @MapsId와 충돌할 수 있으므로 호출하지 않음
        detail.setIncident(saved);
        detail.setPatientName(request.getPatientName());
        detail.setAge(request.getAge());
        detail.setGender(request.getGender());
        detail.setEmergencyType(request.getSymptoms()); // 증상을 유형으로 사용
        detail.setSymptom(request.getSymptoms());
        detail.setSeverityLevel(severityLevel);
        detail.setStatus(status);
        detail.setResponseTeam(request.getResponseTeam());
        detail.setLocationDesc(request.getLocation());
        detail.setOccurredAt(saved.getDetectedAt());
        detail.setCreatedAt(OffsetDateTime.now());
        
        emergencyDetailRepository.save(detail);
        
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
        
        if ("대응중".equals(request.getStatus()) && incident.getAcknowledgedAt() == null) {
            incident.setAcknowledgedAt(OffsetDateTime.now());
        }
        
        if ("처리완료".equals(request.getStatus()) && incident.getResolvedAt() == null) {
            incident.setResolvedAt(OffsetDateTime.now());
        }
        
        incident.setLocationDesc(request.getLocation());
        incident.setHandlerName(request.getResponseTeam());
        
        Incident saved = incidentRepository.save(incident);
        
        // EmergencyDetail 업데이트
        EmergencyDetail detail = emergencyDetailRepository.findById(id).orElse(new EmergencyDetail());
        // 새로 생성하는 경우 @MapsId를 위해 incident를 먼저 설정
        if (detail.getIncidentId() == null) {
            detail.setIncident(saved);
            if (saved.getId() != null) {
                detail.setIncidentId(saved.getId());
            }
        } else {
            // 기존 레코드 업데이트
            detail.setIncident(saved);
        }
        detail.setPatientName(request.getPatientName());
        detail.setAge(request.getAge());
        detail.setGender(request.getGender());
        detail.setEmergencyType(request.getSymptoms());
        detail.setSymptom(request.getSymptoms());
        detail.setSeverityLevel(severityLevel);
        detail.setStatus(status);
        detail.setResponseTeam(request.getResponseTeam());
        detail.setLocationDesc(request.getLocation());
        
        emergencyDetailRepository.save(detail);
        
        return toEmergencyResponse(saved);
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
        Integer age = (detail != null) ? detail.getAge() : null;
        // 성별 변환 (M/F -> 남/여)
        String gender = "";
        if (detail != null && detail.getGender() != null) {
            String genderValue = detail.getGender();
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
                .age(age)
                .gender(gender)
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
}

