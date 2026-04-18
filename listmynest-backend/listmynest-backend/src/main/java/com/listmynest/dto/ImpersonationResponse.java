package com.listmynest.dto;

import java.util.UUID;

public record ImpersonationResponse(
        String token,
        UUID sellerId,
        String sellerName,
        String expiresAt
) {}
