package com.everyones.lawmaking.common.dto.committee;

import lombok.Getter;

/** 위원회 표기 하나의 법안 집계(접수·가결·계류). */
@Getter
public class CommitteeBillStatsDto {

    private final String committee;
    private final long count;
    private final long passedCount;
    private final long pendingCount;

    public CommitteeBillStatsDto(String committee, Long count, Long passedCount, Long pendingCount) {
        this.committee = committee;
        this.count = count == null ? 0L : count;
        this.passedCount = passedCount == null ? 0L : passedCount;
        this.pendingCount = pendingCount == null ? 0L : pendingCount;
    }
}
