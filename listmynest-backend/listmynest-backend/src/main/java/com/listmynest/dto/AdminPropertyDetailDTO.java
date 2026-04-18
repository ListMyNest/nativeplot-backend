package com.listmynest.dto;

/**
 * Admin property detail (full gallery + extra contact fields).
 */
public record AdminPropertyDetailDTO(
        PropertyDetailDTO property,
        String sellerName,
        String sellerPhone,
        String agentName,
        String agentPhone
) {}

