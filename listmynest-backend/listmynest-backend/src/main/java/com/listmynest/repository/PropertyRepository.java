package com.listmynest.repository;

// ListMyNest — PropertyRepository
// Phase A: Flyway → Entities → Repositories

import com.listmynest.model.Property;
import com.listmynest.model.PropertyStatus;
import com.listmynest.model.PropertyType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface PropertyRepository extends JpaRepository<Property, UUID>, JpaSpecificationExecutor<Property> {
    List<Property> findBySeller_Id(UUID sellerId);

    long countBySeller_Id(UUID sellerId);

    long countBySeller_IdAndStatus(UUID sellerId, PropertyStatus status);

    @Query("SELECT COUNT(v) FROM Visit v WHERE v.property.seller.id = :sellerId")
    long countVisitsForSellerProperties(@Param("sellerId") UUID sellerId);

    List<Property> findByStatusAndCityAndType(PropertyStatus status, String city, PropertyType type, Pageable pageable);

    List<Property> findByStatusIn(List<PropertyStatus> statuses, Pageable pageable);

    List<Property> findByStatusAndLastActivityAtBefore(PropertyStatus status, Instant cutoff);

    List<Property> findByStatusAndSoldAtBefore(PropertyStatus status, Instant cutoff);

    List<Property> findBySellerIdAndStatusNot(UUID sellerId, PropertyStatus status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Property p SET p.viewCount = COALESCE(p.viewCount, 0) + :count WHERE p.id = :id")
    void incrementViewCount(@Param("id") UUID id, @Param("count") int count);
}
