package com.listmynest.service;

import com.listmynest.dto.AgentDashboardDTO;
import com.listmynest.dto.AgentFcmTokenRequest;
import com.listmynest.dto.AgentMeDTO;
import com.listmynest.dto.AgentStatusRequest;
import com.listmynest.exception.AppException;
import com.listmynest.model.LeadActionType;
import com.listmynest.model.VisitStatus;
import com.listmynest.repository.AgentRepository;
import com.listmynest.repository.LeadRepository;
import com.listmynest.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentAccountService {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter ISO_INSTANT = DateTimeFormatter.ISO_INSTANT;

    private static String assignedCitiesToString(List<String> cities) {
        if (cities == null || cities.isEmpty()) {
            return "";
        }
        return String.join(", ", cities);
    }

    private final AgentRepository agentRepository;
    private final LeadRepository leadRepository;
    private final VisitRepository visitRepository;

    @Transactional(readOnly = true)
    public AgentMeDTO getMe(UUID agentId) {
        var agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new AppException(404, "AGENT_NOT_FOUND"));
        LocalDate today = LocalDate.now(IST);
        Instant startOfDay = today.atStartOfDay(IST).toInstant();
        long newLeads = leadRepository.countByAgent_IdAndCreatedAtAfter(agentId, startOfDay);
        long todayVisits = visitRepository.countByAgent_IdAndVisitDate(agentId, today);
        long totalDone = visitRepository.countByAgent_IdAndStatus(agentId, VisitStatus.VISITED);
        long waLeads = leadRepository.countByAgent_IdAndActionType(agentId, LeadActionType.WHATSAPP);
        return new AgentMeDTO(
                agent.getId(),
                agent.getName(),
                agent.getPhone(),
                agent.getWhatsappNumber(),
                assignedCitiesToString(agent.getAssignedCities()),
                agent.getActive(),
                newLeads,
                todayVisits,
                totalDone,
                waLeads,
                ISO_INSTANT.format(agent.getCreatedAt().truncatedTo(ChronoUnit.SECONDS))
        );
    }

    @Transactional(readOnly = true)
    public AgentDashboardDTO getDashboard(UUID agentId) {
        if (!agentRepository.existsById(agentId)) {
            throw new AppException(404, "AGENT_NOT_FOUND");
        }
        LocalDate today = LocalDate.now(IST);
        Instant startOfDay = today.atStartOfDay(IST).toInstant();
        long newLeads = leadRepository.countByAgent_IdAndCreatedAtAfter(agentId, startOfDay);
        long todayVisits = visitRepository.countByAgent_IdAndVisitDate(agentId, today);
        long totalDone = visitRepository.countByAgent_IdAndStatus(agentId, VisitStatus.VISITED);
        long waLeads = leadRepository.countByAgent_IdAndActionType(agentId, LeadActionType.WHATSAPP);
        return new AgentDashboardDTO(newLeads, todayVisits, totalDone, waLeads);
    }

    @Transactional
    public void updateStatus(UUID agentId, AgentStatusRequest req) {
        var agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new AppException(404, "AGENT_NOT_FOUND"));
        if (req.active() != null) {
            agent.setActive(req.active());
        }
        agentRepository.save(agent);
    }

    @Transactional
    public void updateFcmToken(UUID agentId, AgentFcmTokenRequest req) {
        var agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new AppException(404, "AGENT_NOT_FOUND"));
        agent.setFcmToken(req.fcmToken());
        agentRepository.save(agent);
    }
}
