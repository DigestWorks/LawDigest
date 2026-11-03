package com.everyones.lawmaking.service;

import com.everyones.lawmaking.domain.entity.Bill;
import com.everyones.lawmaking.repository.BillRepository;
import com.everyones.lawmaking.repository.BillActivityRepository;
import com.everyones.lawmaking.repository.StatisticsRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BillSearchServiceTest {
    @Test
    void hydrationKeepsRelevanceOrderInsteadOfRepositoryDateOrder() {
        var repository = mock(BillRepository.class);
        var pageable = PageRequest.of(0, 10);
        when(repository.findBillByKeyword(eq(pageable), eq("의료법"), eq("의료법"), eq("+의료법*"), isNull()))
                .thenReturn(new SliceImpl<>(List.of("older-exact", "newer-body"), pageable, false));
        when(repository.findBillInfoByIdList(List.of("older-exact", "newer-body")))
                .thenReturn(List.of(bill("newer-body", "2026-07-09"), bill("older-exact", "2026-01-01")));

        var response = new BillService(repository, mock(StatisticsRepository.class), mock(BillActivityRepository.class)).searchBill("의료법", pageable);

        assertThat(response.getBillList()).extracting(item -> item.getBillInfoDto().getBillId())
                .containsExactly("older-exact", "newer-body");
        assertThat(response.getPaginationResponse().isLastPage()).isTrue();
    }

    private Bill bill(String id, String date) {
        return Bill.builder().id(id).billName("의료법").title("요약 제목").summary("원문")
                .gptSummary("요약").proposeDate(LocalDate.parse(date))
                .representativeProposer(List.of()).publicProposer(List.of()).billLike(List.of()).build();
    }
}
