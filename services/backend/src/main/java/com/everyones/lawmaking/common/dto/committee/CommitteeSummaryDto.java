package com.everyones.lawmaking.common.dto.committee;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Builder;
import lombok.Getter;

/** 위원회 목록 한 줄. */
@Getter
@Builder
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class CommitteeSummaryDto {

    private final String name;
    private final String type;
    private final long billCount;
    private final long passedCount;
    private final long pendingCount;
    private final int memberCount;
}
