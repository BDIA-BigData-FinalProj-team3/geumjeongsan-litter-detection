package com.example.geumjeongsan.api.dto;

import lombok.Data;

@Data
public class FireStatusUpdateRequest {
    private String status; // "진화중", "진화완료"
    private String handlerName; // 처리자 이름
}

