package com.listmynest.dto;

import java.util.UUID;

public record AdminSellerDTO(
        UUID id,
        String name,
        String phone,
        long totalListings,
        String createdAt
) {}
