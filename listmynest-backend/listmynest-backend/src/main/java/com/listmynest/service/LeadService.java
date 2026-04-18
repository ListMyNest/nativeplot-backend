package com.listmynest.service;

import com.listmynest.dto.LeadDTO;
import com.listmynest.dto.PageResponse;
import com.listmynest.dto.SellerLeadSummaryDTO;
import com.listmynest.dto.WatiWebhookPayload;
import com.listmynest.exception.AppException;
import com.listmynest.model.Buyer;
import com.listmynest.model.Lead;
import com.listmynest.model.LeadActionType;
import com.listmynest.model.Property;
import com.listmynest.model.WaIntent;
import com.listmynest.repository.AgentRepository;
import com.listmynest.repository.BuyerRepository;
import com.listmynest.repository.LeadRepository;
import com.listmynest.repository.PropertyRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadService {

    private static final DateTimeFormatter ISO_INSTANT = DateTimeFormatter.ISO_INSTANT;

    private final LeadRepository leadRepository;
    private final PropertyRepository propertyRepository;
    private final BuyerRepository buyerRepository;
    private final AgentRepository agentRepository;
    private final RedisService redisService;
    private final NotificationService notificationService;

    @Transactional
    public Lead logLead(UUID propertyId, String actionType, String sessionHash, String city, String buyerPhone) {
        LeadActionType type = parseActionType(actionType);
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new AppException(404, "PROPERTY_NOT_FOUND"));

        Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        if (leadRepository.existsByPropertyIdAndSessionHashAndActionTypeAndCreatedAtAfter(
                propertyId, sessionHash, type, oneHourAgo)) {
            return null;
        }

        enforceRateLimit(type, sessionHash, propertyId);

        Lead lead = Lead.builder()
                .property(property)
                .agent(property.getAgent())
                .actionType(type)
                .buyerPhone(buyerPhone)
                .sessionHash(sessionHash)
                .city(StringUtils.hasText(city) ? city : property.getCity())
                .source("WEB")
                .build();

        Lead saved = leadRepository.save(lead);
        property.setLastActivityAt(Instant.now());
        propertyRepository.save(property);

        try {
            if (property.getAgent() != null && StringUtils.hasText(property.getAgent().getFcmToken())) {
                notificationService.sendLeadNotification(property.getAgent(), saved, property);
            }
        } catch (Exception e) {
            log.warn("Lead FCM notification skipped: {}", e.getMessage());
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public PageResponse<LeadDTO> getLeadsForAgent(UUID agentId, String actionType, LocalDate dateFrom, int page, int size) {
        Specification<Lead> spec = (root, query, cb) -> {
            List<Predicate> parts = new ArrayList<>();
            parts.add(cb.equal(root.get("agent").get("id"), agentId));
            if (StringUtils.hasText(actionType)) {
                try {
                    LeadActionType at = LeadActionType.valueOf(actionType.trim().toUpperCase());
                    parts.add(cb.equal(root.get("actionType"), at));
                } catch (IllegalArgumentException e) {
                    throw new AppException(400, "INVALID_ACTION_TYPE");
                }
            }
            if (dateFrom != null) {
                Instant from = dateFrom.atStartOfDay(ZoneOffset.UTC).toInstant();
                parts.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            return cb.and(parts.toArray(Predicate[]::new));
        };

        Page<Lead> p = leadRepository.findAll(
                spec,
                PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        List<LeadDTO> content = p.getContent().stream().map(this::toDto).toList();
        return new PageResponse<>(content, p.getNumber(), p.getSize(), p.getTotalElements());
    }

    @Transactional(readOnly = true)
    public SellerLeadSummaryDTO getLeadSummaryForSeller(UUID sellerId) {
        long total = leadRepository.countBySellerProperties(sellerId);
        long wa = leadRepository.countBySellerPropertiesAndActionType(sellerId, LeadActionType.WHATSAPP);
        long calls = leadRepository.countBySellerPropertiesAndActionType(sellerId, LeadActionType.CALL);
        long visits = leadRepository.countBySellerPropertiesAndActionType(sellerId, LeadActionType.VISIT_REQUEST);
        return new SellerLeadSummaryDTO((int) total, (int) wa, (int) calls, (int) visits);
    }

    @Transactional
    public void handleWatiWebhook(WatiWebhookPayload payload) {
        if (!StringUtils.hasText(payload.businessWhatsappNumber())) {
            throw new AppException(400, "MISSING_BUSINESS_WHATSAPP");
        }

        String rawBiz = payload.businessWhatsappNumber().trim();
        var agent = agentRepository.findByWhatsappNumber(rawBiz)
                .or(() -> agentRepository.findByWhatsappNumber("+" + normalizeDigits(rawBiz)))
                .or(() -> agentRepository.findByWhatsappNumber(toIndianE164(rawBiz)))
                .orElseThrow(() -> new AppException(404, "AGENT_NOT_FOUND"));

        String buyerPhone = toIndianE164(payload.waId());
        if (!StringUtils.hasText(buyerPhone)) {
            throw new AppException(400, "INVALID_WA_ID");
        }

        Buyer buyer = buyerRepository.findByPhone(buyerPhone)
                .orElseGet(() -> buyerRepository.save(Buyer.builder().phone(buyerPhone).build()));

        Optional<Lead> leadOpt = leadRepository.findUnresolvedWaLeadsByAgent(agent.getId());
        if (leadOpt.isPresent()) {
            Lead lead = leadOpt.get();
            lead.setBuyerPhone(buyerPhone);
            lead.setBuyer(buyer);
            String text = payload.text() == null ? "" : payload.text().trim();
            switch (text) {
                case "1" -> lead.setWaIntent(WaIntent.HOT);
                case "2" -> lead.setWaIntent(WaIntent.WARM);
                case "3" -> lead.setWaIntent(WaIntent.COLD);
                default -> { /* no intent */ }
            }
            leadRepository.save(lead);
        }

        buyerRepository.save(buyer);
    }

    private void enforceRateLimit(LeadActionType type, String sessionHash, UUID propertyId) {
        switch (type) {
            case WHATSAPP -> bumpRateLimit("wa_rl:" + sessionHash + ":" + propertyId, 5, 3600);
            case CALL -> bumpRateLimit("call_rl:" + sessionHash + ":" + propertyId, 5, 3600);
            case VISIT_REQUEST -> bumpRateLimit("visit_rl:" + sessionHash, 3, 86400);
            default -> { }
        }
    }

    private void bumpRateLimit(String key, int maxAllowed, int ttlSeconds) {
        Long c = redisService.increment(key);
        if (c == null) {
            return;
        }
        if (c == 1L) {
            redisService.expire(key, ttlSeconds);
        }
        if (c > maxAllowed) {
            throw new AppException(429, "RATE_LIMIT_EXCEEDED");
        }
    }

    private LeadDTO toDto(Lead lead) {
        UUID propId = lead.getProperty() != null ? lead.getProperty().getId() : null;
        String title = lead.getProperty() != null ? lead.getProperty().getTitle() : null;
        String waIntent = lead.getWaIntent() != null ? lead.getWaIntent().name() : null;
        return new LeadDTO(
                lead.getId(),
                propId,
                title,
                lead.getActionType().name(),
                lead.getBuyerPhone(),
                waIntent,
                lead.getCity(),
                ISO_INSTANT.format(lead.getCreatedAt().truncatedTo(ChronoUnit.SECONDS))
        );
    }

    private static LeadActionType parseActionType(String actionType) {
        try {
            return LeadActionType.valueOf(actionType.trim().toUpperCase());
        } catch (Exception e) {
            throw new AppException(400, "INVALID_ACTION_TYPE");
        }
    }

    private static String normalizeDigits(String s) {
        if (s == null) {
            return "";
        }
        return s.replaceAll("\\D", "");
    }

    private static String toIndianE164(String waId) {
        if (!StringUtils.hasText(waId)) {
            return null;
        }
        String d = normalizeDigits(waId);
        if (d.length() == 12 && d.startsWith("91")) {
            return "+" + d;
        }
        if (d.length() == 10) {
            return "+91" + d;
        }
        if (waId.trim().startsWith("+")) {
            return waId.trim();
        }
        return "+" + d;
    }
}
