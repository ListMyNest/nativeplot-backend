package com.listmynest.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminRegisterRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @Size(max = 15) String phone,
        /** Required to add admins after the first one, if {@code app.admin-invite-secret} is set. */
        String inviteSecret
) {}
