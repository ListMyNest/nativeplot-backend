package com.listmynest.controller;

import com.listmynest.dto.CreatePropertyRequest;
import com.listmynest.dto.CreatePropertyResponse;
import com.listmynest.exception.AppException;
import com.listmynest.service.SellerPropertyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/v1/properties")
@RequiredArgsConstructor
public class SellerPropertyController {

    private final SellerPropertyService sellerPropertyService;

    @PostMapping
    public CreatePropertyResponse create(@Valid @RequestBody CreatePropertyRequest body) {
        UUID id = sellerPropertyService.create(body, currentSellerId());
        return new CreatePropertyResponse(id);
    }

    private static UUID currentSellerId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new AppException(401, "UNAUTHORIZED");
        }
        Object p = auth.getPrincipal();
        if (!(p instanceof String s) || s.isBlank()) {
            throw new AppException(401, "UNAUTHORIZED");
        }
        try {
            return UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            throw new AppException(401, "UNAUTHORIZED");
        }
    }
}

