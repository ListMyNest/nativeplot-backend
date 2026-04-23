package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public record CreateSellerRequest(
        @NotBlank String name,
        @NotBlank @Pattern(regexp = "^\\+91[0-9]{10}$") String phone,
        @NotBlank String password,
        UUID preferredAgentId
) {}
