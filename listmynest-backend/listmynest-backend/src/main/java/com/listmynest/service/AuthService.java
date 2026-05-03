package com.listmynest.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.listmynest.config.JwtService;
import com.listmynest.dto.AuthResponse;
import com.listmynest.dto.CreateSellerRequest;
import com.listmynest.exception.AppException;
import com.listmynest.model.Agent;
import com.listmynest.model.Seller;
import com.listmynest.repository.AgentRepository;
import com.listmynest.repository.SellerRepository;
import com.listmynest.util.LogMaskUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

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
    private final PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private FirebaseApp firebaseApp;

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
            log.warn("RATE_LIMIT_HIT phone={} action=OTP_SEND", LogMaskUtil.maskPhone(phone));
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
            log.info(
                    "OTP_SENT phone={} mode=DEV(no_msg91) devOtpReturnedToClient=true",
                    LogMaskUtil.maskPhone(phone)
            );
            return otp;
        }

        if (!msg91Service.sendSms(phone, "Your ListMyNest OTP is " + otp)) {
            log.warn("OTP_FAILED phone={} reason=SMS_SEND_FAILED attempts=n/a", LogMaskUtil.maskPhone(phone));
            throw new AppException(503, "SMS_SEND_FAILED");
        }
        log.info("OTP_SENT phone={} mode=MSG91", LogMaskUtil.maskPhone(phone));
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
            log.warn("OTP_FAILED phone={} reason=OTP_EXPIRED attempts=n/a", LogMaskUtil.maskPhone(phone));
            throw new AppException(400, "OTP_EXPIRED");
        }

        String storedHash = parseHash(raw);
        int attempts = parseAttempts(raw);
        if (attempts >= 3) {
            log.warn("OTP_FAILED phone={} reason=OTP_MAX_ATTEMPTS attempts={}", LogMaskUtil.maskPhone(phone), attempts);
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
            log.warn(
                    "OTP_FAILED phone={} reason=OTP_INVALID attempts={}",
                    LogMaskUtil.maskPhone(phone),
                    attempts + 1
            );
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
            log.info("OTP_VERIFIED phone={} role=AGENT source=MSG91", LogMaskUtil.maskPhone(phone));
            return new AuthResponse(token, "AGENT", a.getId(), a.getName());
        }

        Optional<Seller> seller = sellerRepository.findByPhone(phone);
        if (seller.isPresent()) {
            Seller s = seller.get();
            String name = s.getName() == null ? "" : s.getName();
            String token = jwtService.generateToken(s.getId(), "SELLER");
            log.info("OTP_VERIFIED phone={} role=SELLER source=MSG91", LogMaskUtil.maskPhone(phone));
            return new AuthResponse(token, "SELLER", s.getId(), name);
        }

        log.warn("OTP_FAILED phone={} reason=USER_NOT_FOUND attempts=n/a", LogMaskUtil.maskPhone(phone));
        throw new AppException(404, "USER_NOT_FOUND");
    }

    public AuthResponse verifyFirebaseIdToken(String idToken) {
        if (!StringUtils.hasText(idToken)) {
            throw new AppException(400, "INVALID_TOKEN");
        }
        if (firebaseApp == null) {
            throw new AppException(503, "FIREBASE_NOT_CONFIGURED");
        }
        final FirebaseToken decoded;
        try {
            decoded = FirebaseAuth.getInstance(firebaseApp).verifyIdToken(idToken.trim());
        } catch (Exception e) {
            log.warn("Firebase token verify failed: {}", e.getMessage());
            throw new AppException(401, "INVALID_TOKEN");
        }

        Object phoneClaim = decoded.getClaims().get("phone_number");
        String phone = phoneClaim instanceof String s ? s : null;
        if (!StringUtils.hasText(phone)) {
            throw new AppException(400, "PHONE_NOT_VERIFIED");
        }

        Optional<Agent> agent = agentRepository.findByPhone(phone);
        if (agent.isPresent()) {
            Agent a = agent.get();
            String token = jwtService.generateToken(a.getId(), "AGENT", java.util.Map.of());
            log.info("OTP_VERIFIED phone={} role=AGENT source=FIREBASE", LogMaskUtil.maskPhone(phone));
            return new AuthResponse(token, "AGENT", a.getId(), a.getName());
        }

        Optional<Seller> seller = sellerRepository.findByPhone(phone);
        if (seller.isPresent()) {
            Seller s = seller.get();
            String name = s.getName() == null ? "" : s.getName();
            String token = jwtService.generateToken(s.getId(), "SELLER");
            log.info("OTP_VERIFIED phone={} role=SELLER source=FIREBASE", LogMaskUtil.maskPhone(phone));
            return new AuthResponse(token, "SELLER", s.getId(), name);
        }

        log.warn("OTP_FAILED phone={} reason=USER_NOT_FOUND source=FIREBASE", LogMaskUtil.maskPhone(phone));
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

    @Transactional
    public AuthResponse registerSeller(CreateSellerRequest req) {
        if (sellerRepository.existsByPhone(req.phone()) || agentRepository.existsByPhone(req.phone())) {
            throw new AppException(409, "PHONE_IN_USE");
        }
        boolean asAgent = Boolean.TRUE.equals(req.isAgent());
        if (asAgent) {
            Agent agent = Agent.builder()
                    .name(req.name().trim())
                    .phone(req.phone())
                    .whatsappNumber(req.phone())
                    .passwordHash(passwordEncoder.encode(req.password()))
                    .active(true)
                    .build();
            agent = agentRepository.save(agent);
            String token = jwtService.generateToken(agent.getId(), "AGENT", java.util.Map.of());
            log.info(
                    "AGENT_SELF_REGISTERED id={} phone={}",
                    agent.getId(),
                    LogMaskUtil.maskPhone(req.phone())
            );
            return new AuthResponse(token, "AGENT", agent.getId(), agent.getName());
        }
        Agent preferred = null;
        if (req.preferredAgentId() != null) {
            preferred = agentRepository.findById(req.preferredAgentId())
                    .orElseThrow(() -> new AppException(400, "INVALID_AGENT"));
            if (!Boolean.TRUE.equals(preferred.getActive())) {
                throw new AppException(400, "AGENT_INACTIVE");
            }
        }
        Seller seller = Seller.builder()
                .name(req.name().trim())
                .phone(req.phone())
                .passwordHash(passwordEncoder.encode(req.password()))
                .preferredAgent(preferred)
                .build();
        seller = sellerRepository.save(seller);
        String name = seller.getName() == null ? "" : seller.getName();
        String token = jwtService.generateToken(seller.getId(), "SELLER");
        log.info(
                "SELLER_SELF_REGISTERED id={} phone={}",
                seller.getId(),
                LogMaskUtil.maskPhone(req.phone())
        );
        return new AuthResponse(token, "SELLER", seller.getId(), name);
    }

    public AuthResponse passwordLogin(String phone, String password, String role) {
        if (!StringUtils.hasText(phone) || !StringUtils.hasText(password) || !StringUtils.hasText(role)) {
            throw new AppException(400, "INVALID_REQUEST");
        }
        String r = role.trim().toUpperCase();
        if ("AGENT".equals(r)) {
            Agent a = agentRepository.findByPhone(phone)
                    .orElseThrow(() -> new AppException(401, "INVALID_CREDENTIALS"));
            if (!StringUtils.hasText(a.getPasswordHash())) {
                throw new AppException(403, "PASSWORD_LOGIN_DISABLED");
            }
            if (!passwordEncoder.matches(password, a.getPasswordHash())) {
                throw new AppException(401, "INVALID_CREDENTIALS");
            }
            String token = jwtService.generateToken(a.getId(), "AGENT", java.util.Map.of());
            return new AuthResponse(token, "AGENT", a.getId(), a.getName());
        }
        if ("SELLER".equals(r)) {
            Seller s = sellerRepository.findByPhone(phone)
                    .orElseThrow(() -> new AppException(401, "INVALID_CREDENTIALS"));
            if (!StringUtils.hasText(s.getPasswordHash())) {
                throw new AppException(403, "PASSWORD_LOGIN_DISABLED");
            }
            if (!passwordEncoder.matches(password, s.getPasswordHash())) {
                throw new AppException(401, "INVALID_CREDENTIALS");
            }
            String name = s.getName() == null ? "" : s.getName();
            String token = jwtService.generateToken(s.getId(), "SELLER");
            return new AuthResponse(token, "SELLER", s.getId(), name);
        }
        throw new AppException(400, "INVALID_ROLE");
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
