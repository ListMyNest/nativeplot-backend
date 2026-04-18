package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;

public record UploadUrlRequest(@NotBlank String fileName) {}
