package com.listmynest.service;

import com.listmynest.dto.PropertyDetailDTO;
import com.listmynest.dto.PropertyPhotoPublicDTO;
import com.listmynest.dto.PublicPropertyDTO;
import com.listmynest.model.Property;
import com.listmynest.model.PropertyPhoto;
import com.listmynest.repository.PropertyPhotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Builds {@link PublicPropertyDTO} for list/card endpoints, including primary image URL and photo count.
 */
@Component
@RequiredArgsConstructor
public class PropertyListingAssembler {

    private static final DateTimeFormatter ISO_INSTANT = DateTimeFormatter.ISO_INSTANT;

    private final PropertyPhotoRepository propertyPhotoRepository;
    private final StorageService storageService;

    @Value("${app.fallback-buyer-contact-phone:}")
    private String fallbackBuyerContactPhone;

    public PublicPropertyDTO toPublicDto(Property p) {
        UUID id = p.getId();
        int photoCount = propertyPhotoRepository.countByProperty_Id(id);
        String primaryPhoto = resolvePrimaryPhotoUrl(id);
        String configuration =
                p.getConfiguration() == null ? null : p.getConfiguration().name();
        return new PublicPropertyDTO(
                id,
                p.getTitle(),
                p.getType().name(),
                p.getCity(),
                p.getLocality(),
                p.getPriceMin(),
                p.getPriceMax(),
                p.getStatus().name(),
                p.getVerified(),
                p.getViewCount(),
                ISO_INSTANT.format(p.getCreatedAt().truncatedTo(ChronoUnit.SECONDS)),
                p.getAreaSqft(),
                configuration,
                primaryPhoto,
                photoCount);
    }

    /**
     * Single batched photo query for listing pages (avoids per-row {@code count}/primary lookups).
     */
    public List<PublicPropertyDTO> toPublicDtos(List<Property> properties) {
        if (properties.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = properties.stream().map(Property::getId).toList();
        Map<UUID, BatchPhotoInfo> agg = loadBatchPhotoInfo(ids);
        return properties.stream().map(p -> toPublicDtoFromBatch(p, agg.get(p.getId()))).toList();
    }

    private record BatchPhotoInfo(int photoCount, String primaryPhotoDisplayUrl) {}

    private Map<UUID, BatchPhotoInfo> loadBatchPhotoInfo(List<UUID> propertyIds) {
        List<PropertyPhoto> photos =
                propertyPhotoRepository.findAllForListingByPropertyIds(propertyIds);
        Map<UUID, List<PropertyPhoto>> byProp = new LinkedHashMap<>();
        for (PropertyPhoto ph : photos) {
            UUID pid = ph.getProperty().getId();
            byProp.computeIfAbsent(pid, k -> new ArrayList<>()).add(ph);
        }
        Map<UUID, BatchPhotoInfo> out = new HashMap<>();
        for (UUID id : propertyIds) {
            List<PropertyPhoto> list = byProp.getOrDefault(id, List.of());
            out.put(id, new BatchPhotoInfo(list.size(), pickPrimaryDisplayUrl(list)));
        }
        return out;
    }

    private String pickPrimaryDisplayUrl(List<PropertyPhoto> list) {
        if (list.isEmpty()) {
            return null;
        }
        Optional<PropertyPhoto> primary =
                list.stream().filter(ph -> Boolean.TRUE.equals(ph.getIsPrimary())).findFirst();
        if (primary.isPresent()) {
            return toDisplayUrl(primary.get().getStorageUrl());
        }
        List<PropertyPhoto> sorted = new ArrayList<>(list);
        sorted.sort(
                Comparator.comparing(PropertyPhoto::getSortOrder, Comparator.nullsFirst(Integer::compareTo))
                        .thenComparing(PropertyPhoto::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));
        return toDisplayUrl(sorted.get(0).getStorageUrl());
    }

    private PublicPropertyDTO toPublicDtoFromBatch(Property p, BatchPhotoInfo info) {
        BatchPhotoInfo i = info != null ? info : new BatchPhotoInfo(0, null);
        String configuration =
                p.getConfiguration() == null ? null : p.getConfiguration().name();
        return new PublicPropertyDTO(
                p.getId(),
                p.getTitle(),
                p.getType().name(),
                p.getCity(),
                p.getLocality(),
                p.getPriceMin(),
                p.getPriceMax(),
                p.getStatus().name(),
                p.getVerified(),
                p.getViewCount(),
                ISO_INSTANT.format(p.getCreatedAt().truncatedTo(ChronoUnit.SECONDS)),
                p.getAreaSqft(),
                configuration,
                i.primaryPhotoDisplayUrl(),
                i.photoCount());
    }

    public PropertyDetailDTO toDetailDto(Property p) {
        PublicPropertyDTO base = toPublicDto(p);
        UUID id = p.getId();
        List<PropertyPhoto> ordered =
                propertyPhotoRepository.findByProperty_IdOrderBySortOrderAscCreatedAtAsc(id);
        List<PropertyPhotoPublicDTO> photos = ordered.stream()
                .map(ph -> new PropertyPhotoPublicDTO(
                        ph.getId(),
                        toDisplayUrl(ph.getStorageUrl()),
                        Boolean.TRUE.equals(ph.getIsPrimary()),
                        ph.getSortOrder() == null ? 0 : ph.getSortOrder()
                ))
                .toList();
        String possession = p.getPossession() == null ? null : p.getPossession().name();
        String contactPhone = resolveContactPhone(p);
        return new PropertyDetailDTO(
                base.id(),
                base.title(),
                base.type(),
                base.city(),
                base.locality(),
                base.priceMin(),
                base.priceMax(),
                base.status(),
                base.verified(),
                base.viewCount(),
                base.createdAt(),
                base.areaSqft(),
                base.configuration(),
                base.primaryPhoto(),
                base.photoCount(),
                p.getDescription(),
                p.getBathrooms(),
                possession,
                p.getLat(),
                p.getLng(),
                photos,
                contactPhone
        );
    }

    private String resolveContactPhone(Property p) {
        if (p.getAgent() != null && StringUtils.hasText(p.getAgent().getPhone())) {
            return p.getAgent().getPhone().trim();
        }
        if (p.getSeller() != null && StringUtils.hasText(p.getSeller().getPhone())) {
            return p.getSeller().getPhone().trim();
        }
        if (StringUtils.hasText(fallbackBuyerContactPhone)) {
            return fallbackBuyerContactPhone.trim();
        }
        return null;
    }

    private String resolvePrimaryPhotoUrl(UUID propertyId) {
        Optional<PropertyPhoto> primary =
                propertyPhotoRepository.findFirstByProperty_IdAndIsPrimaryTrue(propertyId);
        if (primary.isPresent()) {
            return toDisplayUrl(primary.get().getStorageUrl());
        }
        List<PropertyPhoto> ordered =
                propertyPhotoRepository.findByProperty_IdOrderBySortOrderAscCreatedAtAsc(propertyId);
        if (ordered.isEmpty()) {
            return null;
        }
        return toDisplayUrl(ordered.get(0).getStorageUrl());
    }

    private String toDisplayUrl(String storageUrl) {
        if (storageUrl == null || storageUrl.isBlank()) {
            return null;
        }
        String out = storageService.resolveReadableImageUrl(storageUrl.trim());
        return out.isBlank() ? null : out;
    }
}
