package com.example.geumjeongsan.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationSubscriptionRepository extends JpaRepository<NotificationSubscription, Long> {
    List<NotificationSubscription> findByUserId(Long userId);
    List<NotificationSubscription> findByContactId(Long contactId);
    Optional<NotificationSubscription> findByUserIdAndIncidentType(Long userId, String incidentType);
    Optional<NotificationSubscription> findByContactIdAndIncidentType(Long contactId, String incidentType);
    void deleteByUserIdAndIncidentType(Long userId, String incidentType);
    void deleteByContactIdAndIncidentType(Long contactId, String incidentType);
}

