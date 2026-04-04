package com.listmynest.dto;

import java.util.UUID;

public record AuditLogDTO(
        UUID id,
        String adminName,
        String action,
        String entityType,
        UUID entityId,
        String notes,
        String createdAt
) {}
