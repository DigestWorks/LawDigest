package com.everyones.lawmaking.controller;

import com.everyones.lawmaking.common.dto.bill.BillCardDto;
import com.everyones.lawmaking.common.dto.committee.CommitteeDetailResponse;
import com.everyones.lawmaking.common.dto.committee.CommitteeSummaryDto;
import com.everyones.lawmaking.common.dto.response.BillListResponse;
import com.everyones.lawmaking.global.BaseResponse;
import com.everyones.lawmaking.service.CommitteeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RequiredArgsConstructor
@RestController
@RequestMapping("/v1/committee")
@Tag(name = "위원회 조회 API", description = "제22대 국회 위원회의 법안 집계, 위원 명단, 소관 법안을 가져오는 API입니다.")
public class CommitteeController {

    private static final int MAX_PAGE_SIZE = 50;

    private final CommitteeService committeeService;

    @Operation(summary = "위원회 목록", description = "위원회별 접수·가결·계류 법안 수와 현직 위원 수를 제공합니다. 이전 명칭의 법안은 현재 명칭에 합산합니다.")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "조회 성공"))
    @GetMapping("/list")
    public BaseResponse<List<CommitteeSummaryDto>> getCommittees() {
        return BaseResponse.ok(committeeService.getCommittees());
    }

    @Operation(summary = "위원회 상세", description = "위원회 법안 집계, 이전 명칭, 현직 위원 명단을 제공합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "404", description = "법안도 위원도 없는 위원회 이름"),
    })
    @GetMapping("/detail")
    public BaseResponse<CommitteeDetailResponse> getCommittee(
            @Parameter(example = "보건복지위원회") @RequestParam("name") String name) {
        return BaseResponse.ok(committeeService.getCommittee(name));
    }

    @Operation(summary = "위원회 소관 법안", description = "위원회(이전 명칭 포함) 소관 법안을 최신 발의순으로 제공합니다.")
    @ApiResponses(@ApiResponse(responseCode = "200", description = "조회 성공"))
    @GetMapping("/bill")
    public BaseResponse<?> getBills(
            @Parameter(example = "보건복지위원회") @RequestParam("name") String name,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            @RequestParam(name = "compact", defaultValue = "false") boolean compact) {
        var pageSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        var result = committeeService.getBills(name, PageRequest.of(Math.max(page, 0), pageSize));
        var response = limitToRequestedSize(result, pageSize);
        return BaseResponse.ok(compact ? BillCardDto.page(response) : response);
    }

    private BillListResponse limitToRequestedSize(BillListResponse response, int size) {
        if (response.getBillList().size() <= size) {
            return response;
        }
        return BillListResponse.of(response.getPaginationResponse(), response.getBillList().subList(0, size));
    }
}
