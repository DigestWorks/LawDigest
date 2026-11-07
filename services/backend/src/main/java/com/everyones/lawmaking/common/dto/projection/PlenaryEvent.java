package com.everyones.lawmaking.common.dto.projection;

import java.time.LocalDate;
import java.util.List;

public record PlenaryEvent(
        String billId, LocalDate date, String result, Integer approvalCount, Integer totalVoteCount
) {
    public static PlenaryEvent verifiedVoteOn(List<PlenaryEvent> history, LocalDate date, String result) {
        if (result == null || history.stream().anyMatch(event -> date.equals(event.date())
                && event.result() != null && !event.result().isBlank() && !result.equals(event.result()))) {
            return null;
        }
        var votes = history.stream().filter(event -> date.equals(event.date()) && result.equals(event.result()))
                .filter(event -> event.approvalCount() != null && event.totalVoteCount() != null
                        && event.totalVoteCount() > 0 && event.approvalCount() >= 0
                        && event.approvalCount() <= event.totalVoteCount())
                .distinct().toList();
        return votes.size() == 1 ? votes.get(0) : null;
    }
}
