package com.listmynest.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Fixed-window rate limiting keyed by caller-supplied Redis key (typically includes client IP).
 * If Redis is unavailable, behaviour depends on {@code listmynest.rate-limit.ip.fail-open-on-redis-miss}
 * (fail-open in dev by default; production config should fail closed).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IpWindowRateLimiter {

    private final RedisService redisService;

    @Value("${listmynest.rate-limit.ip.enabled:true}")
    private boolean enabled;

    /**
     * When {@code true}, Redis increment failures allow the request (legacy dev behaviour).
     * Set {@code false} in production so abusive traffic cannot bypass limits when Redis is down.
     */
    @Value("${listmynest.rate-limit.ip.fail-open-on-redis-miss:true}")
    private boolean failOpenOnRedisMiss;

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
            if (failOpenOnRedisMiss) {
                log.trace("Redis unavailable — skipping IP rate limit for key={}", redisKey);
                return true;
            }
            log.warn("Redis unavailable — blocking request (fail-closed) key={}", redisKey);
            return false;
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
