package com.everyones.lawmaking.common.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.LocalDate;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record DataFreshnessDto(
        int assemblyNumber,
        @JsonFormat(pattern = "yyyy-MM-dd") LocalDate latestProposalDate,
        @JsonFormat(pattern = "yyyy-MM-dd") LocalDate latestTimelineDate,
        long readyBillCount,
        long pendingSummaryCount
) {
}
