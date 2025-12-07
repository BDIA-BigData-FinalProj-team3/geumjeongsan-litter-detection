package com.example.geumjeongsan.controller;

import com.example.geumjeongsan.api.dto.FireStatsDto;
import com.example.geumjeongsan.api.dto.HotspotDto;
import com.example.geumjeongsan.domain.incident.FireService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fire-dashboard")
@RequiredArgsConstructor
public class FireDashboardController {

    private final FireService fireService;

    @GetMapping("/stats")
    public ResponseEntity<FireStatsDto> getStats() {
        return ResponseEntity.ok(fireService.getFireStats());
    }

    @GetMapping("/hotspots")
    public ResponseEntity<List<HotspotDto>> getHotspots(
            @RequestParam(defaultValue = "this_month") String period,
            @RequestParam(defaultValue = "1") Long minCount
    ) {
        return ResponseEntity.ok(fireService.getFireHotspots(period, minCount));
    }
}

