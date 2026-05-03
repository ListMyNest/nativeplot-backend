package com.listmynest.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Fixed-window rate limiting keyed by caller-supplied Redis key (typically includes client IP).
 * If Redis is unavailable, {@link #allow(String, int, int)} returns {@code true} (fail-open).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IpWindowRateLimiter {

    private final RedisService redisService;

    @Value("${listmynest.rate-limit.ip.enabled:true}")
    private boolean enabled;

    /**
     * @param redisKey full Redis key for this window counter
     * @param maxPerWindow reject when count exceeds this value (after increment)
     * @param windowSeconds TTL applied on first increment in the window
     * @return {@code true} if the request should be allowed
     */
    public boolean allow(String redisKey, int maxPerWindow, int windowSeconds) {
        if (!enabled) {
            return true;
        }
        Long c = redisService.increment(redisKey);
        if (c == null) {
            log.trace("Redis unavailable — skipping IP rate limit for key={}", redisKey);
            return true;
        }
        if (c == 1L) {
            redisService.expire(redisKey, windowSeconds);
        }
        if (c > maxPerWindow) {
            log.warn("IP_RATE_LIMIT key={} count={} max={}", redisKey, c, maxPerWindow);
            return false;
        }
        return true;
    }
}
