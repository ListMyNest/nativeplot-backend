package com.listmynest.scheduler;

import com.listmynest.repository.PropertyRepository;
import com.listmynest.service.RedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ViewCountFlushScheduler {

    private static final String JOB = "ViewCountFlushScheduler";
    private static final String PREFIX = "view_count:";

    private final PropertyRepository propertyRepository;
    private final RedisService redisService;

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void flushViewCounts() {
        long t0 = System.currentTimeMillis();
        log.trace("SCHEDULER_START job={} time={}", JOB, Instant.now());
        try {
            int flushed = 0;
            for (String key : redisService.scanKeys(PREFIX + "*")) {
                if (!key.startsWith(PREFIX)) {
                    continue;
                }
                String idPart = key.substring(PREFIX.length());
                UUID propertyId;
                try {
                    propertyId = UUID.fromString(idPart);
                } catch (IllegalArgumentException e) {
                    log.warn("Skipping invalid view_count key: {}", key);
                    continue;
                }
                String countStr = redisService.get(key);
                if (countStr == null || countStr.isBlank()) {
                    continue;
                }
                int count;
                try {
                    count = Integer.parseInt(countStr.trim());
                } catch (NumberFormatException e) {
                    log.warn("Skipping non-integer view_count for key {}: {}", key, countStr);
                    continue;
                }
                if (count <= 0) {
                    continue;
                }
                propertyRepository.incrementViewCount(propertyId, count);
                redisService.delete(key);
                flushed++;
                log.info("SCHEDULER_ACTION job={} property={} action=FLUSH_VIEW_COUNT delta={}", JOB, propertyId, count);
            }
            long ms = System.currentTimeMillis() - t0;
            if (flushed > 0) {
                log.info("SCHEDULER_COMPLETE job={} processed={} duration={}ms", JOB, flushed, ms);
            } else {
                log.trace("SCHEDULER_COMPLETE job={} processed=0 duration={}ms", JOB, ms);
            }
        } catch (Exception e) {
            log.error("SCHEDULER_ERROR job={} error={}", JOB, e.getMessage(), e);
        }
    }
}
