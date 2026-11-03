package com.everyones.lawmaking.common.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.everyones.lawmaking.domain.entity.Bill;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class BillTitleJsonContractTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void billInfoUsesTitleKey() {
        var dto = BillInfoDto.builder()
                .billId("bill-1")
                .title("카드 제목")
                .build();

        var json = objectMapper.valueToTree(dto);

        assertThat(json.get("title").asText()).isEqualTo("카드 제목");
        assertThat(json.has("brief_summary")).isFalse();
    }

    @Test
    void billOutlineUsesSnakeCaseBillTitleKey() {
        var dto = BillOutlineDto.builder()
                .billId("bill-1")
                .billTitle("카드 제목")
                .build();

        var json = objectMapper.valueToTree(dto);

        assertThat(json.get("bill_title").asText()).isEqualTo("카드 제목");
        assertThat(json.has("bill_brief_summary")).isFalse();
    }

    @Test
    void similarBillUsesCamelCaseBillTitleKey() {
        var dto = SimilarBill.builder()
                .billId("bill-1")
                .billTitle("카드 제목")
                .build();

        var json = objectMapper.valueToTree(dto);

        assertThat(json.get("billTitle").asText()).isEqualTo("카드 제목");
        assertThat(json.has("billBriefSummary")).isFalse();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = "  ")
    void outlineAndRelatedBillsUseOfficialNameWhenAiSummaryIsMissing(String aiSummary) {
        var bill = Bill.builder()
                .id("bill-1")
                .billName("폐기물관리법 일부개정법률안")
                .title("현행법에서는 폐기물을 수집하려는 자에게 신고 의무를 두고 있음")
                .gptSummary(aiSummary)
                .representativeProposer(List.of())
                .build();

        assertThat(BillOutlineDto.from(bill).getBillTitle()).isEqualTo(bill.getBillName());
        assertThat(SimilarBill.from(bill).getBillTitle()).isEqualTo(bill.getBillName());
    }

    @Test
    void outlineAndRelatedBillsKeepGeneratedTitleWhenAiSummaryExists() {
        var bill = Bill.builder()
                .id("bill-1")
                .billName("폐기물관리법 일부개정법률안")
                .title("폐기물 신고 제도 개선")
                .gptSummary("AI 요약")
                .representativeProposer(List.of())
                .build();

        assertThat(BillOutlineDto.from(bill).getBillTitle()).isEqualTo(bill.getTitle());
        assertThat(SimilarBill.from(bill).getBillTitle()).isEqualTo(bill.getTitle());
    }
}
