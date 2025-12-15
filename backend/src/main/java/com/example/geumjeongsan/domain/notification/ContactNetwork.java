package com.example.geumjeongsan.domain.notification;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.OffsetDateTime;

@Entity
@Table(name = "contact_network")
@Getter
@Setter
public class ContactNetwork {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "contact_id")
    private Long id;
    
    @Column(name = "category", length = 20, nullable = false)
    private String category; // FIRE, HOSPITAL, POLICE
    
    @Column(name = "name", length = 50, nullable = false)
    private String name;
    
    @Column(name = "phone", length = 30, nullable = false)
    private String phone;
    
    @Column(name = "organization", length = 100)
    private String organization;
    
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
    
    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}

