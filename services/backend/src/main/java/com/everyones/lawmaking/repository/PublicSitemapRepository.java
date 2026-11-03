package com.everyones.lawmaking.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class PublicSitemapRepository {
    public static final int PAGE_SIZE = 2000;
    public static final int MAX_PAGE = 1000;
    private final JdbcTemplate jdbc;

    public enum Kind {
        bills("b.bill_id", "FROM Bill b WHERE b.ingest_status = 'READY'"),
        reports("r.bill_id", "FROM BillReport r JOIN Bill b ON b.bill_id = r.bill_id WHERE b.ingest_status = 'READY'"),
        congressmen("congressman_id", "FROM Congressman"),
        parties("party_id", "FROM Party WHERE party_id > 0");

        private final String id;
        private final String from;

        Kind(String id, String from) {
            this.id = id;
            this.from = from;
        }
    }

    public long count(Kind kind) {
        return jdbc.queryForObject("SELECT COUNT(*) " + kind.from, Long.class);
    }

    public List<String> list(Kind kind, int page) {
        return jdbc.query(
                "SELECT " + kind.id + " " + kind.from + " ORDER BY " + kind.id + " LIMIT ? OFFSET ?",
                (row, index) -> row.getString(1), PAGE_SIZE, page * PAGE_SIZE);
    }
}
