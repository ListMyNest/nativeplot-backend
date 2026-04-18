package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;

public record RecordPropertyViewRequest(
        @NotBlank String sessionHash,
        String city
) {}
