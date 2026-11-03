package com.everyones.lawmaking.common.dto.bill;

import com.everyones.lawmaking.common.dto.BillInfoDto;
import com.everyones.lawmaking.common.dto.proposer.RepresentativeProposerDto;
import com.everyones.lawmaking.common.dto.response.BillListResponse;
import com.everyones.lawmaking.common.dto.response.PaginationResponse;
import com.everyones.lawmaking.common.dto.response.SearchBillResponse;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;
import org.springframework.util.StringUtils;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record BillCardDto(
        @JsonIgnoreProperties("summary") BillInfoDto billInfoDto,
        List<RepresentativeProposerDto> representativeProposerDtoList,
        int publicProposerCount,
        boolean hasOriginalSummary,
        boolean isBookMark,
        @JsonInclude(JsonInclude.Include.NON_NULL) BillDto.HotActivity hotActivity
) {
    public static BillCardDto from(BillDto bill) {
        return new BillCardDto(
                bill.getBillInfoDto(),
                bill.getRepresentativeProposerDtoList(),
                bill.getPublicProposerDtoList().size(),
                StringUtils.hasText(bill.getBillInfoDto().getSummary()),
                bill.getIsBookMark(),
                bill.getHotActivity()
        );
    }

    public static List<BillCardDto> list(List<BillDto> bills) {
        return bills.stream().map(BillCardDto::from).toList();
    }

    public static Page page(BillListResponse response) {
        return new Page(response.getPaginationResponse(), list(response.getBillList()));
    }

    public static SearchPage searchPage(SearchBillResponse response) {
        return new SearchPage(list(response.getSearchResponse()), response.getPaginationResponse());
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Page(PaginationResponse paginationResponse, List<BillCardDto> billList) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record SearchPage(List<BillCardDto> searchResponse, PaginationResponse paginationResponse) {}
}
