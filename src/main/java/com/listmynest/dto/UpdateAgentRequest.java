package com.listmynest.dto;

public record UpdateAgentRequest(
        String name,
        String whatsappNumber,
        String assignedCities,
        Boolean active
) {}
