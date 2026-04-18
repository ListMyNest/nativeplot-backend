package com.listmynest.dto;

public record AgentDashboardDTO(
        long newLeads,
        long todayVisits,
        long totalVisitsDone,
        long waLeads
) {}
