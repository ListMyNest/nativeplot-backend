package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record LogLeadRequest(
        @NotNull UUID propertyId,
        @NotBlank String actionType,
        @NotBlank String sessionHash,
        String city,
        String buyerPhone
) {}
