package com.everyones.lawmaking.repository;

import com.everyones.lawmaking.common.dto.BillDetailInfo;
import com.everyones.lawmaking.domain.entity.Bill;
import com.everyones.lawmaking.domain.entity.BillTimeline;
import com.everyones.lawmaking.domain.entity.IngestStatusType;
import com.everyones.lawmaking.domain.entity.Party;
import com.everyones.lawmaking.domain.entity.Congressman;
import com.everyones.lawmaking.global.util.SearchQuery;
import com.everyones.lawmaking.service.StatisticsService;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/** 격리된 로컬 MySQL DB에서 운영과 같은 ngram FULLTEXT 쿼리를 실행한다. */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfEnvironmentVariable(named = "LAWDIGEST_MYSQL_TEST_URL", matches = ".+")
class BillSearchMysqlTest {
    @Autowired private BillRepository repository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PartyRepository parties;
    @Autowired private CongressmanRepository congressmen;
    @Autowired private StatisticsRepository statistics;
    @Autowired private BillTimelineRepository timelines;
    @Autowired private PlatformTransactionManager transactions;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        String url = System.getenv("LAWDIGEST_MYSQL_TEST_URL");
        if (url == null || !url.matches("jdbc:mysql://127\\.0\\.0\\.1:[0-9]+/lawdigest_polish(?:\\?.*)?")) {
            throw new IllegalArgumentException("격리된 로컬 lawdigest_polish DB만 사용할 수 있습니다.");
        }
        properties.add("spring.datasource.url", () -> url);
        properties.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
        properties.add("spring.datasource.username", () -> "root");
        properties.add("spring.datasource.password", () -> "");
        properties.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.MySQLDialect");
        properties.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @BeforeEach
    void fixture() {
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS BillSearchDocument (
                  bill_id VARCHAR(255) PRIMARY KEY, search_text LONGTEXT,
                  FULLTEXT KEY search_index (search_text) WITH PARSER ngram
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """);
        jdbc.update("DELETE FROM BillSearchDocument");
        timelines.deleteAll();
        repository.deleteAll();
        congressmen.deleteAll();
        parties.deleteAll();
        insert("exact", 1, "의료법 일부개정법률안(대안)", "2025-01-01", "의료법 일부개정법률안 대안 의료법 개정안");
        insert("body", 2, "지원법", "2026-11-01", "의료법 개정안 지원 체계");
        insert("other", 3, "방송법", "2026-11-02", "방송 체계 지원");
    }

    @Test
    void exactNameOutranksNewerBodyMatchAndPaginationEnds() {
        var query = SearchQuery.from("의료법");
        var first = repository.findBillByKeyword(PageRequest.of(0, 1), query.text(),
                SearchQuery.escapeLike(query.text()), query.expression());
        var second = repository.findBillByKeyword(PageRequest.of(1, 1), query.text(),
                SearchQuery.escapeLike(query.text()), query.expression());
        assertThat(first.getContent()).containsExactly("exact");
        assertThat(first.hasNext()).isTrue();
        assertThat(second.getContent()).containsExactly("body");
        assertThat(second.hasNext()).isFalse();
    }

    @Test
    void ordinaryPunctuationDoesNotBecomeBooleanOperators() {
        for (String input : new String[]{"의료법 일부개정법률안(대안)", "소방+", "5·18", "R&D", "소방~", "소방(주)"}) {
            var query = SearchQuery.from(input);
            var result = repository.findBillByKeyword(PageRequest.of(0, 10), query.text(),
                    SearchQuery.escapeLike(query.text()), query.expression());
            if (input.contains("대안")) {
                assertThat(result.getContent()).containsExactly("exact");
            }
        }
    }

    @Test
    void relatedBillsUseStableDateOrderAndPageBoundaries() {
        String name = "의료법 일부개정법률안(대안)";
        insert("same-old", 4, name, "2024-01-01", name);
        insert("same-new", 5, name, "2026-08-01", name);
        var first = repository.findSimilarBills(name, "exact", PageRequest.of(0, 1));
        var last = repository.findSimilarBills(name, "exact", PageRequest.of(1, 1));
        assertThat(first.getContent()).extracting(Bill::getId).containsExactly("same-new");
        assertThat(first.getTotalElements()).isEqualTo(2);
        assertThat(last.getContent()).extracting(Bill::getId).containsExactly("same-old");
        assertThat(last.hasNext()).isFalse();
    }

    @Test
    void personAndPartyWildcardsAreSearchedLiterally() {
        var normal = parties.saveAndFlush(Party.builder().name("일반정당").build());
        parties.saveAndFlush(Party.builder().name("기호%정당").build());
        congressmen.saveAndFlush(Congressman.builder().id("normal").name("김민수").state(true).party(normal).assemblyNumber(22).build());
        congressmen.saveAndFlush(Congressman.builder().id("literal").name("김_민").state(true).party(normal).assemblyNumber(22).build());
        assertThat(parties.findBySearchWord(SearchQuery.escapeLike("%")))
                .extracting(Party::getName).containsExactly("기호%정당");
        assertThat(congressmen.findBySearchWord(SearchQuery.escapeLike("_")).getContent())
                .extracting(Congressman::getName).containsExactly("김_민");
    }

    @Test
    void freshnessIncludesUnsummarizedReadyBillsAndKeepsTimelineDateSeparate() {
        repository.saveAndFlush(Bill.builder().id("raw-new").billNumber(10).assemblyNumber(22)
                .billName("원문만 수집된 법안").summary("제안 이유와 주요 내용").gptSummary("   ")
                .proposeDate(LocalDate.of(2026, 11, 3)).ingestStatus(IngestStatusType.READY).build());
        repository.saveAndFlush(Bill.builder().id("pending-new").billNumber(11).assemblyNumber(22)
                .billName("검토 중인 법안").proposeDate(LocalDate.of(2026, 11, 4))
                .ingestStatus(IngestStatusType.PENDING).build());
        repository.saveAndFlush(Bill.builder().id("old-assembly").billNumber(12).assemblyNumber(21)
                .billName("이전 대수 법안").proposeDate(LocalDate.of(2026, 11, 5))
                .ingestStatus(IngestStatusType.READY).build());
        jdbc.update("UPDATE Bill SET gpt_summary = ? WHERE bill_id = ?", "기존 AI 요약", "exact");
        timelines.saveAndFlush(BillTimeline.builder().bill(repository.findById("exact").orElseThrow()).billTimelineStage("위원회 심사")
                .statusUpdateDate(LocalDate.of(2026, 3, 27)).build());

        var result = new StatisticsService(statistics, timelines).getFreshness();
        assertThat(result.assemblyNumber()).isEqualTo(22);
        assertThat(result.latestProposalDate()).isEqualTo(LocalDate.of(2026, 11, 3));
        assertThat(result.latestTimelineDate()).isEqualTo(LocalDate.of(2026, 3, 27));
        assertThat(result.readyBillCount()).isEqualTo(4);
        assertThat(result.pendingSummaryCount()).isEqualTo(3);

        var detail = new TransactionTemplate(transactions).execute(status ->
                BillDetailInfo.from(repository.findById("exact").orElseThrow()));
        assertThat(detail.getBillNumber()).isEqualTo(1);
        assertThat(detail.getStageDates()).containsExactly(
                new BillDetailInfo.StageDate("위원회 심사", LocalDate.of(2026, 3, 27)));
    }

    private void insert(String id, int number, String name, String date, String searchText) {
        repository.saveAndFlush(Bill.builder().id(id).billNumber(number).assemblyNumber(22)
                .billName(name).title(name).proposeDate(LocalDate.parse(date)).ingestStatus(IngestStatusType.READY).build());
        jdbc.update("INSERT INTO BillSearchDocument(bill_id, search_text) VALUES (?, ?)", id, searchText);
    }
}
