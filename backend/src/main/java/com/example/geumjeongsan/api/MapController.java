package com.example.geumjeongsan.api;

import com.example.geumjeongsan.api.dto.MapDataResponse;
import com.example.geumjeongsan.domain.incident.IncidentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/map")
@Slf4j
public class MapController {

    private final IncidentService incidentService;

    public MapController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @GetMapping("/data")
    public MapDataResponse getMapData() {
        return incidentService.getMapData();
    }
}

