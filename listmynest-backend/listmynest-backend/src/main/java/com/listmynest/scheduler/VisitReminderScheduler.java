package com.listmynest.scheduler;

import com.listmynest.model.Visit;
import com.listmynest.model.VisitStatus;
import com.listmynest.repository.VisitRepository;
import com.listmynest.service.NotificationService;
import com.listmynest.service.RedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class VisitReminderScheduler {

    private static final String JOB = "VisitReminderScheduler";
    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    private final VisitRepository visitRepository;
    private final RedisService redisService;
    private final NotificationService notificationService;

    @Scheduled(fixedDelay = 300000)
    @Transactional(readOnly = true)
    public void sendVisitReminders() {
        long t0 = System.currentTimeMillis();
        log.trace("SCHEDULER_START job={} time={}", JOB, Instant.now());
        int sent = 0;
        try {
            LocalDate today = LocalDate.now(ZONE);
            ZonedDateTime nowZ = ZonedDateTime.now(ZONE);
            ZonedDateTime windowStart = nowZ.plusMinutes(55);
            ZonedDateTime windowEnd = nowZ.plusMinutes(65);

            List<Visit> candidates = visitRepository.findByVisitDateAndStatusIn(
                    today, List.of(VisitStatus.SCHEDULED, VisitStatus.CONFIRMED));

            for (Visit visit : candidates) {
                ZonedDateTime visitAt = visit.getVisitDate().atTime(visit.getVisitTime()).atZone(ZONE);
                if (visitAt.isBefore(windowStart) || visitAt.isAfter(windowEnd)) {
                    continue;
                }
                String redisKey = "visit_reminded:" + visit.getId();
                if (redisService.exists(redisKey)) {
                    continue;
                }
                if (visit.getAgent() == null || visit.getProperty() == null) {
                    log.warn("Visit reminder skipped — missing agent or property for visit {}", visit.getId());
                    continue;
                }
                notificationService.sendVisitReminderToAgent(visit.getAgent(), visit, visit.getProperty());
                redisService.set(redisKey, "1", 7200);
                sent++;
                log.warn(
                        "SCHEDULER_ACTION job={} property={} action=VISIT_REMINDER_PUSH visit={}",
                        JOB,
                        visit.getProperty().getId(),
                        visit.getId()
                );
            }
            long ms = System.currentTimeMillis() - t0;
            if (sent > 0) {
                log.info("SCHEDULER_COMPLETE job={} processed={} duration={}ms", JOB, sent, ms);
            } else {
                log.trace("SCHEDULER_COMPLETE job={} processed=0 duration={}ms", JOB, ms);
            }
        } catch (Exception e) {
            log.error("SCHEDULER_ERROR job={} error={}", JOB, e.getMessage(), e);
        }
    }
}
