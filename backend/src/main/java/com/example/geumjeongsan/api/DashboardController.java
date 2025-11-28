package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.DashboardStatsResponse;
import com.example.geumjeongsan.domain.incident.IncidentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final IncidentService incidentService;

    public DashboardController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @GetMapping("/stats")
    public DashboardStatsResponse getDashboardStats() {
        return incidentService.getDashboardStats();
    }
}

