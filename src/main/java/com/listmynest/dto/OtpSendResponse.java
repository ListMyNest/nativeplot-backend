package com.listmynest.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * OTP send acknowledgement. {@code devOtp} is only set when MSG91 is not configured.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OtpSendResponse(boolean success, String message, String devOtp) {}
