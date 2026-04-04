package com.listmynest.dto;

import java.util.UUID;

public record PhotoDTO(UUID id, String storageUrl, Boolean isPrimary, Integer sortOrder) {}
