package com.listmynest.controller;

import com.listmynest.dto.PublicAgentDTO;
import com.listmynest.model.Agent;
import com.listmynest.repository.AgentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/v1/public")
@RequiredArgsConstructor
public class PublicAgentController {

    private final AgentRepository agentRepository;

    @GetMapping("/agents")
    public List<PublicAgentDTO> listAgents() {
        return agentRepository.findAll().stream()
                .filter(a -> Boolean.TRUE.equals(a.getActive()))
                .sorted(Comparator.comparing(a -> a.getName() == null ? "" : a.getName()))
                .map(this::toDto)
                .toList();
    }

    private PublicAgentDTO toDto(Agent a) {
        return new PublicAgentDTO(a.getId(), a.getName() == null ? "" : a.getName());
    }
}

