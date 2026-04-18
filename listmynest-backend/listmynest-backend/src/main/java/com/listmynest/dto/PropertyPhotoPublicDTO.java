package com.listmynest.dto;

import java.util.UUID;

public record PropertyPhotoPublicDTO(
        UUID id,
        String url,
        boolean isPrimary,
        int sortOrder
) {}
