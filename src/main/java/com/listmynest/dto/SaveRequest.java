package com.listmynest.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SaveRequest(@NotNull UUID propertyId) {}
