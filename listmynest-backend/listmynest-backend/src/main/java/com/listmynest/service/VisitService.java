package com.listmynest.service;

import com.listmynest.dto.VisitDTO;
import com.listmynest.exception.AppException;
import com.listmynest.model.Property;
import com.listmynest.model.PropertyStatus;
import com.listmynest.model.Visit;
import com.listmynest.model.VisitStatus;
import com.listmynest.dto.PageResponse;
import com.listmynest.repository.PropertyRepository;
import com.listmynest.util.CsvEscapeUtil;
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

import java.nio.charset.StandardCharsets;
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

    /** UTF-8 CSV header — snake_case; visit fields use {@code visit_*} prefix. */
    private static final String VISITS_CSV_HEADER =
            "visit_id,property_id,property_title,property_city,buyer_phone,"
                    + "visit_date,visit_time,visit_status,visit_notes,agent_name,agent_phone,created_at\n";

    /** Download filename aligned with the browser fallback in {@code adminDownloadVisitsCsv}. */
    public static String visitsExportFilename(LocalDate dateFrom, LocalDate dateTo) {
        return "listmynest_visits_" + dateFrom + "_to_" + dateTo + ".csv";
    }

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

        try {
            // Buyer gets WhatsApp confirmation (best-effort; no-op in dev without WATI token).
            whatsAppService.sendVisitScheduledTemplate(
                    buyerPhone,
                    property.getTitle(),
                    property.getCity(),
                    visitDate,
                    visitTime
            );
        } catch (Exception e) {
            log.warn("Visit WhatsApp notification skipped: {}", e.getMessage());
        }

        property.setLastActivityAt(Instant.now());
        propertyRepository.save(property);

        return toDto(visit);
    }

    private boolean isSchedulable(Property property) {
        if (property.getStatus() == PropertyStatus.ACTIVE) {
            return true;
        }
        // Local/dev: allow scheduling against non-active fixtures (see VisitServiceScheduleVisitTest).
        if (property.getStatus() == PropertyStatus.PENDING_REVIEW
                && Arrays.asList(environment.getActiveProfiles()).contains("local")) {
            return true;
        }
        return false;
    }

    @Transactional(readOnly = true)
    public List<VisitDTO> listVisitsForSeller(UUID sellerId) {
        return visitRepository.findByPropertySellerIdOrderByVisitDateAscVisitTimeAsc(sellerId).stream()
                // Seller should not see buyer contact details.
                .map(this::toMaskedDto)
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

    /**
     * UTF-8 CSV with BOM for Excel. Rows filtered by {@code visitDate} inclusive.
     */
    @Transactional(readOnly = true)
    public byte[] exportVisitsCsv(LocalDate dateFrom, LocalDate dateTo) {
        if (dateTo.isBefore(dateFrom)) {
            throw new AppException(400, "INVALID_DATE_RANGE");
        }
        long spanDays = ChronoUnit.DAYS.between(dateFrom, dateTo);
        if (spanDays > 366) {
            throw new AppException(400, "DATE_RANGE_TOO_LARGE");
        }
        List<Visit> rows = visitRepository.findAllForExportBetween(dateFrom, dateTo);
        DateTimeFormatter localDate = DateTimeFormatter.ISO_LOCAL_DATE;
        StringBuilder sb = new StringBuilder(512 + Math.max(16, rows.size()) * 160);
        sb.append(VISITS_CSV_HEADER);
        for (Visit v : rows) {
            Property p = v.getProperty();
            String agentName = "";
            String agentPhone = "";
            if (v.getAgent() != null) {
                agentName = v.getAgent().getName() != null ? v.getAgent().getName() : "";
                agentPhone = v.getAgent().getPhone() != null ? v.getAgent().getPhone() : "";
            }
            Instant created = v.getCreatedAt() != null ? v.getCreatedAt() : Instant.now();
            sb.append(csvCell(uuidCell(v.getId())))
                    .append(',')
                    .append(csvCell(p != null ? uuidCell(p.getId()) : ""))
                    .append(',')
                    .append(csvCell(p != null ? p.getTitle() : ""))
                    .append(',')
                    .append(csvCell(p != null ? p.getCity() : ""))
                    .append(',')
                    .append(csvCell(v.getBuyerPhone()))
                    .append(',')
                    .append(csvCell(v.getVisitDate().format(localDate)))
                    .append(',')
                    .append(csvCell(v.getVisitTime().toString()))
                    .append(',')
                    .append(csvCell(v.getStatus().name()))
                    .append(',')
                    .append(csvCell(v.getNotes()))
                    .append(',')
                    .append(csvCell(agentName))
                    .append(',')
                    .append(csvCell(agentPhone))
                    .append(',')
                    .append(csvCell(ISO_INSTANT.format(created.truncatedTo(ChronoUnit.SECONDS))))
                    .append('\n');
        }
        return ("\uFEFF" + sb).getBytes(StandardCharsets.UTF_8);
    }

    private static String uuidCell(UUID id) {
        return id == null ? "" : id.toString().toLowerCase();
    }

    private static String csvCell(String raw) {
        return CsvEscapeUtil.escapeCell(raw);
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
                // Agent should not see buyer contact details (admin only).
                .map(this::toMaskedDto)
                .toList();
    }

    @Transactional
    public VisitDTO updateVisitStatus(UUID visitId, String newStatus, String notes, UUID agentId) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new AppException(404, "VISIT_NOT_FOUND"));
        if (visit.getAgent() == null || !visit.getAgent().getId().equals(agentId)) {
            throw new AppException(403, "FORBIDDEN");
        }
        return applyVisitStatusChange(visit, newStatus, notes, agentId, false);
    }

    /**
     * Admin override — no agent ownership check. When {@code notes} is null, existing notes are kept.
     */
    @Transactional
    public VisitDTO updateVisitStatusAsAdmin(UUID visitId, String newStatus, String notes) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new AppException(404, "VISIT_NOT_FOUND"));
        return applyVisitStatusChange(visit, newStatus, notes, null, true);
    }

    /**
     * @param preserveNotesIfNull when true, do not change {@link Visit#getNotes()} if {@code notes} is null
     */
    private VisitDTO applyVisitStatusChange(
            Visit visit,
            String newStatus,
            String notes,
            UUID agentIdForLog,
            boolean preserveNotesIfNull
    ) {
        VisitStatus previous = visit.getStatus();
        VisitStatus status;
        try {
            status = VisitStatus.valueOf(newStatus.trim().toUpperCase());
        } catch (Exception e) {
            throw new AppException(400, "INVALID_STATUS");
        }

        visit.setStatus(status);
        if (!preserveNotesIfNull || notes != null) {
            visit.setNotes(notes);
        }

        if (previous == VisitStatus.VISITED && status != VisitStatus.VISITED) {
            visit.setPostVisitWaSent(false);
        }

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
                "VISIT_STATUS_UPDATED id={} status={} actor={}",
                visit.getId(),
                status.name(),
                agentIdForLog != null ? agentIdForLog.toString() : "ADMIN"
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

        try {
            whatsAppService.sendVisitRescheduledTemplate(
                    visit.getBuyerPhone(),
                    visit.getProperty().getTitle(),
                    visit.getProperty().getCity(),
                    newDate,
                    newTime
            );
        } catch (Exception e) {
            log.warn("Reschedule WhatsApp notification skipped: {}", e.getMessage());
        }

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

    private VisitDTO toMaskedDto(Visit v) {
        Instant created = v.getCreatedAt() != null ? v.getCreatedAt() : Instant.now();
        return new VisitDTO(
                v.getId(),
                v.getProperty().getId(),
                v.getProperty().getTitle(),
                null,
                v.getVisitDate(),
                v.getVisitTime(),
                v.getStatus().name(),
                v.getPostVisitWaSent(),
                v.getNotes(),
                ISO_INSTANT.format(created.truncatedTo(ChronoUnit.SECONDS))
        );
    }
}
