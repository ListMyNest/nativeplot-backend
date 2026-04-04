package com.listmynest.controller;

import com.listmynest.dto.ApiResponse;
import com.listmynest.dto.NotifyMeRequest;
import com.listmynest.service.NotifyMeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/notify-me")
@RequiredArgsConstructor
@Slf4j
public class NotifyMeController {

    private final NotifyMeService notifyMeService;

    @PostMapping
    public ApiResponse register(@Valid @RequestBody NotifyMeRequest request) {
        notifyMeService.register(request);
        return new ApiResponse(true, "You will be notified of new listings");
    }
}
