package com.everyones.lawmaking.common.dto;

import com.everyones.lawmaking.domain.entity.Bill;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.ArrayList;
import java.util.List;
import java.time.LocalDate;

@Getter
@Builder
@AllArgsConstructor
public class SimilarBill {
    @NotNull
    private String billId;
    @NotNull
    private String billTitle;
    @NotNull
    private String billName;
    @NotNull
    private String billProposers;
    private String billStage;
    private String billResult;
    private int assemblyNumber;
    private LocalDate proposeDate;
    @NotNull
    private List<PartyDto> party;

    public static SimilarBill from(Bill bill) {
        List<PartyDto> partyList = new ArrayList<>();
        var representProposers = bill.getRepresentativeProposer();
        for (var representProposer : representProposers) {
            partyList.add(PartyDto.from(representProposer.getCongressman().getParty()));
        }

        return SimilarBill.builder()
                .billId(bill.getId())
                .billTitle(bill.getTitle())
                .billName(bill.getBillName())
                .billProposers(bill.getProposers())
                .billStage(bill.getStage())
                .billResult(bill.getBillResult())
                .assemblyNumber(bill.getAssemblyNumber())
                .proposeDate(bill.getProposeDate())
                .party(partyList)
                .build();
    }

}
