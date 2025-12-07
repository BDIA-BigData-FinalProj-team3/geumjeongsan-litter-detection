package com.example.geumjeongsan.controller;

import com.example.geumjeongsan.api.dto.TrashStatsDto;
import com.example.geumjeongsan.api.dto.HotspotDto;
import com.example.geumjeongsan.domain.incident.TrashService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trash-dashboard")
@RequiredArgsConstructor
public class TrashDashboardController {

    private final TrashService trashService;

    @GetMapping("/stats")
    public ResponseEntity<TrashStatsDto> getStats() {
        return ResponseEntity.ok(trashService.getTrashStats());
    }

    @GetMapping("/hotspots")
    public ResponseEntity<List<HotspotDto>> getHotspots(
            @RequestParam(defaultValue = "this_month") String period,
            @RequestParam(defaultValue = "1") Long minCount
    ) {
        return ResponseEntity.ok(trashService.getTrashHotspots(period, minCount));
    }
}

