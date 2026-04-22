package com.listmynest.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.listmynest.model.Agent;
import com.listmynest.model.Lead;
import com.listmynest.model.Property;
import com.listmynest.model.Visit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@Slf4j
public class NotificationService {

    private final FirebaseApp firebaseApp;

    public NotificationService(@Autowired(required = false) FirebaseApp firebaseApp) {
        this.firebaseApp = firebaseApp;
        if (firebaseApp == null) {
            log.warn("Firebase not configured — FCM push disabled in dev mode");
        }
    }

    public void sendVisitNotification(Agent agent, Visit visit, Property property) {
        if (agent == null || !StringUtils.hasText(agent.getFcmToken())) {
            log.warn(
                    "FCM_NO_TOKEN agent={} skipping push notification",
                    agent == null ? "none" : agent.getId()
            );
            return;
        }
        if (firebaseApp == null) {
            log.warn("FCM_FAILED agent={} error=Firebase_not_configured - continuing without push", agent.getId());
            return;
        }
        long t0 = System.nanoTime();
        try {
            Message message = Message.builder()
                    .setToken(agent.getFcmToken())
                    .putData("type", "NEW_VISIT")
                    .putData("visitId", visit.getId().toString())
                    .putData("propertyId", property.getId().toString())
                    .putData("buyerPhone", visit.getBuyerPhone())
                    .putData("visitDate", visit.getVisitDate().toString())
                    .putData("visitTime", visit.getVisitTime().toString())
                    .build();
            FirebaseMessaging.getInstance(firebaseApp).send(message);
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            log.info("FCM_SENT agent={} type=NEW_VISIT duration={}ms", agent.getId(), ms);
        } catch (Exception e) {
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            log.warn(
                    "FCM_FAILED agent={} error={} duration={}ms - continuing without push",
                    agent.getId(),
                    e.getMessage(),
                    ms
            );
        }
    }

    public void sendLeadNotification(Agent agent, Lead lead, Property property) {
        if (agent == null || !StringUtils.hasText(agent.getFcmToken())) {
            log.warn(
                    "FCM_NO_TOKEN agent={} skipping push notification",
                    agent == null ? "none" : agent.getId()
            );
            return;
        }
        if (firebaseApp == null) {
            log.warn("FCM_FAILED agent={} error=Firebase_not_configured - continuing without push", agent.getId());
            return;
        }
        long t0 = System.nanoTime();
        try {
            Message message = Message.builder()
                    .setToken(agent.getFcmToken())
                    .putData("type", "NEW_LEAD")
                    .putData("leadId", lead.getId().toString())
                    .putData("propertyId", property.getId().toString())
                    .putData("actionType", lead.getActionType().name())
                    .putData("buyerPhone", lead.getBuyerPhone() == null ? "" : lead.getBuyerPhone())
                    .build();
            FirebaseMessaging.getInstance(firebaseApp).send(message);
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            log.info("FCM_SENT agent={} type=NEW_LEAD duration={}ms", agent.getId(), ms);
        } catch (Exception e) {
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            log.warn(
                    "FCM_FAILED agent={} error={} duration={}ms - continuing without push",
                    agent.getId(),
                    e.getMessage(),
                    ms
            );
        }
    }

    public void sendVisitReminderToAgent(Agent agent, Visit visit, Property property) {
        if (agent == null || !StringUtils.hasText(agent.getFcmToken())) {
            log.warn(
                    "FCM_NO_TOKEN agent={} skipping push notification",
                    agent == null ? "none" : agent.getId()
            );
            return;
        }
        if (firebaseApp == null) {
            log.warn("FCM_FAILED agent={} error=Firebase_not_configured - continuing without push", agent.getId());
            return;
        }
        long t0 = System.nanoTime();
        try {
            String text = "Visit reminder: " + visit.getBuyerPhone()
                    + " is visiting " + property.getTitle()
                    + " at " + visit.getVisitTime();
            Message message = Message.builder()
                    .setToken(agent.getFcmToken())
                    .putData("type", "VISIT_REMINDER")
                    .putData("visitId", visit.getId().toString())
                    .putData("propertyId", property.getId().toString())
                    .putData("buyerPhone", visit.getBuyerPhone())
                    .putData("visitTime", visit.getVisitTime().toString())
                    .putData("message", text)
                    .build();
            FirebaseMessaging.getInstance(firebaseApp).send(message);
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            log.info("FCM_SENT agent={} type=VISIT_REMINDER duration={}ms", agent.getId(), ms);
        } catch (Exception e) {
            long ms = (System.nanoTime() - t0) / 1_000_000L;
            log.warn(
                    "FCM_FAILED agent={} error={} duration={}ms - continuing without push",
                    agent.getId(),
                    e.getMessage(),
                    ms
            );
        }
    }
}
