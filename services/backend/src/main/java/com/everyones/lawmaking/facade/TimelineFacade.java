package com.everyones.lawmaking.facade;

import com.everyones.lawmaking.common.dto.BillOutlineDto;
import com.everyones.lawmaking.common.dto.CommitteeAuditDto;
import com.everyones.lawmaking.common.dto.PartyVoteDto;
import com.everyones.lawmaking.common.dto.PlenaryDto;
import com.everyones.lawmaking.common.dto.projection.PlenaryEvent;
import com.everyones.lawmaking.common.dto.response.BillTimelinePaginationResponse;
import com.everyones.lawmaking.common.dto.response.BillTimelineResponse;
import com.everyones.lawmaking.service.BillService;
import com.everyones.lawmaking.service.BillTimelineService;
import com.everyones.lawmaking.service.VotePartyService;
import com.everyones.lawmaking.service.VoteRecordService;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import com.everyones.lawmaking.domain.entity.Bill;
import com.everyones.lawmaking.domain.entity.VoteRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class TimelineFacade {
    private final BillTimelineService billTimelineService;
    private final BillService billService;
    private final VotePartyService votePartyService;
    private final VoteRecordService voteRecordService;

    @Transactional(readOnly = true)
    public BillTimelinePaginationResponse getTimeline(Pageable pageable) {
        var timelineDateList = billTimelineService.getDatePaging(pageable);
        var paginationResponse = com.everyones.lawmaking.common.dto.response.PaginationResponse.from(timelineDateList);
        List<BillTimelineResponse> timelineList = new ArrayList<>();
        for (LocalDate timelineDate : timelineDateList) {
            timelineList.add(getTimeline(timelineDate));
        }
        return BillTimelinePaginationResponse.of(paginationResponse, timelineList);
    }

    @Transactional(readOnly = true)
    public BillTimelineResponse getTimeline(LocalDate proposeDate) {
        var submittedBills = getSubmittedBills(proposeDate);
        var plenaryBills  = getPlenaryBills(proposeDate);
        var promulgationBills = getPromulgationBills(proposeDate);
        var committeeBills = getCommitteeBills(proposeDate);
        return BillTimelineResponse.of(proposeDate, submittedBills,plenaryBills, promulgationBills, committeeBills);
    }

    public List<BillOutlineDto> getSubmittedBills(LocalDate proposeDate) {
        var submittedBillIds = billTimelineService.getSubmittedBillIds(proposeDate);
        var bills = billService.findBillsWithPartiesByIds(submittedBillIds);
        return bills.stream()
                .map(BillOutlineDto::from)
                .toList();
    }
    public List<BillOutlineDto> getPromulgationBills(LocalDate localDate) {
        var promulgationBillIds = billTimelineService.findPromulgationBillIds(localDate);
        var bills = billService.findBillsWithPartiesByIds(promulgationBillIds);
        return bills.stream()
                .map(BillOutlineDto::from)
                .toList();
    }
    @Transactional(readOnly = true)
    public List<PlenaryDto> getPlenaryBills(LocalDate localDate) {
        var history = billTimelineService.findPlenaryHistoryForDate(localDate).stream()
                .collect(Collectors.groupingBy(PlenaryEvent::billId));
        if (history.isEmpty()) {
            return List.of();
        }
        var bills = billService.findBillsWithPartiesByIds(List.copyOf(history.keySet()));
        var ids = bills.stream().map(Bill::getId).toList();
        var records = voteRecordService.getRecordsForBills(ids).stream()
                .collect(Collectors.toMap(record -> record.getBill().getId(), Function.identity()));
        var parties = votePartyService.getPartyVotesForBills(ids).stream()
                .collect(Collectors.groupingBy(vote -> vote.getBill().getId(),
                        Collectors.mapping(PartyVoteDto::from, Collectors.toList())));
        return bills.stream().map(bill -> plenaryForDate(
                bill, history.get(bill.getId()), localDate,
                records.get(bill.getId()), parties.getOrDefault(bill.getId(), List.of()))).toList();
    }

    private PlenaryDto plenaryForDate(
            Bill bill, List<PlenaryEvent> history, LocalDate date,
            VoteRecord record, List<PartyVoteDto> partyVotes
    ) {
        var datedResults = history.stream().filter(event -> StringUtils.hasText(event.result())).toList();
        var results = datedResults.stream().filter(event -> date.equals(event.date()))
                .map(PlenaryEvent::result).distinct().toList();
        boolean singleEventDate = history.stream().allMatch(event -> date.equals(event.date()));
        boolean legacyResult = datedResults.isEmpty() && singleEventDate;
        String result = results.size() == 1 ? results.get(0) : legacyResult ? bill.getBillResult() : null;

        // Existing vote records are keyed by bill, so ambiguous dates cannot carry their totals.
        boolean singleResultDate = datedResults.stream().allMatch(event -> date.equals(event.date()));
        boolean matchesBillResult = !StringUtils.hasText(bill.getBillResult()) || Objects.equals(result, bill.getBillResult());
        boolean showVotes = legacyResult || (results.size() == 1 && singleResultDate && matchesBillResult);
        return PlenaryDto.of(bill, result, showVotes ? record : null, showVotes ? partyVotes : List.of());
    }

    public List<CommitteeAuditDto> getCommitteeBills(LocalDate proposeDate) {
        var committeeBillDtoList = billTimelineService.findCommitteesWithMultipleBillIds(proposeDate);
        var ids = committeeBillDtoList.stream()
                .flatMap(committee -> committee.getBillIds().stream()).distinct().toList();
        var outlines = billService.findBillsWithPartiesByIds(ids).stream()
                .collect(Collectors.toMap(Bill::getId, BillOutlineDto::from));
        return committeeBillDtoList.stream().map(committee -> {
            var bills = committee.getBillIds().stream().distinct()
                    .map(outlines::get).filter(Objects::nonNull).toList();
            return CommitteeAuditDto.of(committee.getCommitteeName(), bills);
        }).filter(committee -> committee.getBillCount() > 0).toList();
    }
}
