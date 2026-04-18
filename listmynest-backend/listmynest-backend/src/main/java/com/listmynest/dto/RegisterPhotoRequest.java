package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;

public record RegisterPhotoRequest(
        @NotBlank String storageUrl,
        Boolean isPrimary,
        Integer sortOrder
) {}
