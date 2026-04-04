package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record ScheduleVisitRequest(
        @NotNull UUID propertyId,
        @NotNull LocalDate visitDate,
        @NotNull LocalTime visitTime,
        @NotBlank @Pattern(regexp = "^\\+91[0-9]{10}$", message = "Valid Indian mobile number required")
        String buyerPhone
) {}
