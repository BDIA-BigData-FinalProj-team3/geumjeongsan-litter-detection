package com.example.geumjeongsan.api.dto;

import lombok.Data;

@Data
public class FindIdRequest {
    private String name;
    private String email;
    private String phone;
}

