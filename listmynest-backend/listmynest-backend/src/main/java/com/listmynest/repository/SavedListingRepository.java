package com.listmynest.repository;

// ListMyNest — SavedListingRepository
// Phase A: Flyway → Entities → Repositories

import com.listmynest.model.SavedListing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SavedListingRepository extends JpaRepository<SavedListing, UUID> {
    List<SavedListing> findByBuyer_IdOrderBySavedAtDesc(UUID buyerId);

    boolean existsByBuyerIdAndPropertyId(UUID buyerId, UUID propertyId);

    Optional<SavedListing> findByBuyer_IdAndProperty_Id(UUID buyerId, UUID propertyId);

    long countByBuyer_Id(UUID buyerId);
}
