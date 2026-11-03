package com.everyones.lawmaking.common.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 기록된 법안 처리 결과별 집계. */
@Getter
@NoArgsConstructor
@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ResultBreakdownDto {

    private String result;
    private long count;

    public ResultBreakdownDto(String result, Long count) {
        this.result = result;
        this.count = count == null ? 0L : count;
    }
}
