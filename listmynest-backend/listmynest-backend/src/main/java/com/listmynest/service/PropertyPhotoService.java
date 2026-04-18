package com.listmynest.service;

import com.listmynest.dto.PhotoDTO;
import com.listmynest.dto.RegisterPhotoRequest;
import com.listmynest.dto.UploadUrlResponse;
import com.listmynest.exception.AppException;
import com.listmynest.model.Property;
import com.listmynest.model.PropertyPhoto;
import com.listmynest.repository.PropertyPhotoRepository;
import com.listmynest.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyPhotoService {

    private final PropertyRepository propertyRepository;
    private final PropertyPhotoRepository propertyPhotoRepository;
    private final StorageService storageService;

    public UploadUrlResponse createSignedUploadUrl(UUID propertyId, String fileName, UUID sellerId) {
        Property property = loadPropertyOwnedBySeller(propertyId, sellerId);
        return storageService.generateUploadUrl(property.getId(), fileName);
    }

    @Transactional
    public PhotoDTO registerPhoto(UUID propertyId, RegisterPhotoRequest request, UUID sellerId) {
        Property property = loadPropertyOwnedBySeller(propertyId, sellerId);

        if (Boolean.TRUE.equals(request.isPrimary())) {
            propertyPhotoRepository.clearPrimaryByPropertyId(propertyId);
        }

        PropertyPhoto photo = PropertyPhoto.builder()
                .property(property)
                .storageUrl(request.storageUrl())
                .isPrimary(Boolean.TRUE.equals(request.isPrimary()))
                .sortOrder(request.sortOrder() != null ? request.sortOrder() : 0)
                .build();
        photo = propertyPhotoRepository.save(photo);
        return toDto(photo);
    }

    @Transactional
    public void deletePhoto(UUID propertyId, UUID photoId, UUID sellerId) {
        loadPropertyOwnedBySeller(propertyId, sellerId);
        PropertyPhoto photo = propertyPhotoRepository.findByIdAndProperty_Id(photoId, propertyId)
                .orElseThrow(() -> new AppException(404, "PHOTO_NOT_FOUND"));

        storageService.deletePhoto(photo.getStorageUrl());
        propertyPhotoRepository.delete(photo);
    }

    @Transactional
    public PhotoDTO setPrimary(UUID propertyId, UUID photoId, UUID sellerId) {
        loadPropertyOwnedBySeller(propertyId, sellerId);
        PropertyPhoto photo = propertyPhotoRepository.findByIdAndProperty_Id(photoId, propertyId)
                .orElseThrow(() -> new AppException(404, "PHOTO_NOT_FOUND"));

        propertyPhotoRepository.clearPrimaryByPropertyId(propertyId);
        photo.setIsPrimary(true);
        photo = propertyPhotoRepository.save(photo);
        return toDto(photo);
    }

    private Property loadPropertyOwnedBySeller(UUID propertyId, UUID sellerId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new AppException(404, "PROPERTY_NOT_FOUND"));
        if (property.getSeller() == null || !property.getSeller().getId().equals(sellerId)) {
            throw new AppException(403, "FORBIDDEN");
        }
        return property;
    }

    private static PhotoDTO toDto(PropertyPhoto photo) {
        return new PhotoDTO(
                photo.getId(),
                photo.getStorageUrl(),
                photo.getIsPrimary(),
                photo.getSortOrder()
        );
    }
}
