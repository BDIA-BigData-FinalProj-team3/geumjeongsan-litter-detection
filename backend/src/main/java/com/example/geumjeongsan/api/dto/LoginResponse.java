package com.example.geumjeongsan.api.dto;

import lombok.Data;

@Data
public class LoginResponse {
    private Long userId;
    private String loginId;
    private String name;
    private String role;
    private String position; // 직급 (예: "관리자", "부장(지방)", "직원")
    private String dept;
    private String email;
    private String phone;
}

