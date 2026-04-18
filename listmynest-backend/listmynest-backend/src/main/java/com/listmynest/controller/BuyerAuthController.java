package com.listmynest.controller;

import com.listmynest.dto.ApiResponse;
import com.listmynest.dto.BuyerAuthResponse;
import com.listmynest.dto.OtpSendRequest;
import com.listmynest.dto.OtpVerifyRequest;
import com.listmynest.service.BuyerAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/buyers")
@RequiredArgsConstructor
@Slf4j
public class BuyerAuthController {

    private final BuyerAuthService buyerAuthService;

    @PostMapping("/otp/send")
    public ApiResponse sendBuyerOtp(@Valid @RequestBody OtpSendRequest request) {
        buyerAuthService.sendBuyerOtp(request.phone());
        return new ApiResponse(true, "OTP sent");
    }

    @PostMapping("/otp/verify")
    public BuyerAuthResponse verifyBuyerOtp(@Valid @RequestBody OtpVerifyRequest request) {
        return buyerAuthService.verifyBuyerOtp(request.phone(), request.otp());
    }
}
