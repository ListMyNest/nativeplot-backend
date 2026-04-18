package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;

public record NotifyMeRequest(
        @NotBlank String phone,
        @NotBlank String city
) {}
