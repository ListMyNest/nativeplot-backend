package com.listmynest.controller;

import com.listmynest.dto.ImpersonationResponse;
import com.listmynest.exception.AppException;
import com.listmynest.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/v1/admin/impersonate")
@RequiredArgsConstructor
@Slf4j
public class AdminImpersonationController {

    private final AdminService adminService;

    @PostMapping("/seller/{sellerId}")
    public ImpersonationResponse impersonateSeller(@PathVariable UUID sellerId) {
        return adminService.issueImpersonationToken(currentAdminId(), sellerId);
    }

    private static UUID currentAdminId() {
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
