package com.listmynest.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Best-effort geocoding for approximate map pins.
 * Uses OpenStreetMap Nominatim (low volume; identify app via User-Agent).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeocodingService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final RedisService redisService;

    @Value("${listmynest.cache.geocode-ttl-seconds:604800}")
    private int geocodeCacheTtlSeconds;

    public Optional<LatLng> geocode(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Optional.empty();
        }
        String normalized = query.trim().toLowerCase();
        if (geocodeCacheTtlSeconds > 0) {
            String cacheKey = "geocode:v1:" + sha256Hex(normalized);
            try {
                String cached = redisService.get(cacheKey);
                if (cached != null && !cached.isBlank()) {
                    if ("__empty__".equals(cached)) {
                        return Optional.empty();
                    }
                    String[] parts = cached.split(",", 2);
                    if (parts.length == 2) {
                        try {
                            return Optional.of(new LatLng(new BigDecimal(parts[0]), new BigDecimal(parts[1])));
                        } catch (NumberFormatException ignored) {
                            // fall through to remote
                        }
                    }
                }
            } catch (Exception e) {
                log.trace("Geocode cache read skipped: {}", e.getMessage());
            }
        }

        URI uri = UriComponentsBuilder
                .fromHttpUrl("https://nominatim.openstreetmap.org/search")
                .queryParam("format", "json")
                .queryParam("limit", "1")
                .queryParam("q", query.trim())
                .build(true)
                .toUri();
        try {
            String body = restTemplate.getForObject(uri, String.class);
            if (body == null || body.isBlank()) {
                cacheEmpty(normalized);
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray() || root.isEmpty()) {
                cacheEmpty(normalized);
                return Optional.empty();
            }
            JsonNode first = root.get(0);
            if (first == null) return Optional.empty();
            String lat = first.path("lat").asText("");
            String lon = first.path("lon").asText("");
            if (lat.isBlank() || lon.isBlank()) {
                cacheEmpty(normalized);
                return Optional.empty();
            }
            try {
                LatLng out = new LatLng(new BigDecimal(lat), new BigDecimal(lon));
                cacheHit(normalized, out);
                return Optional.of(out);
            } catch (NumberFormatException e) {
                cacheEmpty(normalized);
                return Optional.empty();
            }
        } catch (RestClientException e) {
            log.warn("Geocode failed: {}", e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Geocode parse failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private void cacheEmpty(String normalized) {
        if (geocodeCacheTtlSeconds <= 0) {
            return;
        }
        try {
            redisService.set("geocode:v1:" + sha256Hex(normalized), "__empty__", geocodeCacheTtlSeconds);
        } catch (Exception e) {
            log.trace("Geocode cache write skipped: {}", e.getMessage());
        }
    }

    private void cacheHit(String normalized, LatLng out) {
        if (geocodeCacheTtlSeconds <= 0) {
            return;
        }
        try {
            String payload = out.lat().toPlainString() + "," + out.lng().toPlainString();
            redisService.set("geocode:v1:" + sha256Hex(normalized), payload, geocodeCacheTtlSeconds);
        } catch (Exception e) {
            log.trace("Geocode cache write skipped: {}", e.getMessage());
        }
    }

    private static String sha256Hex(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(s.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            return String.valueOf(s.hashCode());
        }
    }

    public record LatLng(BigDecimal lat, BigDecimal lng) {}
}

