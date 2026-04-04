package com.listmynest.service;

import com.listmynest.config.JwtService;
import com.listmynest.dto.BuyerAuthResponse;
import com.listmynest.exception.AppException;
import com.listmynest.model.Buyer;
import com.listmynest.repository.BuyerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BuyerAuthService {

    private final RedisService redis;
    private final JwtService jwtService;
    private final BuyerRepository buyerRepository;
    private final MSG91Service msg91Service;

    @Value("${msg91.auth-key:}")
    private String msg91AuthKey;

    @Value("${msg91.otp-length:6}")
    private int msg91OtpLength;

    public void sendBuyerOtp(String phone) {
        String countKey = "buyer_otp_send:" + phone;
        String existing = redis.get(countKey);
        int count = existing == null ? 0 : Integer.parseInt(existing);
        if (count >= 3) {
            throw new AppException(429, "OTP_LIMIT_EXCEEDED");
        }

        int digits = Math.max(4, Math.min(10, msg91OtpLength));
        String otp = generateNumericOtp(digits);
        String hash = sha256Hex(otp);
        redis.set("buyer_otp:" + phone, otpJson(hash, 0), 300);

        Long newCount = redis.increment(countKey);
        if (newCount != null && newCount == 1L) {
            redis.expire(countKey, 3600);
        }

        boolean devMode = msg91AuthKey == null || msg91AuthKey.isBlank();
        if (devMode) {
            log.warn("MSG91_AUTH_KEY is blank — skipping buyer SMS send (dev mode)");
            log.info("DEV MODE OTP for {}: {}", phone, otp);
            return;
        }
        if (!msg91Service.sendSms(phone, "Your ListMyNest verification code is " + otp)) {
            throw new AppException(503, "SMS_SEND_FAILED");
        }
    }

    @Transactional
    public BuyerAuthResponse verifyBuyerOtp(String phone, String otp) {
        String key = "buyer_otp:" + phone;
        String raw = redis.get(key);
        if (raw == null) {
            throw new AppException(400, "OTP_EXPIRED");
        }

        String storedHash = parseHash(raw);
        int attempts = parseAttempts(raw);
        if (attempts >= 3) {
            throw new AppException(400, "OTP_MAX_ATTEMPTS");
        }

        String computed = sha256Hex(otp);
        if (storedHash == null || !computed.equals(storedHash)) {
            int next = attempts + 1;
            Long ttl = redis.getExpireSeconds(key);
            long seconds = ttl == null || ttl <= 0 ? 300 : ttl;
            redis.set(key, otpJson(storedHash != null ? storedHash : "", next), seconds);
            throw new AppException(400, "OTP_INVALID");
        }

        redis.delete(key);

        Optional<Buyer> existing = buyerRepository.findByPhone(phone);
        Buyer buyer = existing.orElseGet(() -> buyerRepository.save(
                Buyer.builder()
                        .phone(phone)
                        .verifiedAt(Instant.now())
                        .build()
        ));
        if (buyer.getVerifiedAt() == null) {
            buyer.setVerifiedAt(Instant.now());
            buyer = buyerRepository.save(buyer);
        }

        String token = jwtService.generateToken(buyer.getId(), "BUYER", java.util.Map.of());
        return new BuyerAuthResponse(token, buyer.getId());
    }

    private static String generateNumericOtp(int digits) {
        SecureRandom rnd = new SecureRandom();
        int bound = (int) Math.pow(10, digits);
        int n = rnd.nextInt(bound);
        return String.format("%0" + digits + "d", n);
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private static String otpJson(String hash, int attempts) {
        return "{\"hash\":\"" + hash + "\",\"attempts\":" + attempts + "}";
    }

    private static String parseHash(String json) {
        int s = json.indexOf("\"hash\":\"");
        if (s < 0) {
            return null;
        }
        s += "\"hash\":\"".length();
        int e = json.indexOf('"', s);
        if (e < 0) {
            return null;
        }
        return json.substring(s, e);
    }

    private static int parseAttempts(String json) {
        int idx = json.indexOf("\"attempts\":");
        if (idx < 0) {
            return 0;
        }
        int start = idx + "\"attempts\":".length();
        int end = json.indexOf('}', start);
        if (end < 0) {
            end = json.length();
        }
        try {
            return Integer.parseInt(json.substring(start, end).trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
