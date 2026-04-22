package com.listmynest.util;

import org.springframework.util.StringUtils;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.regex.Pattern;

/**
 * Masks PII for structured logs. Never log full phone numbers or raw session identifiers.
 */
public final class LogMaskUtil {

    private static final Pattern DIGIT_RUNS = Pattern.compile("\\d{10,}");

    private LogMaskUtil() {
    }

    /**
     * E.g. {@code +91XXXXXX3210} for Indian mobiles; last 4 digits visible when possible.
     */
    public static String maskPhone(String phone) {
        if (!StringUtils.hasText(phone)) {
            return "(none)";
        }
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() >= 10) {
            String last4 = digits.substring(digits.length() - 4);
            return "+XXXXXXXX" + last4;
        }
        return "(redacted)";
    }

    /** Short stable-ish hash for correlating logs without storing full session strings. */
    public static String shortHash(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "none";
        }
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] d = md.digest(raw.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(8);
            for (int i = 0; i < 4; i++) {
                sb.append(String.format("%02x", d[i]));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            return "hash-err";
        }
    }

    /** Replace long digit runs in URLs (e.g. phone path segments) for request logs. */
    public static String maskDigitsInPath(String path) {
        if (path == null) {
            return "";
        }
        return DIGIT_RUNS.matcher(path).replaceAll("XXXXXXXXXX");
    }
}
