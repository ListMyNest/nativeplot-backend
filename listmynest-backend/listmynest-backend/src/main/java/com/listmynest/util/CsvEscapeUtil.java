package com.listmynest.util;

/**
 * CSV cell escaping for exports — avoids spreadsheet formula injection (=,+,-,@…).
 */
public final class CsvEscapeUtil {

    private CsvEscapeUtil() {}

    public static String escapeCell(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw.replace("\r\n", "\n").replace('\r', '\n');
        s = s.replace("\"", "\"\"");
        String lead = s.stripLeading();
        if (!lead.isEmpty()) {
            char c = lead.charAt(0);
            if (c == '=' || c == '+' || c == '-' || c == '@') {
                s = "'" + s;
            }
        }
        boolean needsQuotes = s.contains(",") || s.contains("\"") || s.contains("\n");
        return needsQuotes ? "\"" + s + "\"" : s;
    }
}
