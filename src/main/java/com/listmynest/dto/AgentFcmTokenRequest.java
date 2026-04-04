package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;

public record AgentFcmTokenRequest(@NotBlank String fcmToken) {}
