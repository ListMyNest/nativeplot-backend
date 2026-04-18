package com.listmynest.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class JwtService {

    private final SecretKey key;
    private final int expiryHours;
    private final int adminExpiryHours;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiry-hours}") int expiryHours,
            @Value("${jwt.admin-expiry-hours}") int adminExpiryHours
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiryHours = expiryHours;
        this.adminExpiryHours = adminExpiryHours;
    }

    public String generateToken(UUID userId, String role) {
        return generateToken(userId, role, Map.of());
    }

    /**
     * @param extraClaims merged into JWT (e.g. {@code impersonatedBy} for seller impersonation).
     * @param ttlHoursOverride if non-null, overrides default role-based TTL (hours).
     */
    public String generateToken(UUID userId, String role, Map<String, Object> extraClaims, Integer ttlHoursOverride) {
        Duration ttl;
        if (ttlHoursOverride != null) {
            ttl = Duration.ofHours(ttlHoursOverride);
        } else if ("ADMIN".equalsIgnoreCase(role)) {
            ttl = Duration.ofHours(adminExpiryHours);
        } else {
            ttl = Duration.ofHours(expiryHours);
        }

        Instant now = Instant.now();
        Instant exp = now.plus(ttl);
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role.toUpperCase());
        if (extraClaims != null) {
            claims.putAll(extraClaims);
        }

        return Jwts.builder()
                .subject(userId.toString())
                .claims(claims)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public String generateToken(UUID userId, String role, Map<String, Object> extraClaims) {
        return generateToken(userId, role, extraClaims, null);
    }

    public boolean validateToken(String token) {
        try {
            parse(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    public UUID extractUserId(String token) {
        String sub = parse(token).getPayload().getSubject();
        return UUID.fromString(sub);
    }

    public String extractRole(String token) {
        Object r = parse(token).getPayload().get("role");
        return r == null ? "" : String.valueOf(r);
    }

    public Map<String, Object> extractCustomClaimsForRefresh(String token) {
        Claims payload = parse(token).getPayload();
        Map<String, Object> out = new HashMap<>();
        Object imp = payload.get("impersonatedBy");
        if (imp != null) {
            out.put("impersonatedBy", imp);
        }
        return out;
    }

    private Jws<Claims> parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);
    }
}
