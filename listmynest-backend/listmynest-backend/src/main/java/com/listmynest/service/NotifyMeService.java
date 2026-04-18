package com.listmynest.service;

import com.listmynest.dto.NotifyMeRequest;
import com.listmynest.exception.AppException;
import com.listmynest.model.Lead;
import com.listmynest.model.LeadActionType;
import com.listmynest.repository.LeadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotifyMeService {

    private final LeadRepository leadRepository;
    private final RedisService redisService;
    private final RestTemplate restTemplate;

    @Value("${wati.api-token:}")
    private String watiApiToken;

    @Value("${wati.base-url:https://live-server.wati.io}")
    private String watiBaseUrl;

    @Transactional
    public void register(NotifyMeRequest request) {
        String phone = normalizePhone(request.phone());
        String key = "notify_me:" + phone;
        if (redisService.exists(key)) {
            throw new AppException(429, "ALREADY_REGISTERED_TODAY");
        }

        Lead lead = Lead.builder()
                .property(null)
                .actionType(LeadActionType.NOTIFY_ME)
                .buyerPhone(phone)
                .city(request.city())
                .sessionHash("notify-me")
                .source("WEB")
                .build();
        leadRepository.save(lead);

        redisService.set(key, request.city(), 86400);

        log.info("Notify Me registered: {} for city {}", phone, request.city());

        if (StringUtils.hasText(watiApiToken)) {
            try {
                addToWatiBroadcastGroup(phone, request.city());
            } catch (Exception e) {
                log.warn("Wati notify-me group call failed (ignored): {}", e.getMessage());
            }
        }
    }

    private void addToWatiBroadcastGroup(String phone, String city) {
        String base = watiBaseUrl.endsWith("/") ? watiBaseUrl.substring(0, watiBaseUrl.length() - 1) : watiBaseUrl;
        String url = base + "/api/v1/addContact/" + phone.replace("+", "");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(watiApiToken.trim());
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("broadcast_name", "notify_" + city.replaceAll("[^a-zA-Z0-9_-]", "_"));

        restTemplate.postForEntity(url, new HttpEntity<>(body, headers), String.class);
    }

    private static String normalizePhone(String phone) {
        if (phone == null) {
            return "";
        }
        String d = phone.replaceAll("\\D", "");
        if (d.length() == 10) {
            return "+91" + d;
        }
        if (d.length() == 12 && d.startsWith("91")) {
            return "+" + d;
        }
        return phone.startsWith("+") ? phone : "+" + d;
    }
}
