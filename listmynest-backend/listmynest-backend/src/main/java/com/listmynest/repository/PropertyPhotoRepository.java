package com.listmynest.repository;

import com.listmynest.model.PropertyPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PropertyPhotoRepository extends JpaRepository<PropertyPhoto, UUID> {

    int countByProperty_Id(UUID propertyId);

    Optional<PropertyPhoto> findByIdAndProperty_Id(UUID id, UUID propertyId);

    @Modifying
    @Query("UPDATE PropertyPhoto p SET p.isPrimary = false WHERE p.property.id = :propertyId")
    void clearPrimaryByPropertyId(@Param("propertyId") UUID propertyId);

    Optional<PropertyPhoto> findFirstByProperty_IdAndIsPrimaryTrue(UUID propertyId);

    List<PropertyPhoto> findByProperty_IdOrderBySortOrderAscCreatedAtAsc(UUID propertyId);

    /** Batched for listing pages — avoids N+1 count/primary queries per property. */
    @Query("SELECT ph FROM PropertyPhoto ph JOIN FETCH ph.property WHERE ph.property.id IN :ids")
    List<PropertyPhoto> findAllForListingByPropertyIds(@Param("ids") Collection<UUID> ids);
}
