package com.example.geumjeongsan.domain.incident;

import com.example.geumjeongsan.api.dto.EmergencyCreateRequest;
import com.example.geumjeongsan.api.dto.EmergencyDashboardResponse;
import com.example.geumjeongsan.api.dto.EmergencyIncidentItem;
import com.example.geumjeongsan.api.dto.EmergencyIncidentListDto;
import com.example.geumjeongsan.api.dto.EmergencyRequest;
import com.example.geumjeongsan.api.dto.EmergencyResponse;
import com.example.geumjeongsan.api.dto.EmergencyStatsDto;
import com.example.geumjeongsan.api.dto.IncidentCreateResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
    private final IncidentSummaryRepository incidentSummaryRepository;
    private final IncidentActionRepository incidentActionRepository;
    private final IncidentManualRepository incidentManualRepository;
    private final EntityManager entityManager;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public EmergencyService(IncidentRepository incidentRepository,
                           EmergencyDetailRepository emergencyDetailRepository,
                           IncidentSummaryRepository incidentSummaryRepository,
                           IncidentActionRepository incidentActionRepository,
                           IncidentManualRepository incidentManualRepository,
                           EntityManager entityManager) {
        this.incidentRepository = incidentRepository;
        this.emergencyDetailRepository = emergencyDetailRepository;
        this.incidentSummaryRepository = incidentSummaryRepository;
        this.incidentActionRepository = incidentActionRepository;
        this.incidentManualRepository = incidentManualRepository;
        this.entityManager = entityManager;
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
        LocalDateTime localDateTime = LocalDateTime.parse(incidentTimeStr, DATE_FORMATTER);
        incident.setDetectedAt(localDateTime.atOffset(java.time.ZoneOffset.of("+09:00")));
        
        incident.setLocationDesc(request.getLocation());
        // acknowledged_at, resolved_at, handler_name은 incident_action에만 저장 ✅
        
        Incident saved = incidentRepository.save(incident);
        // ID를 확보하기 위해 flush (트랜잭션 내에서 ID 생성 보장)
        incidentRepository.flush();
        
        // flush 후에도 ID가 null일 수 있으므로 확인
        if (saved.getId() == null) {
            throw new IllegalStateException("Incident ID가 생성되지 않았습니다.");
        }
        
        // 사고 코드 생성 (E-YYMMDD-001A 또는 E-YYMMDD-001M)
        LocalDate date = saved.getDetectedAt().toLocalDate();
        long count = incidentRepository.countByIncidentTypeAndDetectedAtDate("EMERGENCY", date);
        String sequence = String.format("%03d", count);
        String suffix = "AUTO".equals(saved.getSourceType()) ? "A" : "M";
        String incidentCode = String.format("E-%s-%s%s",
            saved.getDetectedAt().format(DateTimeFormatter.ofPattern("yyMMdd")),
            sequence,
            suffix
        );
        saved.setIncidentCode(incidentCode);
        saved = incidentRepository.save(saved);
        
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
            IncidentManual manual = new IncidentManual();
            manual.setIncidentId(saved.getId());
            manual.setManualDescription(request.getSymptoms() != null ? request.getSymptoms() : "");
            manual.setManualLocation(request.getLocation());
            manual.setCreatedById(null); // TODO: 실제 사용자 ID 연동
            manual.setCreatedAt(OffsetDateTime.now());
            incidentManualRepository.save(manual);
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
                                      String patientName, String patientGender, String transferHospital) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("응급 기록을 찾을 수 없습니다: " + id));
        
        if (!"EMERGENCY".equals(incident.getIncidentType())) {
            throw new RuntimeException("응급 기록이 아닙니다: " + id);
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
        
        // emergency_detail 테이블 업데이트
        EmergencyDetail detail = emergencyDetailRepository.findByIncidentId(id)
                .orElse(null);
        
        if (detail != null) {
            if (patientName != null && !patientName.isEmpty() && !"미상".equals(patientName)) {
                detail.setPatientName(patientName);
            }
            if (patientGender != null && !patientGender.isEmpty() && !"미상".equals(patientGender)) {
                String dbGender = switch (patientGender) {
                    case "남성", "남" -> "M";
                    case "여성", "여" -> "F";
                    default -> patientGender;
                };
                detail.setPatientGender(dbGender);
            }
            if (transferHospital != null && !transferHospital.isEmpty()) {
                detail.setTransferDest(transferHospital);
            }
            emergencyDetailRepository.save(detail);
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
                .cctvId(String.format("CCTV-%03d", incident.getCctvId()))
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
        
        // Incident 저장
        incident = incidentRepository.save(incident);
        
        // 2. 사고 코드 생성 (E-YYMMDD-001A 또는 E-YYMMDD-001M)
        LocalDate date = incident.getDetectedAt().toLocalDate();
        long count = incidentRepository.countByIncidentTypeAndDetectedAtDate("EMERGENCY", date);
        String sequence = String.format("%03d", count);
        String suffix = "AUTO".equals(incident.getSourceType()) ? "A" : "M";
        String incidentCode = String.format("E-%s-%s%s",
            incident.getDetectedAt().format(DateTimeFormatter.ofPattern("yyMMdd")),
            sequence,
            suffix
        );
        
        // 사고 코드를 Incident에 저장
        incident.setIncidentCode(incidentCode);
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
        action.setActorId(request.getCreatedById());  // ✅ 등록자 저장
        action.setAcknowledgedAt(null);
        action.setResolvedAt(null);
        action.setMemo("신규 응급 사건 등록 (수동)");
        action.setCreatedAt(OffsetDateTime.now());
        incidentActionRepository.save(action);
        
        // 5. IncidentManual 저장
        IncidentManual manual = new IncidentManual();
        manual.setIncidentId(incident.getId());
        manual.setManualDescription(request.getMemo() != null ? request.getMemo() : "응급 사건 수동 등록");
        manual.setManualLocation(request.getLocationDesc());
        manual.setCreatedById(null);
        manual.setCreatedAt(OffsetDateTime.now());
        incidentManualRepository.save(manual);
        
        return IncidentCreateResponse.success(incident.getId(), incidentCode);
    }
}

