package com.listmynest.repository;

// ListMyNest — AdminRepository
// Phase A: Flyway → Entities → Repositories

import com.listmynest.model.Admin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AdminRepository extends JpaRepository<Admin, UUID> {
    Optional<Admin> findByEmail(String email);

    Optional<Admin> findByPhone(String phone);
}
