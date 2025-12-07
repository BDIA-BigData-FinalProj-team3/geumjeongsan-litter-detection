package com.example.geumjeongsan.api.dto;

import lombok.Data;

@Data
public class FindPasswordRequest {
    private String loginId;
    private String email;
    private String phone;
}

