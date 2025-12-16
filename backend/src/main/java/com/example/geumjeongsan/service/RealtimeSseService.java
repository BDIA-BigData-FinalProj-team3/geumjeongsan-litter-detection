package com.example.geumjeongsan.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 서버 -> 프론트 실시간 이벤트 스트림(SSE)
 * - 프론트는 EventSource로 구독
 * - 사건 생성/변경 시 publish 해서 화면 전체를 즉시 갱신(invalidate/refetch)하도록 사용
 */
@Service
@Slf4j
public class RealtimeSseService {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        // 0L: timeout 없음 (로컬/운영에서 keepalive와 함께 사용)
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError((e) -> emitters.remove(emitter));

        // 첫 연결 확인용 이벤트
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data(Map.of("ts", OffsetDateTime.now().toString())));
        } catch (IOException e) {
            emitters.remove(emitter);
        }

        return emitter;
    }

    public void publish(String eventName, Map<String, Object> payload) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(payload));
            } catch (Exception e) {
                emitters.remove(emitter);
            }
        }
    }

    // 프록시/브라우저 타임아웃 방지용 ping
    @Scheduled(fixedDelay = 15000)
    public void ping() {
        if (emitters.isEmpty()) return;
        publish("ping", Map.of("ts", OffsetDateTime.now().toString()));
    }
}


