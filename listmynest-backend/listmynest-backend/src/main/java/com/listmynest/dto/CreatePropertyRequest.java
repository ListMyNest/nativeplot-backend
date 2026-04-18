package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreatePropertyRequest(
        @NotBlank String title,
        String description,
        @NotBlank String type,
        @NotBlank String city,
        String locality,
        @NotNull BigDecimal priceMin,
        @NotNull BigDecimal priceMax,
        BigDecimal areaSqft,
        String configuration,
        Integer bathrooms,
        String possession
) {}

