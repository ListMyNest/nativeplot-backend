package com.listmynest.dto;

import java.util.UUID;

public record AdminPropertyDTO(
        UUID id,
        String title,
        String type,
        String city,
        String status,
        Boolean verified,
        String sellerName,
        String sellerPhone,
        String agentName,
        String agentPhone,
        int viewCount,
        String createdAt
) {}
