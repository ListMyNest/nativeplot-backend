package com.listmynest.dto;

import java.util.UUID;

public record AdminBuyerDTO(
        UUID id,
        String phone,
        String verifiedAt,
        long savedListingsCount,
        String createdAt
) {}
