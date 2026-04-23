package com.listmynest.service;

import com.listmynest.exception.AppException;
import com.listmynest.model.Property;
import com.listmynest.repository.PropertyRepository;
import com.listmynest.util.LogMaskUtil;
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
import java.time.LocalDate;
import java.time.LocalTime;
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

    @Value("${wati.template.visit-scheduled:visit_scheduled}")
    private String visitScheduledTemplate;

    @Value("${wati.template.visit-rescheduled:visit_rescheduled}")
    private String visitRescheduledTemplate;

    @Value("${app.fallback-buyer-contact-phone:}")
    private String fallbackBuyerContactPhone;

    private void sendTemplateMessage(String phoneE164, String templateName, Map<String, String> params) {
        if (!StringUtils.hasText(phoneE164) || !StringUtils.hasText(templateName)) {
            return;
        }
        if (!StringUtils.hasText(watiApiToken)) {
            log.warn(
                    "WATI_DEV_MODE_SKIP would have sent template={} to {}",
                    templateName,
                    LogMaskUtil.maskPhone(phoneE164)
            );
            return;
        }
        long t0 = System.nanoTime();
        try {
            String base = watiBaseUrl.endsWith("/") ? watiBaseUrl.substring(0, watiBaseUrl.length() - 1) : watiBaseUrl;
            String url = base + "/api/v1/sendTemplateMessage";

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(watiApiToken.trim());
            headers.setContentType(MediaType.APPLICATION_JSON);

            String waDigits = phoneE164.replace("+", "").replaceAll("\\D", "");
            String broadcast = templateName + "_" + Instant.now().getEpochSecond();

            Map<String, Object> body = new HashMap<>();
            body.put("whatsappNumber", waDigits);
            body.put("template_name", templateName);
            body.put("broadcast_name", broadcast);
            body.put("parameters", params.entrySet().stream()
                    .map(e -> Map.of("name", e.getKey(), "value", e.getValue() == null ? "" : e.getValue()))
                    .toList());

            restTemplate.postForEntity(url, new HttpEntity<>(body, headers), String.class);
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            log.info(
                    "WATI_TEMPLATE_SENT phone={} template={} duration={}ms",
                    LogMaskUtil.maskPhone(phoneE164),
                    templateName,
                    ms
            );
        } catch (Exception e) {
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            log.warn(
                    "WATI_CALL_FAILED phone={} template={} error={} duration={}ms - continuing without WA",
                    LogMaskUtil.maskPhone(phoneE164),
                    templateName,
                    e.getMessage(),
                    ms
            );
        }
    }

    public void sendPostVisitTemplate(String buyerPhone, String propertyTitle, String city) {
        if (!StringUtils.hasText(buyerPhone)) {
            return;
        }
        if (!StringUtils.hasText(watiApiToken)) {
            log.warn(
                    "WATI_DEV_MODE_SKIP would have sent template=post_visit_feedback to {}",
                    LogMaskUtil.maskPhone(buyerPhone)
            );
            return;
        }

        long t0 = System.nanoTime();
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
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            log.info(
                    "WATI_TEMPLATE_SENT phone={} template=post_visit_feedback duration={}ms",
                    LogMaskUtil.maskPhone(buyerPhone),
                    ms
            );
        } catch (Exception e) {
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            log.warn(
                    "WATI_CALL_FAILED phone={} error={} duration={}ms - continuing without WA",
                    LogMaskUtil.maskPhone(buyerPhone),
                    e.getMessage(),
                    ms
            );
        }
    }

    public void sendVisitScheduledTemplate(String buyerPhone, String propertyTitle, String city, LocalDate date, LocalTime time) {
        sendTemplateMessage(
                buyerPhone,
                visitScheduledTemplate,
                Map.of(
                        "property_name", propertyTitle == null ? "" : propertyTitle,
                        "city", city == null ? "" : city,
                        "visit_date", date == null ? "" : date.toString(),
                        "visit_time", time == null ? "" : time.toString()
                )
        );
    }

    public void sendVisitRescheduledTemplate(String buyerPhone, String propertyTitle, String city, LocalDate date, LocalTime time) {
        sendTemplateMessage(
                buyerPhone,
                visitRescheduledTemplate,
                Map.of(
                        "property_name", propertyTitle == null ? "" : propertyTitle,
                        "city", city == null ? "" : city,
                        "visit_date", date == null ? "" : date.toString(),
                        "visit_time", time == null ? "" : time.toString()
                )
        );
    }

    public Map<String, String> getWhatsAppLink(UUID propertyId, String sessionHash) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new AppException(404, "PROPERTY_NOT_FOUND"));

        String city = property.getCity() == null ? "" : property.getCity();
        leadService.logLead(propertyId, "WHATSAPP", sessionHash, city, null);

        String waDigits;
        if (property.getAgent() != null && StringUtils.hasText(property.getAgent().getWhatsappNumber())) {
            waDigits = property.getAgent().getWhatsappNumber().replaceAll("\\D", "");
        } else if (property.getSeller() != null && StringUtils.hasText(property.getSeller().getPhone())) {
            waDigits = property.getSeller().getPhone().replaceAll("\\D", "");
        } else if (StringUtils.hasText(fallbackBuyerContactPhone)) {
            waDigits = fallbackBuyerContactPhone.replaceAll("\\D", "");
        } else {
            throw new AppException(404, "CONTACT_WHATSAPP_NOT_AVAILABLE");
        }

        String message = "Hi! I saw property " + propertyId + " in " + city + " on ListMyNest. Is it still available?";
        String encoded = URLEncoder.encode(message, StandardCharsets.UTF_8);
        String waUrl = "https://wa.me/" + waDigits + "?text=" + encoded;
        return Map.of("wa_url", waUrl);
    }
}
