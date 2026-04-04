package com.listmynest.controller;

import com.listmynest.dto.RescheduleVisitRequest;
import com.listmynest.dto.ScheduleVisitRequest;
import com.listmynest.dto.UpdateVisitStatusRequest;
import com.listmynest.dto.VisitDTO;
import com.listmynest.exception.AppException;
import com.listmynest.service.VisitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/visits")
@RequiredArgsConstructor
@Slf4j
public class VisitController {

    private final VisitService visitService;

    @PostMapping
    public ResponseEntity<VisitDTO> schedule(@Valid @RequestBody ScheduleVisitRequest request) {
        VisitDTO dto = visitService.scheduleVisit(
                request.propertyId(),
                request.visitDate(),
                request.visitTime(),
                request.buyerPhone()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping
    public List<VisitDTO> list(
            @RequestParam(required = false) LocalDate date,
            @RequestParam(required = false) String status
    ) {
        return visitService.getVisitsForAgent(currentUserId(), date, status);
    }

    @PatchMapping("/{id}/status")
    public VisitDTO updateStatus(
            @PathVariable("id") UUID visitId,
            @Valid @RequestBody UpdateVisitStatusRequest body
    ) {
        return visitService.updateVisitStatus(visitId, body.status(), body.notes(), currentUserId());
    }

    @PatchMapping("/{id}/reschedule")
    public VisitDTO reschedule(
            @PathVariable("id") UUID visitId,
            @Valid @RequestBody RescheduleVisitRequest body
    ) {
        return visitService.rescheduleVisit(visitId, body.visitDate(), body.visitTime(), currentUserId());
    }

    private static UUID currentUserId() {
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
