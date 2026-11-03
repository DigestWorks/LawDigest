package com.everyones.lawmaking.common.dto.response;

import com.everyones.lawmaking.domain.entity.Party;
import com.everyones.lawmaking.common.dto.PartySeatCount;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PartyDetailResponse {

    @NotNull
    private long partyId;
    @NotNull
    private String partyName;
    @NotNull
    private String partyImgUrl;
    @NotNull
    private int proportionalCongressmanCount;
    @NotNull
    private int districtCongressmanCount;
    private int unclassifiedCongressmanCount;
    private Integer parliamentaryRank;
    @NotNull
    private int totalCongressmanCount;
    @NotNull
    private int representativeBillCount;
    @NotNull
    private int publicBillCount;
    @NotNull
    private int followCount;
    @NotNull
    private boolean isFollowed;
    @NotNull
    private String websiteUrl;

    @Schema(name = "당대표")
    private String partyLeader;

    @Schema(name = "원내 대표")
    private String parliamentaryLeader;

    @Schema(name = "사무 총장")
    private String secretaryGeneral;

    @Schema(name = "정책위의장")
    private String policyCommitteeChairman;


    private LocalDate leadershipVerifiedOn;
    private String leadershipSourceUrl;

    public static PartyDetailResponse from(Party party, PartySeatCount seats, int totalSeats, Integer rank) {
        var leadership = PartyExecutiveResponse.from(party);
        var partyFollow = party.getPartyFollow();
        return PartyDetailResponse.builder()
                .partyId(party.getId())
                .partyName(party.getName())
                .partyImgUrl(party.getPartyImageUrl())
                .websiteUrl(party.getWebsiteUrl())
                .proportionalCongressmanCount(Math.toIntExact(seats.proportionalCount()))
                .districtCongressmanCount(Math.toIntExact(seats.districtCount()))
                .unclassifiedCongressmanCount(seats.unclassifiedCount())
                .totalCongressmanCount(totalSeats)
                .parliamentaryRank(rank)
                .representativeBillCount(party.getRepresentativeBillCount())
                .publicBillCount(party.getPublicBillCount())
                .partyLeader(leadership.getPartyLeader())
                .parliamentaryLeader(leadership.getParliamentaryLeader())
                .secretaryGeneral(leadership.getSecretaryGeneral())
                .policyCommitteeChairman(leadership.getPolicyCommitteeChairman())
                .leadershipVerifiedOn(leadership.getLeadershipVerifiedOn())
                .leadershipSourceUrl(leadership.getLeadershipSourceUrl())
                .followCount(partyFollow.size())
                .isFollowed(false)
                .build();
    }

}
