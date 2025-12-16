package com.example.geumjeongsan.api;

import com.example.geumjeongsan.service.RealtimeSseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 프론트 실시간 구독(SSE)
 * GET /api/realtime/stream
 */
@RestController
@RequestMapping("/api/realtime")
@RequiredArgsConstructor
public class RealtimeController {

    private final RealtimeSseService realtimeSseService;

    @GetMapping("/stream")
    public SseEmitter stream() {
        return realtimeSseService.subscribe();
    }
}


