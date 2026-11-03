package com.everyones.lawmaking.common.dto;

import com.everyones.lawmaking.domain.entity.Bill;
import com.everyones.lawmaking.domain.entity.RepresentativeProposer;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Builder
@Getter
@AllArgsConstructor
@NoArgsConstructor
@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy.class)
public class BillOutlineDto {
    private List<PartyDto> partyInfo;
    private String billId;
    private String billName;
    private String billStage;
    private String billResult;
    private String billProposers;
    private String billTitle;


    public static BillOutlineDto from(Bill bill) {
        return from(bill, bill.getBillResult());
    }

    public static BillOutlineDto from(Bill bill, String result) {
        var representProposers = bill.getRepresentativeProposer();
        List<PartyDto> partyList = new ArrayList<>();
        for (RepresentativeProposer representativeProposer : representProposers) {
            var congressman = representativeProposer.getCongressman();
            if (congressman != null && congressman.getParty() != null) {
                partyList.add(PartyDto.from(congressman.getParty()));
            }
        }
        return BillOutlineDto.builder()
                .partyInfo(partyList)
                .billId(bill.getId())
                .billName(bill.getBillName())
                .billStage(bill.getStage())
                .billResult(result)
                .billProposers(bill.getProposers())
                .billTitle(bill.getTitle())
                .build();
    }
}
