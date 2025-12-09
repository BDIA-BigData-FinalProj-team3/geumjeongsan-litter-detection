package com.example.geumjeongsan.api.dto;

import lombok.Data;

@Data
public class FindPasswordResponse {
    private boolean found;
    private String password;
    private String message;
    
    public FindPasswordResponse(boolean found, String password, String message) {
        this.found = found;
        this.password = password;
        this.message = message;
    }
}

