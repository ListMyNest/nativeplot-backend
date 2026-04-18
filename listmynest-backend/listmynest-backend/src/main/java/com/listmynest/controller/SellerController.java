package com.listmynest.controller;

import com.listmynest.dto.AdminSellerDTO;
import com.listmynest.dto.PublicPropertyDTO;
import com.listmynest.dto.SellerDashboardDTO;
import com.listmynest.dto.VisitDTO;
import com.listmynest.exception.AppException;
import com.listmynest.service.SellerAccountService;
import com.listmynest.service.VisitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/sellers")
@RequiredArgsConstructor
@Slf4j
public class SellerController {

    private final SellerAccountService sellerAccountService;
    private final VisitService visitService;

    @GetMapping("/me")
    public AdminSellerDTO me() {
        return sellerAccountService.getMe(currentSellerId());
    }

    @GetMapping("/me/dashboard")
    public SellerDashboardDTO dashboard() {
        return sellerAccountService.getDashboard(currentSellerId());
    }

    @GetMapping("/me/listings")
    public List<PublicPropertyDTO> listings() {
        return sellerAccountService.getMyListings(currentSellerId());
    }

    @GetMapping("/me/visits")
    public List<VisitDTO> myVisits() {
        return visitService.listVisitsForSeller(currentSellerId());
    }

    private static UUID currentSellerId() {
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
