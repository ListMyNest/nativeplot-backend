package com.listmynest.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Public listing shape — never includes seller_phone or agent_phone.
 */
public record PublicPropertyDTO(
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
        String createdAt
) {}
