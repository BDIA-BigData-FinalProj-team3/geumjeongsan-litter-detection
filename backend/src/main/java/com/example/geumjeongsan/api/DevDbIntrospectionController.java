package com.example.geumjeongsan.api;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 로컬 디버깅용: DB의 VIEW 정의/컬럼을 조회합니다.
 * - 운영 환경에서는 노출하면 위험하니, 기본은 비활성화하고 설정으로만 켜지게 합니다.
 */
@RestController
@RequestMapping("/api/dev/db")
@Slf4j
@ConditionalOnProperty(name = "debug.dbviews.enabled", havingValue = "true")
public class DevDbIntrospectionController {

    private static final Set<String> ALLOWLIST = Set.of(
            "incident",
            "incident_response",
            "incident_action",
            "view_all_incidents_list",
            "v_notification_recipients",

            // ✅ MainMap에서 쓰는 VIEW들
            "view_mainmap_incident_markers",
            "view_mainmap_cctv_status",
            "view_map_active_incidents"
    );

    @PersistenceContext
    private EntityManager em;

    @GetMapping("/columns")
    public ResponseEntity<?> getColumns(@RequestParam("name") String name) {
        String obj = normalize(name);
        if (obj == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "invalid name", "allow", ALLOWLIST));
        }

        // table/view 공통으로 조회 가능
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                        "select column_name, data_type, is_nullable " +
                                "from information_schema.columns " +
                                "where table_schema = 'public' and table_name = :name " +
                                "order by ordinal_position"
                )
                .setParameter("name", obj)
                .getResultList();

        List<Map<String, Object>> cols = rows.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("column", r[0]);
            m.put("type", r[1]);
            m.put("nullable", r[2]);
            return m;
        }).toList();

        return ResponseEntity.ok(Map.of("name", obj, "columns", cols));
    }

    @GetMapping("/viewdef")
    public ResponseEntity<?> getViewDef(@RequestParam("name") String name) {
        String obj = normalize(name);
        if (obj == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "invalid name", "allow", ALLOWLIST));
        }
        if (!obj.startsWith("view_") && !obj.startsWith("v_")) {
            return ResponseEntity.badRequest().body(Map.of("error", "not a view", "name", obj));
        }

        // pg_get_viewdef expects regclass. Use format('%I.%I', 'public', name)::regclass to avoid injection.
        String sql = "select pg_get_viewdef(format('%I.%I', 'public', :name)::regclass, true)";
        Object def = em.createNativeQuery(sql)
                .setParameter("name", obj)
                .getSingleResult();

        return ResponseEntity.ok(Map.of("name", obj, "viewdef", def != null ? def.toString() : null));
    }

    private static String normalize(String name) {
        if (name == null) return null;
        String n = name.trim();
        if (!ALLOWLIST.contains(n)) return null;
        return n;
    }
}


