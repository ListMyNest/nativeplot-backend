package com.listmynest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record OtpSendRequest(
        @NotBlank @Pattern(regexp = "^\\+91[0-9]{10}$") String phone
) {}
