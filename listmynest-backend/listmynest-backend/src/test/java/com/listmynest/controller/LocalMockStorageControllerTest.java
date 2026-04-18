package com.listmynest.controller;

import com.listmynest.storage.LocalMockStoragePaths;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LocalMockStorageControllerTest {

    private static final byte[] ONE_PX_PNG = Base64.getDecoder()
            .decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    @Test
    void putThenGet_roundTrip() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new LocalMockStorageController()).build();

        String path = "properties/00000000-0000-0000-0000-000000000001/test-roundtrip.png";
        mockMvc.perform(put("/mock-upload/" + path).content(ONE_PX_PNG).contentType(MediaType.APPLICATION_OCTET_STREAM))
                .andExpect(status().isOk());

        mockMvc.perform(get("/mock-upload/" + path))
                .andExpect(status().isOk())
                .andExpect(content().bytes(ONE_PX_PNG));

        Path file = LocalMockStoragePaths.ROOT.resolve(path).normalize();
        Files.deleteIfExists(file);
    }
}
