package com.listmynest.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
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

    public Optional<LatLng> geocode(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Optional.empty();
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
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray() || root.isEmpty()) {
                return Optional.empty();
            }
            JsonNode first = root.get(0);
            if (first == null) return Optional.empty();
            String lat = first.path("lat").asText("");
            String lon = first.path("lon").asText("");
            if (lat.isBlank() || lon.isBlank()) {
                return Optional.empty();
            }
            try {
                return Optional.of(new LatLng(new BigDecimal(lat), new BigDecimal(lon)));
            } catch (NumberFormatException e) {
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

    public record LatLng(BigDecimal lat, BigDecimal lng) {}
}

