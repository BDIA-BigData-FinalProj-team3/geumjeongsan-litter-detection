package com.example.geumjeongsan.domain.notification;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import java.time.OffsetDateTime;

@Entity
@Table(name = "v_notification_recipients")
@Immutable  // VIEW는 읽기 전용
@Getter
@NoArgsConstructor
public class NotificationRecipient {
    
    @Id
    @Column(name = "subscription_id")
    private Long subscriptionId;
    
    @Column(name = "recipient_type")
    private String recipientType;  // STAFF or EXTERNAL
    
    @Column(name = "recipient_id")
    private Long recipientId;
    
    @Column(name = "name")
    private String name;
    
    @Column(name = "phone")
    private String phone;
    
    @Column(name = "email")
    private String email;
    
    @Column(name = "organization")
    private String organization;
    
    @Column(name = "department")
    private String department;
    
    @Column(name = "position")
    private String position;
    
    @Column(name = "incident_type")
    private String incidentType;
    
    @Column(name = "is_enabled")
    private Boolean isEnabled;
    
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

