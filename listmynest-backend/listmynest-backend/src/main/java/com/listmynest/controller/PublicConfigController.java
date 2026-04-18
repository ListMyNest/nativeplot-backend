package com.listmynest.controller;

import com.listmynest.dto.PublicSiteConfigDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public configuration for the Next.js site (Call / WhatsApp on homepage).
 * Uses the same number as property-detail fallback when no seller/agent phone.
 */
@RestController
@RequestMapping("/v1/config")
public class PublicConfigController {

    @Value("${app.fallback-buyer-contact-phone:}")
    private String fallbackBuyerContactPhone;

    @GetMapping("/site")
    public PublicSiteConfigDto site() {
        String p = fallbackBuyerContactPhone == null ? "" : fallbackBuyerContactPhone.trim();
        if (p.isEmpty()) {
            return new PublicSiteConfigDto(null);
        }
        return new PublicSiteConfigDto(p);
    }
}
