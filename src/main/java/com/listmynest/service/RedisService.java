package com.listmynest.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisService {

    private final RedisTemplate<String, String> redisTemplate;

    public void set(String key, String value, long ttlSeconds) {
        redisTemplate.opsForValue().set(key, value, Duration.ofSeconds(ttlSeconds));
    }

    public String get(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    public void delete(String key) {
        Boolean deleted = redisTemplate.delete(key);
        log.trace("Redis delete key={} deleted={}", key, deleted);
    }

    public boolean exists(String key) {
        Boolean b = redisTemplate.hasKey(key);
        return Boolean.TRUE.equals(b);
    }

    public Long increment(String key) {
        Long v = redisTemplate.opsForValue().increment(key);
        return v == null ? 0L : v;
    }

    public void expire(String key, long ttlSeconds) {
        redisTemplate.expire(key, ttlSeconds, TimeUnit.SECONDS);
    }

    /**
     * Remaining TTL in seconds. {@code null} if key missing ({@code -2}).
     * If key has no TTL ({@code -1}), returns a sensible default for OTP keys (300s).
     */
    public Long getExpireSeconds(String key) {
        Long t = redisTemplate.getExpire(key, TimeUnit.SECONDS);
        if (t == null || t == -2L) {
            return null;
        }
        if (t == -1L) {
            return 300L;
        }
        return t;
    }

    /**
     * Phase 1: {@link org.springframework.data.redis.core.RedisTemplate#keys(Object)} — avoid in production at scale.
     */
    public Set<String> scanKeys(String pattern) {
        try {
            Set<String> keys = redisTemplate.keys(pattern);
            return keys != null ? keys : Collections.emptySet();
        } catch (Exception e) {
            log.error("Redis scan failed for pattern {}: {}", pattern, e.getMessage());
            return Collections.emptySet();
        }
    }
}
