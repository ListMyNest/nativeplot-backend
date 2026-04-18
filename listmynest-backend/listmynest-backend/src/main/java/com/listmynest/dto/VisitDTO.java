package com.listmynest.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record VisitDTO(
        UUID id,
        UUID propertyId,
        String propertyTitle,
        String buyerPhone,
        LocalDate visitDate,
        LocalTime visitTime,
        String status,
        Boolean postVisitWaSent,
        String notes,
        String createdAt
) {}
