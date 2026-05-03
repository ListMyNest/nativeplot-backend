package com.listmynest.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CsvEscapeUtilTest {

    @Test
    void neutralText_unquotedWhenSimple() {
        assertEquals("hello", CsvEscapeUtil.escapeCell("hello"));
    }

    @Test
    void formulaLike_prefixQuote() {
        String out = CsvEscapeUtil.escapeCell("=cmd|'/c calc'");
        assertTrue(out.startsWith("'") || out.contains("'\""));
        assertTrue(out.contains("="));
    }

    @Test
    void comma_getsQuoted() {
        assertEquals("\"a,b\"", CsvEscapeUtil.escapeCell("a,b"));
    }
}
