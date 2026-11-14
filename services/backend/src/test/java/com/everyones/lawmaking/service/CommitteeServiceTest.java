package com.everyones.lawmaking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.everyones.lawmaking.common.dto.committee.CommitteeBillStatsDto;
import com.everyones.lawmaking.common.dto.committee.CommitteeMemberDto;
import com.everyones.lawmaking.common.dto.committee.CommitteeSummaryDto;
import com.everyones.lawmaking.domain.entity.Congressman;
import com.everyones.lawmaking.domain.entity.Party;
import com.everyones.lawmaking.global.constant.CommitteeNames;
import com.everyones.lawmaking.global.error.CommitteeException;
import com.everyones.lawmaking.repository.BillRepository;
import com.everyones.lawmaking.repository.CongressmanRepository;
import com.everyones.lawmaking.repository.StatisticsRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

class CommitteeServiceTest {

    private StatisticsRepository statisticsRepository;
    private CongressmanRepository congressmanRepository;
    private BillRepository billRepository;
    private CommitteeService service;

    private final Party ruling = Party.builder().id(1).name("가당").build();
    private final Party opposition = Party.builder().id(2).name("나당").build();

    @BeforeEach
    void setUp() {
        statisticsRepository = mock(StatisticsRepository.class);
        congressmanRepository = mock(CongressmanRepository.class);
        billRepository = mock(BillRepository.class);
        service = new CommitteeService(statisticsRepository, congressmanRepository, billRepository);
        when(statisticsRepository.findCommitteeBillStats(anyInt())).thenReturn(List.of(
                new CommitteeBillStatsDto("재정경제기획위원회", 899L, 23L, 800L),
                new CommitteeBillStatsDto("기획재정위원회", 735L, 18L, 600L),
                new CommitteeBillStatsDto("환경노동위원회", 648L, 4L, 600L),
                new CommitteeBillStatsDto("-", 441L, 420L, 0L),
                new CommitteeBillStatsDto("본회의", 3L, 3L, 0L)));
        when(congressmanRepository.findActiveWithParty()).thenReturn(List.of(
                member("A", "갑", ruling, "기후에너지환경노동위원회, 예산결산특별위원회"),
                member("B", "을", opposition, "기후에너지환경노동위원회"),
                member("C", "병", ruling, "재정경제기획위원회"),
                member("D", "정", ruling, "기후에너지환경노동위원회")));
    }

    @Test
    void listMergesFormerNamesAndDropsNonCommitteeValues() {
        var committees = service.getCommittees();

        assertThat(committees).extracting(CommitteeSummaryDto::getName)
                .containsExactly("재정경제기획위원회", "기후에너지환경노동위원회", "예산결산특별위원회");
        var finance = committees.get(0);
        assertThat(finance.getBillCount()).isEqualTo(1634);
        assertThat(finance.getPassedCount()).isEqualTo(41);
        assertThat(finance.getPendingCount()).isEqualTo(1400);
        assertThat(finance.getMemberCount()).isEqualTo(1);
        assertThat(committees.get(2).getType()).isEqualTo(CommitteeNames.SPECIAL);
        assertThat(committees.get(2).getBillCount()).isZero();
    }

    @Test
    void membershipNeedsExactNameNotSubstring() {
        when(congressmanRepository.findActiveWithParty()).thenReturn(List.of(
                member("A", "갑", ruling, "기후에너지환경노동위원회")));

        var detail = service.getCommittee("기후에너지환경노동위원회");

        assertThat(detail.getMembers()).hasSize(1);
        assertThat(detail.getBillCount()).isEqualTo(648);
        assertThat(detail.getFormerNames()).containsExactly("환경노동위원회");
    }

    @Test
    void detailAcceptsFormerNameAndGroupsMembersByLargestParty() {
        var detail = service.getCommittee("환경노동위원회");

        assertThat(detail.getName()).isEqualTo("기후에너지환경노동위원회");
        assertThat(detail.getMembers()).extracting(CommitteeMemberDto::getCongressmanName)
                .containsExactly("갑", "정", "을");
    }

    @Test
    void unknownOrNonCommitteeNameIsNotFound() {
        assertThatThrownBy(() -> service.getCommittee("없는위원회"))
                .isInstanceOf(CommitteeException.CommitteeNotFound.class);
        assertThatThrownBy(() -> service.getCommittee("본회의"))
                .isInstanceOf(CommitteeException.CommitteeNotFound.class);
    }

    @Test
    void billsQueryIncludesFormerNames() {
        var page = PageRequest.of(0, 10);
        service.getBills("재정경제기획위원회", page);

        verify(billRepository).findBillByCommitteeAndPage(
                eq(page), any(), eq(List.of("재정경제기획위원회", "기획재정위원회")), anyInt());
    }

    private static Congressman member(String id, String name, Party party, String commits) {
        return Congressman.builder().id(id).name(name).party(party).commits(commits).build();
    }
}
