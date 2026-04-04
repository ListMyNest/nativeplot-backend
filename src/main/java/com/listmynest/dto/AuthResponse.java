package com.listmynest.dto;

import java.util.UUID;

public record AuthResponse(String token, String role, UUID userId, String name) {}
