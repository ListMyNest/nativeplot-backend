package com.listmynest.service;

import com.listmynest.dto.SavedListingDTO;
import com.listmynest.exception.AppException;
import com.listmynest.model.Buyer;
import com.listmynest.model.Property;
import com.listmynest.model.PropertyPhoto;
import com.listmynest.model.PropertyStatus;
import com.listmynest.repository.BuyerRepository;
import com.listmynest.repository.PropertyPhotoRepository;
import com.listmynest.repository.PropertyRepository;
import com.listmynest.model.SavedListing;
import com.listmynest.repository.SavedListingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SavedListingService {

    private static final DateTimeFormatter ISO_INSTANT = DateTimeFormatter.ISO_INSTANT;

    private final SavedListingRepository savedListingRepository;
    private final BuyerRepository buyerRepository;
    private final PropertyRepository propertyRepository;
    private final PropertyPhotoRepository propertyPhotoRepository;

    @Transactional
    public SavedListingDTO saveListing(UUID buyerId, UUID propertyId) {
        Buyer buyer = buyerRepository.findById(buyerId)
                .orElseThrow(() -> new AppException(404, "BUYER_NOT_FOUND"));
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new AppException(404, "PROPERTY_NOT_FOUND"));

        if (savedListingRepository.existsByBuyerIdAndPropertyId(buyerId, propertyId)) {
            throw new AppException(409, "ALREADY_SAVED");
        }

        SavedListing sl = SavedListing.builder()
                .buyer(buyer)
                .property(property)
                .build();
        sl = savedListingRepository.save(sl);
        return toDto(sl);
    }

    @Transactional
    public void removeSavedListing(UUID buyerId, UUID propertyId) {
        var existing = savedListingRepository.findByBuyer_IdAndProperty_Id(buyerId, propertyId)
                .orElseThrow(() -> new AppException(404, "SAVED_LISTING_NOT_FOUND"));
        savedListingRepository.delete(existing);
    }

    @Transactional(readOnly = true)
    public List<SavedListingDTO> getSavedListings(UUID buyerId) {
        if (!buyerRepository.existsById(buyerId)) {
            throw new AppException(404, "BUYER_NOT_FOUND");
        }
        return savedListingRepository.findByBuyer_IdOrderBySavedAtDesc(buyerId).stream()
                .map(this::toDto)
                .toList();
    }

    private SavedListingDTO toDto(SavedListing sl) {
        Property p = sl.getProperty();
        String primary = resolvePrimaryPhotoUrl(p.getId());
        return new SavedListingDTO(
                sl.getId(),
                p.getId(),
                p.getTitle(),
                p.getCity(),
                p.getPriceMin(),
                p.getPriceMax(),
                primary,
                buyerFacingStatus(p.getStatus()),
                ISO_INSTANT.format(sl.getSavedAt().truncatedTo(ChronoUnit.SECONDS))
        );
    }

    private String resolvePrimaryPhotoUrl(UUID propertyId) {
        return propertyPhotoRepository.findFirstByProperty_IdAndIsPrimaryTrue(propertyId)
                .map(PropertyPhoto::getStorageUrl)
                .or(() -> propertyPhotoRepository.findByProperty_IdOrderBySortOrderAscCreatedAtAsc(propertyId).stream()
                        .findFirst()
                        .map(PropertyPhoto::getStorageUrl))
                .orElse(null);
    }

    private static String buyerFacingStatus(PropertyStatus status) {
        if (status == null) {
            return "INACTIVE";
        }
        if (status == PropertyStatus.SOLD) {
            return "SOLD";
        }
        if (status == PropertyStatus.ACTIVE) {
            return "ACTIVE";
        }
        return "INACTIVE";
    }
}
