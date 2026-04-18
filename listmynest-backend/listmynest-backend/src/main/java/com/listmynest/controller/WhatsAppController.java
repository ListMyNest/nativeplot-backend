package com.listmynest.controller;

import com.listmynest.service.WhatsAppService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/whatsapp")
@RequiredArgsConstructor
@Slf4j
public class WhatsAppController {

    private final WhatsAppService whatsAppService;

    @GetMapping("/link/{propertyId}")
    public Map<String, String> link(
            @PathVariable UUID propertyId,
            @RequestParam String sessionHash
    ) {
        return whatsAppService.getWhatsAppLink(propertyId, sessionHash);
    }
}
