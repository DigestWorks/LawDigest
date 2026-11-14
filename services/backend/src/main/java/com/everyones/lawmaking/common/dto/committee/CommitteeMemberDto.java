package com.everyones.lawmaking.common.dto.committee;

import com.everyones.lawmaking.domain.entity.Congressman;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Getter;

/** 위원회 소속 위원. */
@Getter
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class CommitteeMemberDto {

    private final String congressmanId;
    private final String congressmanName;
    private final String congressmanImageUrl;
    private final Long partyId;
    private final String partyName;
    private final String partyImageUrl;

    public static CommitteeMemberDto from(Congressman congressman) {
        var party = congressman.getParty();
        return CommitteeMemberDto.builder()
                .congressmanId(congressman.getId())
                .congressmanName(congressman.getName())
                .congressmanImageUrl(congressman.getCongressmanImageUrl())
                .partyId(party == null ? null : party.getId())
                .partyName(party == null ? null : party.getName())
                .partyImageUrl(party == null ? null : party.getPartyImageUrl())
                .build();
    }
}
