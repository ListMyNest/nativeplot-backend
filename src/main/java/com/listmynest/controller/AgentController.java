package com.listmynest.controller;

import com.listmynest.dto.AgentDashboardDTO;
import com.listmynest.dto.AgentFcmTokenRequest;
import com.listmynest.dto.AgentMeDTO;
import com.listmynest.dto.AgentStatusRequest;
import com.listmynest.exception.AppException;
import com.listmynest.service.AgentAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/v1/agents")
@RequiredArgsConstructor
@Slf4j
public class AgentController {

    private final AgentAccountService agentAccountService;

    @GetMapping("/me")
    public AgentMeDTO me() {
        return agentAccountService.getMe(currentAgentId());
    }

    @GetMapping("/me/dashboard")
    public AgentDashboardDTO dashboard() {
        return agentAccountService.getDashboard(currentAgentId());
    }

    @PatchMapping("/me/status")
    public void status(@Valid @RequestBody AgentStatusRequest body) {
        agentAccountService.updateStatus(currentAgentId(), body);
    }

    @PatchMapping("/me/fcm-token")
    public void fcmToken(@Valid @RequestBody AgentFcmTokenRequest body) {
        agentAccountService.updateFcmToken(currentAgentId(), body);
    }

    private static UUID currentAgentId() {
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
