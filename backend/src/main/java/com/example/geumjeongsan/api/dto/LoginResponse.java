package com.example.geumjeongsan.api.dto;

import lombok.Data;

@Data
public class LoginResponse {
    private Long userId;
    private String loginId;
    private String name;
    private String role;
    private String dept;
    private String email;
    private String phone;
}

