package com.everyones.lawmaking.domain.entity;

import com.everyones.lawmaking.common.dto.request.VoteDfRequest;
import com.everyones.lawmaking.common.dto.request.VotePartyRequest;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.Objects;

@Entity
@Data
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy.class)
public class VoteParty extends BaseEntity{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vote_party_id")
    private long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id")
    private Bill bill;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "party_id")
    private Party party;

    @NotNull
    @Column(name="votes_for_count")
    private Integer voteForCount;

    @Column(name = "decision_date")
    private LocalDate decisionDate;

    public static VoteParty of(Bill foundBill, Party foundParty, VotePartyRequest votePartyRequest){
        return VoteParty.builder()
                .bill(foundBill)
                .party(foundParty)
                .voteForCount(votePartyRequest.getVoteForCount())
                .build();
    }

    public void updateVotesForCount(VotePartyRequest votePartyRequest){
        if (!Objects.equals(voteForCount, votePartyRequest.getVoteForCount())) {
            decisionDate = null;
        }
        this.setVoteForCount(votePartyRequest.getVoteForCount());
    }

    public boolean matchesDecisionDate(LocalDate date) {
        return date == null || date.equals(decisionDate);
    }


}
