package com.listmynest.dto;

import java.util.UUID;

public record AgentMeDTO(
        UUID id,
        String name,
        String phone,
        String whatsappNumber,
        String assignedCities,
        Boolean active,
        long newLeads,
        long todayVisits,
        long totalVisitsDone,
        long waLeads,
        String createdAt
) {}
