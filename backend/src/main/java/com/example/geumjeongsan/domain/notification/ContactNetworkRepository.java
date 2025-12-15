package com.example.geumjeongsan.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ContactNetworkRepository extends JpaRepository<ContactNetwork, Long> {
    List<ContactNetwork> findByCategory(String category);
}

