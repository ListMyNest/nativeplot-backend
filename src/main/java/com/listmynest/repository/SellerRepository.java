package com.listmynest.repository;

// ListMyNest — SellerRepository
// Phase A: Flyway → Entities → Repositories

import com.listmynest.model.Seller;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SellerRepository extends JpaRepository<Seller, UUID> {
    Optional<Seller> findByPhone(String phone);

    boolean existsByPhone(String phone);
}
