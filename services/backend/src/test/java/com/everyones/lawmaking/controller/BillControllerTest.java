package com.everyones.lawmaking.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

import com.everyones.lawmaking.common.dto.BillInfoDto;
import com.everyones.lawmaking.common.dto.PublicProposerDto;
import com.everyones.lawmaking.common.dto.bill.BillCardDto;
import com.everyones.lawmaking.common.dto.bill.BillDto;
import com.everyones.lawmaking.common.dto.response.BillListResponse;
import com.everyones.lawmaking.common.dto.response.PaginationResponse;
import com.everyones.lawmaking.facade.BillFacade;
import com.everyones.lawmaking.facade.LikeFacade;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class BillControllerTest {
    @Mock
    private BillFacade billFacade;

    @Mock
    private LikeFacade likeFacade;

    @InjectMocks
    private BillController billController;

    @Test
    void mainFeedDoesNotReturnMoreThanRequestedSize() {
        var pageSize = 3;
        when(billFacade.getBillList(org.mockito.ArgumentMatchers.any(Pageable.class), isNull(), isNull()))
                .thenReturn(BillListResponse.of(
                        PaginationResponse.of(false, 0),
                        List.of(billDto("bill-1"), billDto("bill-2"), billDto("bill-3"), billDto("bill-4"))
                ));

        var response = billController.getBillsFromMainFeed(0, pageSize, null, null, false);

        assertThat(((BillListResponse) response.getData()).getBillList())
                .extracting(billDto -> billDto.getBillInfoDto().getBillId())
                .containsExactly("bill-1", "bill-2", "bill-3");

        var pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        org.mockito.Mockito.verify(billFacade).getBillList(pageableCaptor.capture(), isNull(), isNull());
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(pageSize);
    }

    @Test
    void compactFeedOmitsHeavyFieldsAndKeepsTheLegacyResponse() {
        var bill = BillDto.of(
                BillInfoDto.builder().billId("bill-1").summary("제안이유").gptSummary("AI 요약")
                        .assemblyNumber(21).billResult("임기만료폐기").build(),
                List.of(),
                List.of(PublicProposerDto.builder().publicProposerId("proposer-1").build()),
                true
        );
        bill.setHotActivity(new BillDto.HotActivity(2, 3));
        when(billFacade.getBillList(org.mockito.ArgumentMatchers.any(Pageable.class), isNull(),
                org.mockito.ArgumentMatchers.eq("21")))
                .thenReturn(BillListResponse.of(PaginationResponse.of(false, 0), List.of(bill)));

        var mapper = new ObjectMapper();
        var response = billController.getBillsFromMainFeed(0, 3, null, "21", true);
        assertThat(response.getData()).isInstanceOf(BillCardDto.Page.class);
        var compact = mapper.valueToTree(response.getData()).path("bill_list").get(0);

        assertThat(compact.path("bill_info_dto").has("summary")).isFalse();
        assertThat(compact.path("bill_info_dto").path("gpt_summary").asText()).isEqualTo("AI 요약");
        assertThat(compact.path("bill_info_dto").path("assembly_number").asInt()).isEqualTo(21);
        assertThat(compact.path("bill_info_dto").path("bill_result").asText()).isEqualTo("임기만료폐기");
        assertThat(compact.has("public_proposer_dto_list")).isFalse();
        assertThat(compact.path("public_proposer_count").asInt()).isEqualTo(1);
        assertThat(compact.path("has_original_summary").asBoolean()).isTrue();
        assertThat(compact.path("is_book_mark").asBoolean()).isTrue();
        assertThat(compact.path("hot_activity").path("scrap_count").asLong()).isEqualTo(3);

        var legacy = mapper.valueToTree(billController.getBillsFromMainFeed(0, 3, null, "21", false).getData())
                .path("bill_list").get(0);
        assertThat(legacy.path("bill_info_dto").path("summary").asText()).isEqualTo("제안이유");
        assertThat(legacy.path("public_proposer_dto_list").size()).isEqualTo(1);
        assertThat(legacy.has("public_proposer_count")).isFalse();
    }

    private BillDto billDto(String billId) {
        return BillDto.of(
                BillInfoDto.builder()
                        .billId(billId)
                        .title("title " + billId)
                        .build(),
                Collections.emptyList(),
                Collections.emptyList(),
                false
        );
    }
}
