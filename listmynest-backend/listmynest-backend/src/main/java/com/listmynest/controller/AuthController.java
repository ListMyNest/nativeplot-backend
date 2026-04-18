package com.listmynest.controller;

import com.listmynest.dto.CreateSellerRequest;
import com.listmynest.dto.OtpSendResponse;
import com.listmynest.dto.AuthResponse;
import com.listmynest.dto.FirebaseTokenRequest;
import com.listmynest.dto.OtpSendRequest;
import com.listmynest.dto.OtpVerifyRequest;
import com.listmynest.dto.PasswordLoginRequest;
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
    public OtpSendResponse sendOtp(@Valid @RequestBody OtpSendRequest request) {
        String devOtp = authService.sendOtp(request.phone());
        return new OtpSendResponse(true, "OTP sent", devOtp);
    }

    @PostMapping("/otp/verify")
    public AuthResponse verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        return authService.verifyOtp(request.phone(), request.otp());
    }

    @PostMapping("/firebase/verify")
    public AuthResponse verifyFirebase(@Valid @RequestBody FirebaseTokenRequest request) {
        return authService.verifyFirebaseIdToken(request.idToken());
    }

    @PostMapping("/password/login")
    public AuthResponse passwordLogin(@Valid @RequestBody PasswordLoginRequest request) {
        return authService.passwordLogin(request.phone(), request.password(), request.role());
    }

    @PostMapping("/seller/register")
    public AuthResponse registerSeller(@Valid @RequestBody CreateSellerRequest request) {
        return authService.registerSeller(request);
    }

    @PostMapping("/token/refresh")
    public AuthResponse refresh(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        return authService.refreshToken(authorization);
    }
}
