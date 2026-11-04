package com.everyones.lawmaking.common.dto;

import com.everyones.lawmaking.common.dto.projection.PlenaryEvent;
import com.everyones.lawmaking.domain.entity.Bill;
import com.everyones.lawmaking.domain.entity.BillTimeline;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy.class)
public class BillDetailInfo extends BillInfoDto{

    private String billLink;
    private List<StageDate> stageDates;
    @JsonIgnore
    private PlenaryEvent finalPlenaryVote;

    public record StageDate(String stage, @JsonFormat(pattern = "yyyy-MM-dd") LocalDate date) {
    }


    public BillDetailInfo(Bill bill) {
        super(bill);
        this.billLink = bill.getBillLink();
        var timeline = bill.getBillTimelineList();
        this.stageDates = timeline == null ? List.of() : timeline.stream()
                .filter(event -> event.getStatusUpdateDate() != null && event.getBillTimelineStage() != null)
                .sorted(Comparator.comparing(BillTimeline::getStatusUpdateDate).reversed())
                .map(event -> new StageDate(event.getBillTimelineStage(), event.getStatusUpdateDate()))
                .distinct()
                .toList();
        if (timeline != null) {
            var decisions = timeline.stream()
                    .filter(event -> "본회의 심의".equals(event.getBillTimelineStage())
                            && event.getStatusUpdateDate() != null && event.getBillResult() != null
                            && !event.getBillResult().isBlank())
                    .map(event -> new PlenaryEvent(bill.getId(), event.getStatusUpdateDate(), event.getBillResult(),
                            event.getApprovalVoteCount(), event.getTotalVoteCount()))
                    .toList();
            this.finalPlenaryVote = decisions.stream().map(PlenaryEvent::date).max(Comparator.naturalOrder())
                    .map(date -> PlenaryEvent.verifiedVoteOn(decisions, date, bill.getBillResult()))
                    .orElse(null);
        }
    }

    public static BillDetailInfo from(Bill bill) {
        return new BillDetailInfo(bill);
    }

}

