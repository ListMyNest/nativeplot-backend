package com.listmynest.dto;

import java.util.UUID;

public record BuyerAuthResponse(String buyerToken, UUID buyerId) {}
