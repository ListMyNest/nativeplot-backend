package com.listmynest.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Wati inbound webhook body. {@code whatsappNumber} is the business (agent inbox) line Wati sends,
 * used to resolve which agent should receive the captured buyer reply.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WatiWebhookPayload(
        String waId,
        String text,
        String timestamp,
        String conversationId,
        @JsonProperty("whatsappNumber") String businessWhatsappNumber
) {}
