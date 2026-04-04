package com.listmynest.dto;

import java.util.UUID;

public record AdminAgentDTO(
        UUID id,
        String name,
        String phone,
        String whatsappNumber,
        String assignedCities,
        Boolean active,
        long totalLeads,
        long totalVisits,
        String createdAt
) {}
