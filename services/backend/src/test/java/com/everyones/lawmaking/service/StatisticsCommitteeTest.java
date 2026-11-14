package com.everyones.lawmaking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.everyones.lawmaking.common.dto.CommitteeCountDto;
import com.everyones.lawmaking.repository.BillTimelineRepository;
import com.everyones.lawmaking.repository.StatisticsRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class StatisticsCommitteeTest {

    @Test
    void committeeCountsMergeFormerNamesAndReorder() {
        var repository = mock(StatisticsRepository.class);
        when(repository.findBillCountByCommittee(anyInt())).thenReturn(List.of(
                new CommitteeCountDto("행정안전위원회", 2288L, 92L),
                new CommitteeCountDto("재정경제기획위원회", 899L, 23L),
                new CommitteeCountDto("기획재정위원회", 735L, 18L),
                new CommitteeCountDto("-", 441L, 420L)));

        var result = new StatisticsService(repository, mock(BillTimelineRepository.class)).getBillCountByCommittee();

        assertThat(result).extracting(CommitteeCountDto::getCommittee)
                .containsExactly("행정안전위원회", "재정경제기획위원회");
        assertThat(result.get(1).getCount()).isEqualTo(1634);
        assertThat(result.get(1).getPassedCount()).isEqualTo(41);
    }
}
