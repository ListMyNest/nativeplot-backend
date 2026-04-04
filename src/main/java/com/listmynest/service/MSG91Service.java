package com.listmynest.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Centralized SMS via MSG91 sendhttp (Phase 1). Failures are logged; this service does not throw.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MSG91Service {

    private static final String SEND_HTTP_URL = "https://api.msg91.com/api/sendhttp.php";

    private final RestTemplate restTemplate;

    @Value("${msg91.auth-key:}")
    private String authKey;

    @Value("${msg91.sender-id:LSTNEST}")
    private String senderId;

    /**
     * @return {@code true} if SMS was sent or dev-mode log path was used; {@code false} if API call failed
     */
    public boolean sendSms(String phone, String message) {
        if (authKey == null || authKey.isBlank()) {
            log.warn("DEV MODE SMS to {}: {}", phone, message);
            return true;
        }
        try {
            String mobiles = normalizeIndianMobile(phone);
            String uri = UriComponentsBuilder.fromHttpUrl(SEND_HTTP_URL)
                    .queryParam("authkey", authKey.trim())
                    .queryParam("mobiles", mobiles)
                    .queryParam("message", message)
                    .queryParam("sender", senderId)
                    .queryParam("route", "4")
                    .queryParam("country", "91")
                    .encode()
                    .toUriString();
            String body = restTemplate.getForObject(uri, String.class);
            log.info("MSG91 sendhttp response for {}: {}", phone, body == null ? "(null)" : body.trim());
            return true;
        } catch (Exception e) {
            log.error("MSG91 SMS failed for {}: {}", phone, e.getMessage());
            return false;
        }
    }

    private static String normalizeIndianMobile(String phone) {
        if (phone == null) {
            return "";
        }
        String p = phone.startsWith("+") ? phone.substring(1) : phone;
        p = p.replaceAll("\\s", "");
        if (p.startsWith("91") && p.length() == 12) {
            return p;
        }
        if (p.length() == 10 && p.chars().allMatch(Character::isDigit)) {
            return "91" + p;
        }
        return p;
    }
}
