package com.everyones.lawmaking.common.dto;

import com.everyones.lawmaking.domain.entity.Bill;
import com.everyones.lawmaking.domain.entity.BillTimeline;
import com.fasterxml.jackson.annotation.JsonFormat;
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
    private String billResult;
    private List<StageDate> stageDates;

    public record StageDate(String stage, @JsonFormat(pattern = "yyyy-MM-dd") LocalDate date) {
    }


    public BillDetailInfo(Bill bill) {
        super(bill);
        this.billLink = bill.getBillLink();
        this.billResult = bill.getBillResult();
        var timeline = bill.getBillTimelineList();
        this.stageDates = timeline == null ? List.of() : timeline.stream()
                .filter(event -> event.getStatusUpdateDate() != null && event.getBillTimelineStage() != null)
                .sorted(Comparator.comparing(BillTimeline::getStatusUpdateDate).reversed())
                .map(event -> new StageDate(event.getBillTimelineStage(), event.getStatusUpdateDate()))
                .distinct()
                .toList();
    }

    public static BillDetailInfo from(Bill bill) {
        return new BillDetailInfo(bill);
    }

}

