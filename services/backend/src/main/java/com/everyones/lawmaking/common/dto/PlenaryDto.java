package com.everyones.lawmaking.common.dto;

import com.everyones.lawmaking.domain.entity.Bill;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PlenaryDto {

    private BillOutlineDto billInfo;

    private Integer approvalVoteCount;

    private Integer totalVoteCount;

    private List<PartyVoteDto> partyVoteList;

    public static PlenaryDto of(Bill bill, String result, VoteResultResponse vote) {
        return PlenaryDto.builder()
                .billInfo(BillOutlineDto.from(bill, result))
                .approvalVoteCount(vote.getApprovalCount())
                .totalVoteCount(vote.getTotalVoteCount())
                .partyVoteList(vote.getPartyVoteList())
                .build();
    }
}
