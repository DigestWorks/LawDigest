package com.everyones.lawmaking.controller;

import com.everyones.lawmaking.common.dto.report.BillReportCard;
import com.everyones.lawmaking.global.BaseResponse;
import com.everyones.lawmaking.common.dto.response.PaginationResponse;
import com.everyones.lawmaking.repository.BillReportRepository;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/reports")
@RequiredArgsConstructor
public class BillReportController {
    private final BillReportRepository reports;

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record ReportPage(List<BillReportCard> reportList, PaginationResponse paginationResponse) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record ReportDetail(BillReportCard report, String markdown) {}

    @GetMapping
    public ResponseEntity<BaseResponse<ReportPage>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        if (page < 0 || size < 1 || size > 30) return ResponseEntity.badRequest().build();
        var slice = reports.findPublished(PageRequest.of(page, size));
        return ResponseEntity.ok(BaseResponse.ok(new ReportPage(slice.getContent(), PaginationResponse.from(slice))));
    }

    @GetMapping("/{billId}")
    public ResponseEntity<BaseResponse<ReportDetail>> detail(@PathVariable String billId) {
        return reports.findPublishedByBillId(billId).map(report -> {
            var bill = report.getBill();
            var card = new BillReportCard(report.getBillId(), report.getTitle(), bill.getBillName(),
                    bill.getBillNumber(), bill.getAssemblyNumber(), report.getPublishedAt());
            return ResponseEntity.ok(BaseResponse.ok(new ReportDetail(card, report.getMarkdown())));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
