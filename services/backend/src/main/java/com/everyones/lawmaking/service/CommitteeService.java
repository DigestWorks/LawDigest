package com.everyones.lawmaking.service;

import com.everyones.lawmaking.common.dto.committee.CommitteeBillStatsDto;
import com.everyones.lawmaking.common.dto.committee.CommitteeDetailResponse;
import com.everyones.lawmaking.common.dto.committee.CommitteeMemberDto;
import com.everyones.lawmaking.common.dto.committee.CommitteeSummaryDto;
import com.everyones.lawmaking.common.dto.response.BillListResponse;
import com.everyones.lawmaking.domain.entity.Congressman;
import com.everyones.lawmaking.global.constant.BillInfoConstant;
import com.everyones.lawmaking.global.constant.CommitteeNames;
import com.everyones.lawmaking.global.error.CommitteeException;
import com.everyones.lawmaking.global.util.AuthenticationUtil;
import com.everyones.lawmaking.repository.BillRepository;
import com.everyones.lawmaking.repository.CongressmanRepository;
import com.everyones.lawmaking.repository.StatisticsRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 위원회 목록·상세·소관 법안.
 *
 * <p>위원회는 별도 테이블이 없다. 법안의 소관 위원회 표기와 현직 의원의 소속 위원회 표기를 합쳐 만든다.
 * 이전 명칭은 {@link CommitteeNames}로 현재 명칭에 합산한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommitteeService {

    private static final String NAME_KEY = "name";

    private final StatisticsRepository statisticsRepository;
    private final CongressmanRepository congressmanRepository;
    private final BillRepository billRepository;

    public List<CommitteeSummaryDto> getCommittees() {
        var stats = mergedStats();
        var members = membersByCommittee();
        var names = new LinkedHashSet<String>();
        names.addAll(stats.keySet());
        names.addAll(members.keySet());
        return names.stream()
                .map(name -> {
                    var stat = stats.getOrDefault(name, Stat.EMPTY);
                    return CommitteeSummaryDto.builder()
                            .name(name)
                            .type(CommitteeNames.typeOf(name))
                            .billCount(stat.count)
                            .passedCount(stat.passed)
                            .pendingCount(stat.pending)
                            .memberCount(members.getOrDefault(name, List.of()).size())
                            .build();
                })
                .sorted(Comparator.comparingLong(CommitteeSummaryDto::getBillCount).reversed()
                        .thenComparing(CommitteeSummaryDto::getName))
                .toList();
    }

    public CommitteeDetailResponse getCommittee(String requestedName) {
        var name = resolve(requestedName);
        var stat = mergedStats().getOrDefault(name, Stat.EMPTY);
        var members = membersByCommittee().getOrDefault(name, List.of());
        if (stat == Stat.EMPTY && members.isEmpty()) {
            throw new CommitteeException.CommitteeNotFound(Map.of(NAME_KEY, requestedName));
        }
        return CommitteeDetailResponse.builder()
                .name(name)
                .type(CommitteeNames.typeOf(name))
                .formerNames(CommitteeNames.formerNamesOf(name))
                .billCount(stat.count)
                .passedCount(stat.passed)
                .pendingCount(stat.pending)
                .members(sortByPartySize(members).stream().map(CommitteeMemberDto::from).toList())
                .build();
    }

    public BillListResponse getBills(String requestedName, Pageable pageable) {
        var name = resolve(requestedName);
        return billRepository.findBillByCommitteeAndPage(
                pageable, AuthenticationUtil.getUserId(), CommitteeNames.namesOf(name), assembly());
    }

    private String resolve(String requestedName) {
        if (!CommitteeNames.isCommittee(requestedName)) {
            throw new CommitteeException.CommitteeNotFound(Map.of(NAME_KEY, String.valueOf(requestedName)));
        }
        return CommitteeNames.canonical(requestedName);
    }

    private Map<String, Stat> mergedStats() {
        var merged = new HashMap<String, Stat>();
        for (CommitteeBillStatsDto row : statisticsRepository.findCommitteeBillStats(assembly())) {
            if (!CommitteeNames.isCommittee(row.getCommittee())) {
                continue;
            }
            merged.merge(CommitteeNames.canonical(row.getCommittee()),
                    new Stat(row.getCount(), row.getPassedCount(), row.getPendingCount()), Stat::plus);
        }
        return merged;
    }

    private Map<String, List<Congressman>> membersByCommittee() {
        var byCommittee = new HashMap<String, List<Congressman>>();
        for (Congressman congressman : congressmanRepository.findActiveWithParty()) {
            for (String committee : CommitteeNames.splitMemberships(congressman.getCommits())) {
                byCommittee.computeIfAbsent(committee, key -> new ArrayList<>()).add(congressman);
            }
        }
        return byCommittee;
    }

    /** 위원이 많은 정당부터, 같은 정당 안에서는 이름순. */
    private static List<Congressman> sortByPartySize(List<Congressman> members) {
        var partySize = new HashMap<String, Integer>();
        members.forEach(member -> partySize.merge(partyKey(member), 1, Integer::sum));
        return members.stream()
                .sorted(Comparator.<Congressman>comparingInt(member -> -partySize.get(partyKey(member)))
                        .thenComparing(CommitteeService::partyKey)
                        .thenComparing(Congressman::getName))
                .toList();
    }

    private static String partyKey(Congressman congressman) {
        return congressman.getParty() == null ? "" : congressman.getParty().getName();
    }

    private static int assembly() {
        return BillInfoConstant.getCurrentAssemblyNumber();
    }

    private record Stat(long count, long passed, long pending) {
        static final Stat EMPTY = new Stat(0, 0, 0);

        Stat plus(Stat other) {
            return new Stat(count + other.count, passed + other.passed, pending + other.pending);
        }
    }
}
