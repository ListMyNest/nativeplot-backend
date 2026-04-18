package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateVisitStatusRequest(
        @NotBlank String status,
        String notes
) {}
