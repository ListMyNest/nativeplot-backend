package com.listmynest.config;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

/**
 * True when {@code firebase.service-account-json} looks like a Firebase service-account JSON object.
 * Plain placeholders, shell snippets (e.g. {@code Get-Content ...}), or "{}" keep Firebase disabled so bootRun can start.
 */
public class FirebaseEnabledCondition implements Condition {

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        String raw = context.getEnvironment().getProperty("firebase.service-account-json", "{}");
        if (!StringUtils.hasText(raw)) {
            return false;
        }
        String json = raw.trim();
        if (json.startsWith("\uFEFF")) {
            json = json.substring(1).trim();
        }
        if ("{}".equals(json)) {
            return false;
        }
        return json.startsWith("{");
    }
}
