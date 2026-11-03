package com.everyones.lawmaking.common.dto.response;

import com.everyones.lawmaking.domain.entity.Party;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class PartyExecutiveResponseTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 3);
    private static final String SOURCE = "https://example.org/official-leadership";

    @Test
    void publishesOnlyRecentSourceVerifiedLeadership() {
        assertThat(PartyExecutiveResponse.from(party(TODAY, SOURCE), TODAY).getPartyLeader()).isEqualTo("확인된 대표");
        assertThat(PartyExecutiveResponse.from(party(null, SOURCE), TODAY).getPartyLeader()).isNull();
        assertThat(PartyExecutiveResponse.from(party(TODAY.minusDays(31), SOURCE), TODAY).getPartyLeader()).isNull();
        assertThat(PartyExecutiveResponse.from(party(TODAY.plusDays(1), SOURCE), TODAY).getPartyLeader()).isNull();
        assertThat(PartyExecutiveResponse.from(party(TODAY, "javascript:void(0)"), TODAY).getPartyLeader()).isNull();
    }

    private Party party(LocalDate verifiedOn, String source) {
        return Party.builder().partyLeader("확인된 대표")
                .leadershipVerifiedOn(verifiedOn).leadershipSourceUrl(source).build();
    }
}
