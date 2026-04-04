package com.listmynest.controller;

import com.listmynest.dto.PageResponse;
import com.listmynest.dto.PublicPropertyDTO;
import com.listmynest.service.PropertyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;

    @GetMapping("/properties/featured")
    public PageResponse<PublicPropertyDTO> getFeatured(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return propertyService.listFeaturedProperties(page, size);
    }

    @GetMapping("/properties")
    public PageResponse<PublicPropertyDTO> getProperties(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String type,
            @RequestParam(name = "price_min", required = false) BigDecimal priceMin,
            @RequestParam(name = "price_max", required = false) BigDecimal priceMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return propertyService.listPublicProperties(city, type, priceMin, priceMax, page, size);
    }

    @GetMapping("/properties/{id}")
    public PublicPropertyDTO getProperty(@PathVariable UUID id) {
        return propertyService.getPublicById(id);
    }
}
