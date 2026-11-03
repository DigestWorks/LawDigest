package com.everyones.lawmaking.common.dto;

import com.everyones.lawmaking.domain.entity.Bill;
import com.everyones.lawmaking.domain.entity.RepresentativeProposer;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.util.StringUtils;

import java.util.Objects;
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
        var partyList = bill.getRepresentativeProposer().stream()
                .map(RepresentativeProposer::getParty)
                .filter(Objects::nonNull)
                .distinct()
                .map(PartyDto::from)
                .toList();
        String proposers = bill.getProposers();
        if (proposers != null) {
            proposers = proposers.strip()
                    .replaceFirst("\\s*의원\\s*등\\s*(\\d+)\\s*인$", " 의원 등 $1인")
                    .replaceFirst("\\s*의원$", " 의원");
        }

        return SimilarBill.builder()
                .billId(bill.getId())
                .billTitle(StringUtils.hasText(bill.getGptSummary()) && StringUtils.hasText(bill.getTitle())
                        ? bill.getTitle() : bill.getBillName())
                .billName(bill.getBillName())
                .billProposers(proposers)
                .billStage(bill.getStage())
                .billResult(bill.getBillResult())
                .assemblyNumber(bill.getAssemblyNumber())
                .proposeDate(bill.getProposeDate())
                .party(partyList)
                .build();
    }

}
