package com.everyones.lawmaking.service;

import com.everyones.lawmaking.common.dto.SimilarBill;
import com.everyones.lawmaking.domain.entity.Bill;
import com.everyones.lawmaking.domain.entity.Congressman;
import com.everyones.lawmaking.domain.entity.Party;
import com.everyones.lawmaking.domain.entity.RepresentativeProposer;
import com.everyones.lawmaking.domain.entity.IngestStatusType;
import com.everyones.lawmaking.repository.BillRepository;
import com.everyones.lawmaking.repository.BillActivityRepository;
import com.everyones.lawmaking.repository.StatisticsRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class SimilarBillServiceTest {
    @Test
    void detailReturnsOnlyFirstFiveAndKeepsTotalAndHistoricalStatus() {
        var repository = mock(BillRepository.class);
        var current = bill("current", 22, null);
        var historical = bill("old", 21, "임기만료폐기");
        var items = List.of(historical, bill("b", 22, null), bill("c", 22, null),
                bill("d", 22, null), bill("e", 22, null));
        when(repository.findBillById("current")).thenReturn(Optional.of(current));
        when(repository.findSimilarBills("의료법", "current", null, 22, PageRequest.of(0, 5)))
                .thenReturn(new PageImpl<>(items, PageRequest.of(0, 5), 761));

        var detail = new BillService(repository, mock(StatisticsRepository.class), mock(BillActivityRepository.class)).getBillWithDetail("current", false);

        assertThat(detail.getSimilarBills()).hasSize(5);
        assertThat(detail.getSimilarBillsCount()).isEqualTo(761);
        assertThat(detail.getSimilarBills().get(0).getAssemblyNumber()).isEqualTo(21);
        assertThat(detail.getSimilarBills().get(0).getBillResult()).isEqualTo("임기만료폐기");
        verify(repository).findSimilarBills("의료법", "current", null, 22, PageRequest.of(0, 5));
    }

    @Test
    void detailPrefetchesCurrentAssemblyAndReportsPreviousCountSeparately() {
        var repository = mock(BillRepository.class);
        var page = PageRequest.of(0, 5);
        when(repository.findBillById("current")).thenReturn(Optional.of(bill("current", 22, null)));
        when(repository.findSimilarBills("의료법", "current", true, 22, page))
                .thenReturn(new PageImpl<>(List.of(bill("same-term", 22, null)), page, 1));
        when(repository.countSimilarBills("의료법", "current", false, 22)).thenReturn(7L);
        var detail = new BillService(repository, mock(StatisticsRepository.class), mock(BillActivityRepository.class))
                .getBillWithDetail("current", true);
        assertThat(detail.getSimilarBills()).extracting(SimilarBill::getBillId).containsExactly("same-term");
        assertThat(detail.getSimilarBillsCount()).isEqualTo(1);
        assertThat(detail.getPreviousSimilarBillsCount()).isEqualTo(7);
    }

    @Test
    void archivedAmendmentUsesItsProposerPartyAndNormalizesSpacing() {
        var filingParty = Party.builder().id(1).name("발의 당시 정당").build();
        var presentParty = Party.builder().id(2).name("현재 정당").build();
        var congressman = Congressman.builder().party(presentParty).build();
        var bill = Bill.builder().id("old").proposers("전주혜의원등20인")
                .representativeProposer(List.of(
                        RepresentativeProposer.builder().congressman(congressman).party(filingParty).build(),
                        RepresentativeProposer.builder().congressman(congressman).build()))
                .build();

        var related = SimilarBill.from(bill);
        assertThat(related.getBillProposers()).isEqualTo("전주혜 의원 등 20인");
        assertThat(related.getParty()).singleElement()
                .satisfies(party -> assertThat(party.getPartyName()).isEqualTo("발의 당시 정당"));
    }

    private Bill bill(String id, int assembly, String result) {
        return Bill.builder().id(id).assemblyNumber(assembly).billName("의료법").title("법안 요약")
                .proposeDate(LocalDate.of(2024, 1, 1)).billResult(result).stage("위원회 심사")
                .ingestStatus(IngestStatusType.READY).representativeProposer(List.of())
                .publicProposer(List.of()).billLike(List.of()).build();
    }
}
