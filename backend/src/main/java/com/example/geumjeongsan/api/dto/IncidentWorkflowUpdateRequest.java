package com.example.geumjeongsan.api.dto;

import lombok.Data;

/**
 * 상태 변경 + 담당자 배정 + 누가 클릭했는지(Actor) 기록
 */
@Data
public class IncidentWorkflowUpdateRequest {
    private String status;      // PENDING / IN_PROGRESS / EXTINGUISHING / RESOLVED
    private Long actorId;       // 현재 로그인 사용자 ID (필수)
    private Long assignedToId;  // STAFF 처리자(staff_user.user_id) (선택)
}


