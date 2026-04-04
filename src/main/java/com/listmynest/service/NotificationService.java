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
            log.debug("Skipping visit FCM: no agent token");
            return;
        }
        if (firebaseApp == null) {
            log.warn("DEV MODE: Would send visit FCM to agent {}", agent.getId());
            return;
        }
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
        } catch (Exception e) {
            log.error("FCM visit notification failed: {}", e.getMessage());
        }
    }

    public void sendLeadNotification(Agent agent, Lead lead, Property property) {
        if (agent == null || !StringUtils.hasText(agent.getFcmToken())) {
            log.debug("Skipping lead FCM: no agent token");
            return;
        }
        if (firebaseApp == null) {
            log.warn("DEV MODE: Would send lead FCM to agent {}", agent.getId());
            return;
        }
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
        } catch (Exception e) {
            log.error("FCM lead notification failed: {}", e.getMessage());
        }
    }

    public void sendVisitReminderToAgent(Agent agent, Visit visit, Property property) {
        if (agent == null || !StringUtils.hasText(agent.getFcmToken())) {
            log.debug("Skipping visit reminder FCM: no agent token");
            return;
        }
        if (firebaseApp == null) {
            log.warn("DEV MODE: Would send visit reminder FCM to agent {}", agent.getId());
            return;
        }
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
        } catch (Exception e) {
            log.error("FCM visit reminder failed: {}", e.getMessage());
        }
    }
}
