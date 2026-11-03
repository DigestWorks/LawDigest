package com.everyones.lawmaking.common.dto.response;

import com.everyones.lawmaking.domain.entity.Party;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.net.URI;
import java.time.LocalDate;
import java.time.ZoneId;

@Getter
@AllArgsConstructor
@Builder
@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PartyExecutiveResponse {
    @Schema(description = "당대표")
    String partyLeader;
    @Schema(description = "원내대표")
    String parliamentaryLeader;
    @Schema(description = "정책위의장")
    String policyCommitteeChairman;
    @Schema(description = "사무총장")
    String secretaryGeneral;

    private LocalDate leadershipVerifiedOn;
    private String leadershipSourceUrl;

    public static PartyExecutiveResponse from(Party party) {
        return from(party, LocalDate.now(ZoneId.of("Asia/Seoul")));
    }

    static PartyExecutiveResponse from(Party party, LocalDate today) {
        var date = party.getLeadershipVerifiedOn();
        var source = party.getLeadershipSourceUrl();
        if (date == null || date.isBefore(today.minusDays(30)) || date.isAfter(today) || !validSource(source)) {
            return PartyExecutiveResponse.builder().build();
        }
        return PartyExecutiveResponse.builder()
                .partyLeader(party.getPartyLeader())
                .parliamentaryLeader(party.getParliamentaryLeader())
                .policyCommitteeChairman(party.getPolicyCommitteeChairman())
                .secretaryGeneral(party.getSecretaryGeneral())
                .leadershipVerifiedOn(date)
                .leadershipSourceUrl(source)
                .build();
    }

    private static boolean validSource(String source) {
        if (source == null) return false;
        try {
            var uri = URI.create(source);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null;
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }
}
