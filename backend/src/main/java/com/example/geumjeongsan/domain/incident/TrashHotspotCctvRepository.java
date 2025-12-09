package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrashHotspotCctvRepository extends JpaRepository<TrashHotspotCctv, Long> {

    @Query("SELECT h FROM TrashHotspotCctv h WHERE h.trashCountThisMonth >= :minCount ORDER BY h.trashCountThisMonth DESC, h.avgSeverityScore DESC")
    List<TrashHotspotCctv> findHotspotsByThisMonth(@Param("minCount") long minCount);

    @Query("SELECT h FROM TrashHotspotCctv h WHERE h.trashCount30d >= :minCount ORDER BY h.trashCount30d DESC, h.avgSeverityScore DESC")
    List<TrashHotspotCctv> findHotspotsByLast30Days(@Param("minCount") long minCount);

    @Query("SELECT h FROM TrashHotspotCctv h WHERE h.trashCount7d >= :minCount ORDER BY h.trashCount7d DESC, h.avgSeverityScore DESC")
    List<TrashHotspotCctv> findHotspotsByLast7Days(@Param("minCount") long minCount);

    @Query("SELECT h FROM TrashHotspotCctv h WHERE h.totalTrashCount >= :minCount ORDER BY h.totalTrashCount DESC, h.avgSeverityScore DESC")
    List<TrashHotspotCctv> findHotspotsByTotal(@Param("minCount") long minCount);
}

