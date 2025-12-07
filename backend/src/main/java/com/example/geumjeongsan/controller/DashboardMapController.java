package com.example.geumjeongsan.controller;

import com.example.geumjeongsan.domain.cctv.MapCCTV;
import com.example.geumjeongsan.domain.cctv.MapCCTVRepository;
import com.example.geumjeongsan.domain.incident.MapActiveIncident;
import com.example.geumjeongsan.domain.incident.MapActiveIncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/map")
@RequiredArgsConstructor
public class DashboardMapController {

    private final MapCCTVRepository mapCCTVRepository;
    private final MapActiveIncidentRepository mapActiveIncidentRepository;

    @GetMapping("/cctvs")
    public ResponseEntity<List<MapCCTV>> getCCTVsOnMap() {
        return ResponseEntity.ok(mapCCTVRepository.findAll());
    }

    @GetMapping("/active-incidents")
    public ResponseEntity<List<MapActiveIncident>> getActiveIncidents() {
        return ResponseEntity.ok(mapActiveIncidentRepository.findAll());
    }
}

