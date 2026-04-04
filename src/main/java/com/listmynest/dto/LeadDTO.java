package com.listmynest.dto;

import java.util.UUID;

public record LeadDTO(
        UUID id,
        UUID propertyId,
        String propertyTitle,
        String actionType,
        String buyerPhone,
        String waIntent,
        String city,
        String createdAt
) {}
