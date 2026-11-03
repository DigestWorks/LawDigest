package com.everyones.lawmaking.service;

import com.everyones.lawmaking.domain.entity.Bill;
import com.everyones.lawmaking.domain.entity.IngestStatusType;
import com.everyones.lawmaking.repository.BillRepository;
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
        when(repository.findSimilarBills("의료법", "current", PageRequest.of(0, 5)))
                .thenReturn(new PageImpl<>(items, PageRequest.of(0, 5), 761));

        var detail = new BillService(repository, mock(StatisticsRepository.class)).getBillWithDetail("current");

        assertThat(detail.getSimilarBills()).hasSize(5);
        assertThat(detail.getSimilarBillsCount()).isEqualTo(761);
        assertThat(detail.getSimilarBills().get(0).getAssemblyNumber()).isEqualTo(21);
        assertThat(detail.getSimilarBills().get(0).getBillResult()).isEqualTo("임기만료폐기");
        verify(repository).findSimilarBills("의료법", "current", PageRequest.of(0, 5));
    }

    private Bill bill(String id, int assembly, String result) {
        return Bill.builder().id(id).assemblyNumber(assembly).billName("의료법").title("법안 요약")
                .proposeDate(LocalDate.of(2024, 1, 1)).billResult(result).stage("위원회 심사")
                .ingestStatus(IngestStatusType.READY).representativeProposer(List.of())
                .publicProposer(List.of()).billLike(List.of()).build();
    }
}
