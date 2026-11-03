package com.everyones.lawmaking.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class BillActivityRepository {
    private final JdbcTemplate jdbc;

    public record Score(String billId, long views, long scraps) {}

    public boolean incrementViews(String billId) {
        return jdbc.update("""
                UPDATE Bill SET viewCount = COALESCE(viewCount, 0) + 1
                WHERE bill_id = ? AND ingest_status = 'READY'
                """, billId) == 1;
    }

    public void recordView(String billId) {
        jdbc.update("""
                INSERT INTO BillViewActivity (bill_id, viewed_at, view_count)
                VALUES (?, UTC_TIMESTAMP(), 1)
                ON DUPLICATE KEY UPDATE view_count = view_count + 1
                """, billId);
    }

    public int currentViews(String billId) {
        return jdbc.queryForObject("SELECT viewCount FROM Bill WHERE bill_id = ?", Integer.class, billId);
    }

    public List<Score> findPopular(
            int assembly, LocalDateTime viewSince, LocalDateTime viewUntil,
            LocalDateTime scrapSince, LocalDateTime scrapUntil
    ) {
        return jdbc.query("""
                WITH activity AS (
                    SELECT bill_id, SUM(view_count) AS views, 0 AS scraps
                    FROM BillViewActivity
                    WHERE viewed_at >= ? AND viewed_at <= ?
                    GROUP BY bill_id
                    UNION ALL
                    SELECT bill_id, 0 AS views, COUNT(*) AS scraps
                    FROM BillLike
                    WHERE created_date >= ? AND created_date <= ?
                    GROUP BY bill_id
                )
                SELECT b.bill_id, SUM(a.views) AS recent_views, SUM(a.scraps) AS recent_scraps
                FROM activity a JOIN Bill b ON b.bill_id = a.bill_id
                WHERE b.assembly_number = ? AND b.ingest_status = 'READY'
                GROUP BY b.bill_id, b.propose_date
                ORDER BY SUM(a.views) + SUM(a.scraps) DESC, b.propose_date DESC, b.bill_id DESC
                LIMIT 10
                """, (row, index) -> new Score(row.getString("bill_id"),
                        row.getLong("recent_views"), row.getLong("recent_scraps")),
                viewSince, viewUntil, scrapSince, scrapUntil, assembly);
    }
}
