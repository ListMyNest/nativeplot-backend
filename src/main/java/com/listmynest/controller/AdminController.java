package com.listmynest.controller;

import com.listmynest.dto.AdminAgentDTO;
import com.listmynest.dto.AdminBuyerDTO;
import com.listmynest.dto.AdminLoginRequest;
import com.listmynest.dto.AdminRegisterRequest;
import com.listmynest.dto.AdminPropertyDTO;
import com.listmynest.dto.AdminSellerDTO;
import com.listmynest.dto.AuditLogDTO;
import com.listmynest.dto.AuthResponse;
import com.listmynest.dto.CreateAgentRequest;
import com.listmynest.dto.CreateSellerRequest;
import com.listmynest.dto.PageResponse;
import com.listmynest.dto.UpdateAgentRequest;
import com.listmynest.dto.UpdatePropertyStatusRequest;
import com.listmynest.exception.AppException;
import com.listmynest.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final AdminService adminService;

    @PostMapping("/auth/login")
    public AuthResponse login(@Valid @RequestBody AdminLoginRequest request) {
        return adminService.adminLogin(request);
    }

    @PostMapping("/auth/register")
    public AuthResponse register(@Valid @RequestBody AdminRegisterRequest request) {
        return adminService.registerAdmin(request);
    }

    @GetMapping("/properties")
    public PageResponse<AdminPropertyDTO> properties(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) UUID agentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return adminService.getAllProperties(status, city, agentId, page, size);
    }

    @PatchMapping("/properties/{id}/status")
    public AdminPropertyDTO patchPropertyStatus(
            @PathVariable("id") UUID propertyId,
            @Valid @RequestBody UpdatePropertyStatusRequest body
    ) {
        return adminService.forceSetPropertyStatus(propertyId, body.status(), currentAdminId());
    }

    @GetMapping("/agents")
    public PageResponse<AdminAgentDTO> agents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return adminService.getAllAgents(page, size);
    }

    @PostMapping("/agents")
    public AdminAgentDTO createAgent(@Valid @RequestBody CreateAgentRequest body) {
        return adminService.createAgent(body, currentAdminId());
    }

    @PatchMapping("/agents/{id}")
    public AdminAgentDTO updateAgent(
            @PathVariable("id") UUID agentId,
            @Valid @RequestBody UpdateAgentRequest body
    ) {
        return adminService.updateAgent(agentId, body, currentAdminId());
    }

    @GetMapping("/sellers")
    public PageResponse<AdminSellerDTO> sellers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return adminService.getAllSellers(page, size);
    }

    @PostMapping("/sellers")
    public AdminSellerDTO createSeller(@Valid @RequestBody CreateSellerRequest body) {
        return adminService.createSeller(body, currentAdminId());
    }

    @GetMapping("/buyers")
    public PageResponse<AdminBuyerDTO> buyers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return adminService.getAllBuyers(page, size);
    }

    @GetMapping("/audit-log")
    public PageResponse<AuditLogDTO> auditLog(
            @RequestParam(required = false) UUID adminId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return adminService.getAuditLog(adminId, entityType, dateFrom, page, size);
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
