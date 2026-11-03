package com.everyones.lawmaking.common.dto.report;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.LocalDateTime;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record BillReportCard(
        String billId, String title, String billName, int billNumber, int assemblyNumber,
        LocalDateTime publishedAt
) {}
