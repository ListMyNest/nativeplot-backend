package com.listmynest.service;

import com.listmynest.dto.VisitDTO;
import com.listmynest.exception.AppException;
import com.listmynest.model.Property;
import com.listmynest.model.PropertyStatus;
import com.listmynest.model.Visit;
import com.listmynest.model.VisitStatus;
import com.listmynest.dto.PageResponse;
import com.listmynest.repository.PropertyRepository;
import com.listmynest.util.LogMaskUtil;
import com.listmynest.repository.VisitRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class VisitService {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter ISO_INSTANT = DateTimeFormatter.ISO_INSTANT;

    private final VisitRepository visitRepository;
    private final PropertyRepository propertyRepository;
    private final LeadService leadService;
    private final WhatsAppService whatsAppService;
    private final NotificationService notificationService;
    private final Environment environment;

    @Transactional
    public VisitDTO scheduleVisit(UUID propertyId, LocalDate visitDate, LocalTime visitTime, String buyerPhone) {
        if (!StringUtils.hasText(buyerPhone)) {
            throw new AppException(400, "BUYER_PHONE_REQUIRED");
        }

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new AppException(404, "PROPERTY_NOT_FOUND"));
        if (!isSchedulable(property)) {
            throw new AppException(400, "PROPERTY_NOT_ACTIVE");
        }

        LocalDate today = LocalDate.now(IST);
        if (visitDate.isBefore(today)) {
            throw new AppException(400, "VISIT_DATE_PAST");
        }
        if (visitDate.isAfter(today.plusDays(7))) {
            throw new AppException(400, "VISIT_DATE_TOO_FAR");
        }

        Visit visit = Visit.builder()
                .property(property)
                .agent(property.getAgent())
                .buyerPhone(buyerPhone.trim())
                .visitDate(visitDate)
                .visitTime(visitTime)
                .status(VisitStatus.SCHEDULED)
                .postVisitWaSent(false)
                .build();
        visit = visitRepository.save(visit);

        log.info(
                "VISIT_SCHEDULED id={} property={} date={} time={} agent={}",
                visit.getId(),
                propertyId,
                visitDate,
                visitTime,
                property.getAgent() != null ? property.getAgent().getId() : "none"
        );

        try {
            String visitSession = buyerPhone + "|" + propertyId;
            leadService.logLead(propertyId, "VISIT_REQUEST", visitSession, property.getCity(), buyerPhone);
        } catch (Exception e) {
            log.warn("Visit lead log skipped: {}", e.getMessage());
        }

        try {
            notificationService.sendVisitNotification(property.getAgent(), visit, property);
        } catch (Exception e) {
            log.warn("Visit FCM notification skipped: {}", e.getMessage());
        }

        property.setLastActivityAt(Instant.now());
        propertyRepository.save(property);

        return toDto(visit);
    }

    private boolean isSchedulable(Property property) {
        if (property.getStatus() == PropertyStatus.ACTIVE) {
            return true;
        }
        // In local/dev we allow scheduling even before agent verification so the flow can be tested end-to-end.
        boolean local = Arrays.asList(environment.getActiveProfiles()).contains("local");
        if (!local) {
            return false;
        }
        return property.getStatus() == PropertyStatus.NEW
                || property.getStatus() == PropertyStatus.PENDING_REVIEW
                || property.getStatus() == PropertyStatus.ACTIVE;
    }

    @Transactional(readOnly = true)
    public List<VisitDTO> listVisitsForSeller(UUID sellerId) {
        return visitRepository.findByPropertySellerIdOrderByVisitDateAscVisitTimeAsc(sellerId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<VisitDTO> listVisitsForAdmin(int page, int size) {
        int p = Math.max(0, page);
        int s = Math.min(100, Math.max(1, size));
        Page<Visit> result = visitRepository.findAllByOrderByCreatedAtDesc(
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<VisitDTO> content = result.getContent().stream().map(this::toDto).toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(), result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<VisitDTO> getVisitsForAgent(UUID agentId, LocalDate date, String status) {
        Specification<Visit> spec = (root, query, cb) -> {
            List<Predicate> parts = new ArrayList<>();
            parts.add(cb.equal(root.get("agent").get("id"), agentId));
            if (date != null) {
                parts.add(cb.equal(root.get("visitDate"), date));
            }
            if (StringUtils.hasText(status)) {
                try {
                    VisitStatus st = VisitStatus.valueOf(status.trim().toUpperCase());
                    parts.add(cb.equal(root.get("status"), st));
                } catch (IllegalArgumentException e) {
                    throw new AppException(400, "INVALID_STATUS");
                }
            }
            return cb.and(parts.toArray(Predicate[]::new));
        };
        return visitRepository.findAll(spec).stream()
                .sorted((a, b) -> {
                    int d = a.getVisitDate().compareTo(b.getVisitDate());
                    if (d != 0) {
                        return d;
                    }
                    return a.getVisitTime().compareTo(b.getVisitTime());
                })
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public VisitDTO updateVisitStatus(UUID visitId, String newStatus, String notes, UUID agentId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new AppException(404, "VISIT_NOT_FOUND"));
        if (visit.getAgent() == null || !visit.getAgent().getId().equals(agentId)) {
            throw new AppException(403, "FORBIDDEN");
        }

        VisitStatus status;
        try {
            status = VisitStatus.valueOf(newStatus.trim().toUpperCase());
        } catch (Exception e) {
            throw new AppException(400, "INVALID_STATUS");
        }

        visit.setStatus(status);
        visit.setNotes(notes);

        if (status == VisitStatus.VISITED && !Boolean.TRUE.equals(visit.getPostVisitWaSent())) {
            whatsAppService.sendPostVisitTemplate(
                    visit.getBuyerPhone(),
                    visit.getProperty().getTitle(),
                    visit.getProperty().getCity()
            );
            visit.setPostVisitWaSent(true);
            log.info(
                    "POST_VISIT_WA_SENT visitId={} buyerPhone={}",
                    visit.getId(),
                    LogMaskUtil.maskPhone(visit.getBuyerPhone())
            );
        }

        visit = visitRepository.save(visit);
        Property property = visit.getProperty();
        property.setLastActivityAt(Instant.now());
        propertyRepository.save(property);

        log.info(
                "VISIT_STATUS_UPDATED id={} status={} agent={}",
                visit.getId(),
                status.name(),
                agentId
        );

        return toDto(visit);
    }

    @Transactional
    public VisitDTO rescheduleVisit(UUID visitId, LocalDate newDate, LocalTime newTime, UUID agentId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new AppException(404, "VISIT_NOT_FOUND"));
        if (visit.getAgent() == null || !visit.getAgent().getId().equals(agentId)) {
            throw new AppException(403, "FORBIDDEN");
        }

        LocalDate today = LocalDate.now(IST);
        if (newDate.isBefore(today)) {
            throw new AppException(400, "VISIT_DATE_PAST");
        }
        if (newDate.isAfter(today.plusDays(7))) {
            throw new AppException(400, "VISIT_DATE_TOO_FAR");
        }

        visit.setVisitDate(newDate);
        visit.setVisitTime(newTime);
        visit.setStatus(VisitStatus.RESCHEDULED);
        visit = visitRepository.save(visit);
        return toDto(visit);
    }

    private VisitDTO toDto(Visit v) {
        Instant created = v.getCreatedAt() != null ? v.getCreatedAt() : Instant.now();
        return new VisitDTO(
                v.getId(),
                v.getProperty().getId(),
                v.getProperty().getTitle(),
                v.getBuyerPhone(),
                v.getVisitDate(),
                v.getVisitTime(),
                v.getStatus().name(),
                v.getPostVisitWaSent(),
                v.getNotes(),
                ISO_INSTANT.format(created.truncatedTo(ChronoUnit.SECONDS))
        );
    }
}
