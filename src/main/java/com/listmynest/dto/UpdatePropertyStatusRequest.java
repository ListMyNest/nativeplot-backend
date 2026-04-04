package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdatePropertyStatusRequest(@NotBlank String status) {}
