package com.example.geumjeongsan.api.dto;

import lombok.Data;

@Data
public class FindIdResponse {
    private boolean found;
    private String loginId;
    private String message;
    
    public FindIdResponse(boolean found, String loginId, String message) {
        this.found = found;
        this.loginId = loginId;
        this.message = message;
    }
}

