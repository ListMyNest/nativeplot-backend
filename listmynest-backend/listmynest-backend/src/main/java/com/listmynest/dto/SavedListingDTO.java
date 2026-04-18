package com.listmynest.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SavedListingDTO(
        UUID id,
        UUID propertyId,
        String propertyTitle,
        String propertyCity,
        BigDecimal priceMin,
        BigDecimal priceMax,
        String primaryPhoto,
        String propertyStatus,
        String savedAt
) {}
