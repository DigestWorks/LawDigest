package com.everyones.lawmaking.common.dto.response;

import com.everyones.lawmaking.global.constant.BillInfoConstant;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

@Getter
@JsonNaming(value = PropertyNamingStrategies.SnakeCaseStrategy.class)
public class BillStateCountResponse {

    @Schema(name = "국회 개원으로부터 경과한 날")
    private final Long daysSinceOpening;
    @Schema(name = "접수 법안")
    private final Long receiptCount;
    @Schema(description = "위원회 심사 이상에 도달한 법안")
    private final Long treatmentCount;
    @Schema(description = "원안가결 또는 수정가결이 기록된 법안")
    private final Long passedCount;

    public BillStateCountResponse(long receiptCount, long treatmentCount, long passedCount) {
        this.daysSinceOpening = BillInfoConstant.getDaysSinceOpening();
        this.receiptCount = receiptCount;
        this.treatmentCount = treatmentCount;
        this.passedCount = passedCount;
    }

}
