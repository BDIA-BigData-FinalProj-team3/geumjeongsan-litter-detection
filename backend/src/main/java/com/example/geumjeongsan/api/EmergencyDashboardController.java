package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.EmergencyDashboardResponse;
import com.example.geumjeongsan.domain.incident.EmergencyService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/emergency-dashboard")
public class EmergencyDashboardController {

    private final EmergencyService emergencyService;

    public EmergencyDashboardController(EmergencyService emergencyService) {
        this.emergencyService = emergencyService;
    }

    // 응급 현황 + 목록 (발생/처리완료)
    @GetMapping
    public EmergencyDashboardResponse getDashboard() {
        return emergencyService.getDashboard();
    }
}

