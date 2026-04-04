package com.listmynest.service;

import com.listmynest.exception.AppException;
import com.listmynest.model.Property;
import com.listmynest.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppService {

    private final RestTemplate restTemplate;
    private final PropertyRepository propertyRepository;
    private final LeadService leadService;

    @Value("${wati.api-token:}")
    private String watiApiToken;

    @Value("${wati.base-url:https://live-server.wati.io}")
    private String watiBaseUrl;

    public void sendPostVisitTemplate(String buyerPhone, String propertyTitle, String city) {
        if (!StringUtils.hasText(buyerPhone)) {
            return;
        }
        if (!StringUtils.hasText(watiApiToken)) {
            log.warn("DEV MODE: Would send post-visit WA to {} for property {}", buyerPhone, propertyTitle);
            return;
        }

        try {
            String base = watiBaseUrl.endsWith("/") ? watiBaseUrl.substring(0, watiBaseUrl.length() - 1) : watiBaseUrl;
            String url = base + "/api/v1/sendTemplateMessage";

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(watiApiToken.trim());
            headers.setContentType(MediaType.APPLICATION_JSON);

            String waDigits = buyerPhone.replace("+", "").replaceAll("\\D", "");
            String broadcast = "post_visit_" + Instant.now().getEpochSecond();

            Map<String, Object> body = new HashMap<>();
            body.put("whatsappNumber", waDigits);
            body.put("template_name", "post_visit_feedback");
            body.put("broadcast_name", broadcast);
            body.put("parameters", java.util.List.of(
                    Map.of("name", "property_name", "value", propertyTitle == null ? "" : propertyTitle),
                    Map.of("name", "city", "value", city == null ? "" : city)
            ));

            restTemplate.postForEntity(url, new HttpEntity<>(body, headers), String.class);
        } catch (Exception e) {
            log.error("Wati post-visit template failed for {}: {}", buyerPhone, e.getMessage());
        }
    }

    public Map<String, String> getWhatsAppLink(UUID propertyId, String sessionHash) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new AppException(404, "PROPERTY_NOT_FOUND"));
        if (property.getAgent() == null || !StringUtils.hasText(property.getAgent().getWhatsappNumber())) {
            throw new AppException(404, "AGENT_WHATSAPP_NOT_AVAILABLE");
        }

        String city = property.getCity() == null ? "" : property.getCity();
        leadService.logLead(propertyId, "WHATSAPP", sessionHash, city, null);

        String agentWa = property.getAgent().getWhatsappNumber().replaceAll("\\D", "");
        String message = "Hi! I saw property " + propertyId + " in " + city + " on ListMyNest. Is it still available?";
        String encoded = URLEncoder.encode(message, StandardCharsets.UTF_8);
        String waUrl = "https://wa.me/" + agentWa + "?text=" + encoded;
        return Map.of("wa_url", waUrl);
    }
}
