package com.listmynest.dto;

public record SellerDashboardDTO(
        long totalListings,
        long activeListings,
        long totalEnquiries,
        long totalVisits
) {}
