package com.example.geumjeongsan.domain.incident;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FireHotspotCctvRepository extends JpaRepository<FireHotspotCctv, Long> {

    @Query("SELECT h FROM FireHotspotCctv h WHERE h.fireCountThisMonth >= :minCount ORDER BY h.fireCountThisMonth DESC, h.avgSeverityScore DESC")
    List<FireHotspotCctv> findHotspotsByThisMonth(@Param("minCount") long minCount);

    @Query("SELECT h FROM FireHotspotCctv h WHERE h.fireCount30d >= :minCount ORDER BY h.fireCount30d DESC, h.avgSeverityScore DESC")
    List<FireHotspotCctv> findHotspotsByLast30Days(@Param("minCount") long minCount);

    @Query("SELECT h FROM FireHotspotCctv h WHERE h.fireCount7d >= :minCount ORDER BY h.fireCount7d DESC, h.avgSeverityScore DESC")
    List<FireHotspotCctv> findHotspotsByLast7Days(@Param("minCount") long minCount);

    @Query("SELECT h FROM FireHotspotCctv h WHERE h.totalFireCount >= :minCount ORDER BY h.totalFireCount DESC, h.avgSeverityScore DESC")
    List<FireHotspotCctv> findHotspotsByTotal(@Param("minCount") long minCount);
}

