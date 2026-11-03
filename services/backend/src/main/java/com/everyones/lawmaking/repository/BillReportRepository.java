package com.everyones.lawmaking.repository;

import com.everyones.lawmaking.common.dto.report.BillReportCard;
import com.everyones.lawmaking.domain.entity.BillReport;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BillReportRepository extends JpaRepository<BillReport, String> {
    String READY = "b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY";

    @Query("SELECT new com.everyones.lawmaking.common.dto.report.BillReportCard(" +
            "r.billId, r.title, b.billName, b.billNumber, b.assemblyNumber, r.publishedAt) " +
            "FROM BillReport r JOIN r.bill b WHERE " + READY +
            " ORDER BY r.publishedAt DESC, r.billId DESC")
    Slice<BillReportCard> findPublished(Pageable pageable);

    @Query("SELECT r FROM BillReport r JOIN FETCH r.bill b WHERE r.billId = :billId AND " + READY)
    Optional<BillReport> findPublishedByBillId(@Param("billId") String billId);
}
