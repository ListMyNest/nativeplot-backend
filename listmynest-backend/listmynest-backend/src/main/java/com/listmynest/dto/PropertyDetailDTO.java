package com.listmynest.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Public property detail — includes gallery URLs and a voice contact when available.
 * List endpoints continue to use {@link PublicPropertyDTO} only.
 */
public record PropertyDetailDTO(
        UUID id,
        String title,
        String type,
        String city,
        String locality,
        BigDecimal priceMin,
        BigDecimal priceMax,
        String status,
        Boolean verified,
        Integer viewCount,
        String createdAt,
        BigDecimal areaSqft,
        String configuration,
        String primaryPhoto,
        Integer photoCount,
        String description,
        Integer bathrooms,
        String possession,
        BigDecimal lat,
        BigDecimal lng,
        List<PropertyPhotoPublicDTO> photos,
        /** E.164 voice number for buyer "Call" (assigned agent, else seller). */
        String contactPhone
) {}
