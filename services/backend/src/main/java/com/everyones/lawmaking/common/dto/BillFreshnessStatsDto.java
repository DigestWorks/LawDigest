package com.everyones.lawmaking.common.dto;

import java.time.LocalDate;

public record BillFreshnessStatsDto(LocalDate latestProposalDate, Long readyBillCount, Long pendingSummaryCount) {
}
