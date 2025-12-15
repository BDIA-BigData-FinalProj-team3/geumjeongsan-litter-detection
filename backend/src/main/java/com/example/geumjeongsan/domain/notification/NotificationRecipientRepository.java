package com.example.geumjeongsan.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRecipientRepository extends JpaRepository<NotificationRecipient, Long> {
    List<NotificationRecipient> findByIncidentType(String incidentType);
    List<NotificationRecipient> findByRecipientType(String recipientType);
    List<NotificationRecipient> findByIncidentTypeAndRecipientType(String incidentType, String recipientType);
}

