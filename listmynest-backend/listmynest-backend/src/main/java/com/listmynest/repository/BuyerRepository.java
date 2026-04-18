package com.listmynest.repository;

// ListMyNest — BuyerRepository
// Phase A: Flyway → Entities → Repositories

import com.listmynest.model.Buyer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BuyerRepository extends JpaRepository<Buyer, UUID> {
    Optional<Buyer> findByPhone(String phone);

    Page<Buyer> findByVerifiedAtIsNotNullOrderByCreatedAtDesc(Pageable pageable);
}
