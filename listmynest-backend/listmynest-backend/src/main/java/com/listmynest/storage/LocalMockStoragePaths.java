package com.listmynest.storage;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * On-disk root for {@code /mock-upload/**} when local mock object storage is active
 * (missing Supabase credentials or a publishable-only key).
 */
public final class LocalMockStoragePaths {

    public static final Path ROOT =
            Paths.get(System.getProperty("java.io.tmpdir"), "listmynest-mock-storage");

    private LocalMockStoragePaths() {}
}
