package com.listmynest.scheduler;

import com.listmynest.service.PropertyLifecycleJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class PropertyLifecycleScheduler {

    private static final String JOB = "PropertyLifecycleScheduler";

    private final PropertyLifecycleJobService propertyLifecycleJobService;

    @Scheduled(cron = "0 0 8 * * *")
    public void runLifecycleChecks() {
        long t0 = System.currentTimeMillis();
        log.info("SCHEDULER_START job={} time={}", JOB, Instant.now());
        int warnCount = 0;
        int inactiveCount = 0;
        int archivedCount = 0;

        try {
            warnCount = propertyLifecycleJobService.runThirtyDayWarning();
        } catch (Exception e) {
            log.error("SCHEDULER_ERROR job={} phase=THIRTY_DAY_WARN error={}", JOB, e.getMessage(), e);
        }

        try {
            inactiveCount = propertyLifecycleJobService.runFortyFiveDayInactive();
        } catch (Exception e) {
            log.error("SCHEDULER_ERROR job={} phase=FORTY_FIVE_DAY_INACTIVE error={}", JOB, e.getMessage(), e);
        }

        try {
            archivedCount = propertyLifecycleJobService.runSoldBadgeExpiry();
        } catch (Exception e) {
            log.error("SCHEDULER_ERROR job={} phase=SOLD_BADGE_EXPIRY error={}", JOB, e.getMessage(), e);
        }

        int processed = warnCount + inactiveCount + archivedCount;
        long ms = System.currentTimeMillis() - t0;
        log.info("SCHEDULER_COMPLETE job={} processed={} duration={}ms", JOB, processed, ms);
    }
}
