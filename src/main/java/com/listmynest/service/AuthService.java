package com.listmynest.service;

import com.listmynest.config.JwtService;
import com.listmynest.dto.AuthResponse;
import com.listmynest.exception.AppException;
import com.listmynest.model.Agent;
import com.listmynest.model.Seller;
import com.listmynest.repository.AgentRepository;
import com.listmynest.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final ConcurrentHashMap<String, String> localOtpFallback = new ConcurrentHashMap<>();

    private final RedisService redis;
    private final JwtService jwtService;
    private final AgentRepository agentRepository;
    private final SellerRepository sellerRepository;
    private final MSG91Service msg91Service;

    @Value("${msg91.auth-key:}")
    private String msg91AuthKey;

    @Value("${msg91.otp-length:6}")
    private int msg91OtpLength;

    /**
     * @return OTP plaintext in dev mode (MSG91 disabled) for UI/testing; otherwise {@code null}
     */
    public String sendOtp(String phone) {
        String countKey = "otp_send_count:" + phone;
        String otpKey = "otp:" + phone;

        String existing = null;
        try {
            existing = redis.get(countKey);
        } catch (Exception e) {
            log.warn("Redis unavailable - running in no-cache dev mode");
        }
        if (existing == null) {
            existing = localOtpFallback.get(countKey);
        }
        int count = parseCount(existing);
        if (count >= 3) {
            throw new AppException(429, "OTP_LIMIT_EXCEEDED");
        }

        int digits = Math.max(4, Math.min(10, msg91OtpLength));
        String otp = generateNumericOtp(digits);
        String hash = sha256Hex(otp);
        String payload = otpJson(hash, 0);

        try {
            redis.set(otpKey, payload, 300);
        } catch (Exception e) {
            log.warn("Redis unavailable - running in no-cache dev mode");
            localOtpFallback.put(otpKey, payload);
        }

        try {
            Long newCount = redis.increment(countKey);
            if (newCount != null && newCount == 1L) {
                redis.expire(countKey, 3600);
            }
        } catch (Exception e) {
            log.warn("Redis unavailable - running in no-cache dev mode");
            int next = count + 1;
            localOtpFallback.put(countKey, String.valueOf(next));
        }

        boolean devMode = msg91AuthKey == null || msg91AuthKey.isBlank();
        if (devMode) {
            log.warn("MSG91_AUTH_KEY is blank — skipping SMS send (dev mode)");
            log.info("DEV MODE OTP for {}: {}", phone, otp);
            return otp;
        }

        if (!msg91Service.sendSms(phone, "Your ListMyNest OTP is " + otp)) {
            throw new AppException(503, "SMS_SEND_FAILED");
        }
        return null;
    }

    public AuthResponse verifyOtp(String phone, String otp) {
        String key = "otp:" + phone;
        String raw = null;
        try {
            raw = redis.get(key);
        } catch (Exception e) {
            log.warn("Redis unavailable - running in no-cache dev mode");
        }
        if (raw == null) {
            raw = localOtpFallback.get(key);
        }
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
            long seconds;
            try {
                Long ttl = redis.getExpireSeconds(key);
                seconds = ttl == null || ttl <= 0 ? 300 : ttl;
            } catch (Exception e) {
                log.warn("Redis unavailable - running in no-cache dev mode");
                seconds = 300;
            }
            String updated = otpJson(storedHash != null ? storedHash : "", next);
            try {
                redis.set(key, updated, seconds);
            } catch (Exception e) {
                log.warn("Redis unavailable - running in no-cache dev mode");
                localOtpFallback.put(key, updated);
            }
            throw new AppException(400, "OTP_INVALID");
        }

        try {
            redis.delete(key);
        } catch (Exception e) {
            log.warn("Redis unavailable - running in no-cache dev mode");
        }
        localOtpFallback.remove(key);

        Optional<Agent> agent = agentRepository.findByPhone(phone);
        if (agent.isPresent()) {
            Agent a = agent.get();
            String token = jwtService.generateToken(a.getId(), "AGENT", java.util.Map.of());
            return new AuthResponse(token, "AGENT", a.getId(), a.getName());
        }

        Optional<Seller> seller = sellerRepository.findByPhone(phone);
        if (seller.isPresent()) {
            Seller s = seller.get();
            String name = s.getName() == null ? "" : s.getName();
            String token = jwtService.generateToken(s.getId(), "SELLER");
            return new AuthResponse(token, "SELLER", s.getId(), name);
        }

        throw new AppException(404, "USER_NOT_FOUND");
    }

    public AuthResponse refreshToken(String bearerToken) {
        if (bearerToken == null || !bearerToken.startsWith("Bearer ")) {
            throw new AppException(401, "INVALID_TOKEN");
        }
        String token = bearerToken.substring("Bearer ".length()).trim();
        if (token.isEmpty() || !jwtService.validateToken(token)) {
            throw new AppException(401, "INVALID_TOKEN");
        }
        UUID userId = jwtService.extractUserId(token);
        String role = jwtService.extractRole(token);
        if (role == null || role.isBlank()) {
            throw new AppException(401, "INVALID_TOKEN");
        }

        String name = "";
        if ("AGENT".equalsIgnoreCase(role)) {
            name = agentRepository.findById(userId).map(Agent::getName).orElse("");
        } else if ("SELLER".equalsIgnoreCase(role)) {
            name = sellerRepository.findById(userId).map(s -> s.getName() == null ? "" : s.getName()).orElse("");
        }

        Map<String, Object> extra = jwtService.extractCustomClaimsForRefresh(token);
        String newToken = jwtService.generateToken(userId, role, extra);
        return new AuthResponse(newToken, role.toUpperCase(), userId, name);
    }

    private static int parseCount(String existing) {
        if (existing == null || existing.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(existing.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
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
