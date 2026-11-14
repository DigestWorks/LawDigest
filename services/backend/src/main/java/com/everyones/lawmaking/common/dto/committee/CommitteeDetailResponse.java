package com.everyones.lawmaking.common.dto.committee;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

/** 위원회 상세: 법안 집계, 이전 명칭, 위원 명단. */
@Getter
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class CommitteeDetailResponse {

    private final String name;
    private final String type;
    private final List<String> formerNames;
    private final long billCount;
    private final long passedCount;
    private final long pendingCount;
    private final List<CommitteeMemberDto> members;
}
