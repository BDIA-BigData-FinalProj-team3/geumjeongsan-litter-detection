package com.example.geumjeongsan.domain.notification;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.OffsetDateTime;

@Entity
@Table(name = "notification_subscription")
@Getter
@Setter
public class NotificationSubscription {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subscription_id")
    private Long id;
    
    @Column(name = "user_id")
    private Long userId;  // nullable
    
    @Column(name = "contact_id")
    private Long contactId;  // nullable
    
    @Column(name = "incident_type", length = 20, nullable = false)
    private String incidentType; // EMERGENCY, FIRE, TRASH, ROCKFALL
    
    @Column(name = "is_enabled")
    private Boolean isEnabled = true;
    
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
    
    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        if (isEnabled == null) {
            isEnabled = true;
        }
    }
}

