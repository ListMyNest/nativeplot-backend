package com.listmynest.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record RescheduleVisitRequest(
        @NotNull LocalDate visitDate,
        @NotNull LocalTime visitTime
) {}
