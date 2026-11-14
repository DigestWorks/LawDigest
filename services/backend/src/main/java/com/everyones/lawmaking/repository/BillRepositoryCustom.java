package com.everyones.lawmaking.repository;

import com.everyones.lawmaking.common.dto.response.BillListResponse;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;

public interface BillRepositoryCustom {
    BillListResponse findBillWithDetailAndPage(Pageable pageable, Optional<Long> userIdOptional, String stage, String assembly);

    BillListResponse findBillByCategoryAndPage(Pageable pageable, Optional<Long> userIdOptional, String category, int assembly);

    BillListResponse findBillByCommitteeAndPage(Pageable pageable, Optional<Long> userIdOptional, List<String> committees, int assembly);

}
