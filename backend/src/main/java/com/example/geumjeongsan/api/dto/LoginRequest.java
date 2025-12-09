package com.example.geumjeongsan.api.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String loginId;
    private String password;
}

