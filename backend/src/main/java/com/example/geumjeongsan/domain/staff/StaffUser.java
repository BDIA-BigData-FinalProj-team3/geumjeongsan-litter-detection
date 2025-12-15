package com.example.geumjeongsan.domain.staff;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "staff_user")
@Getter
@Setter
public class StaffUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(name = "login_id", unique = true, length = 50)
    private String loginId;

    @Column(name = "password", length = 200)
    private String password;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "role", length = 50)
    private String role; // "119", "산림직원", "관리자" 등

    @Column(name = "dept_group", length = 100)
    private String deptGroup;

    @Column(name = "dept_name", length = 100)
    private String deptName;

    @Column(name = "position", length = 50)
    private String position;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "email", length = 100)
    private String email;
    
    @Column(name = "duty_task", columnDefinition = "text")
    private String dutyTask;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

