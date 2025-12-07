package com.example.geumjeongsan.domain.staff;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StaffUserRepository extends JpaRepository<StaffUser, Long> {
    Optional<StaffUser> findByIdAndIsActiveTrue(Long id);
    
    // 로그인 관련 메서드
    Optional<StaffUser> findByLoginId(String loginId);
    
    Optional<StaffUser> findByNameAndEmailAndPhone(String name, String email, String phone);
    
    Optional<StaffUser> findByLoginIdAndEmailAndPhone(String loginId, String email, String phone);
}

