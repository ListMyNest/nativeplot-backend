package com.listmynest.config;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

/**
 * True when {@code firebase.service-account-json} is non-blank and not "{}".
 */
public class FirebaseEnabledCondition implements Condition {

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        String json = context.getEnvironment().getProperty("firebase.service-account-json", "{}");
        return StringUtils.hasText(json) && !"{}".equals(json.trim());
    }
}
