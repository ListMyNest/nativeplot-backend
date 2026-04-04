package com.listmynest.controller;

import com.listmynest.dto.ApiResponse;
import com.listmynest.dto.AuthResponse;
import com.listmynest.dto.OtpSendRequest;
import com.listmynest.dto.OtpVerifyRequest;
import com.listmynest.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/otp/send")
    public ApiResponse sendOtp(@Valid @RequestBody OtpSendRequest request) {
        authService.sendOtp(request.phone());
        return new ApiResponse(true, "OTP sent");
    }

    @PostMapping("/otp/verify")
    public AuthResponse verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        return authService.verifyOtp(request.phone(), request.otp());
    }

    @PostMapping("/token/refresh")
    public AuthResponse refresh(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        return authService.refreshToken(authorization);
    }
}
