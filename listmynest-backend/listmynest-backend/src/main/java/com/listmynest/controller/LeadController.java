package com.listmynest.controller;

import com.listmynest.dto.ApiResponse;
import com.listmynest.dto.LeadDTO;
import com.listmynest.dto.LogLeadRequest;
import com.listmynest.dto.PageResponse;
import com.listmynest.dto.SellerLeadSummaryDTO;
import com.listmynest.dto.WatiWebhookPayload;
import com.listmynest.exception.AppException;
import com.listmynest.model.Lead;
import com.listmynest.service.LeadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/v1/leads")
@RequiredArgsConstructor
@Slf4j
public class LeadController {

    private static final String WATI_SECRET_HEADER = "X-Wati-Secret";

    private final LeadService leadService;

    @Value("${wati.webhook-secret:}")
    private String watiWebhookSecret;

    @PostMapping
    public ApiResponse logLead(@Valid @RequestBody LogLeadRequest request) {
        Lead lead = leadService.logLead(
                request.propertyId(),
                request.actionType(),
                request.sessionHash(),
                request.city(),
                request.buyerPhone()
        );
        if (lead == null) {
            log.debug("Duplicate lead skipped for property {}", request.propertyId());
        }
        return new ApiResponse(true, "Lead logged");
    }

    @PostMapping("/whatsapp-inbound")
    public ResponseEntity<Void> watiInbound(
            @RequestHeader(value = WATI_SECRET_HEADER, required = false) String secret,
            @RequestBody WatiWebhookPayload payload
    ) {
        if (!StringUtils.hasText(watiWebhookSecret)
                || secret == null
                || !secret.equals(watiWebhookSecret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        leadService.handleWatiWebhook(payload);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public PageResponse<LeadDTO> listForAgent(
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        UUID agentId = currentUserId();
        return leadService.getLeadsForAgent(agentId, actionType, dateFrom, page, size);
    }

    @GetMapping("/seller")
    public SellerLeadSummaryDTO sellerSummary() {
        UUID sellerId = currentUserId();
        return leadService.getLeadSummaryForSeller(sellerId);
    }

    private static UUID currentUserId() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof String s) || s.isBlank()) {
            throw new AppException(401, "UNAUTHORIZED");
        }
        try {
            return UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            throw new AppException(401, "UNAUTHORIZED");
        }
    }
}
