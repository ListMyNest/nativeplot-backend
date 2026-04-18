package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;

public record FirebaseTokenRequest(@NotBlank String idToken) {}

