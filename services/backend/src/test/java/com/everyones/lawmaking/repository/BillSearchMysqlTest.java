package com.everyones.lawmaking.repository;

import com.everyones.lawmaking.common.dto.BillDetailInfo;
import com.everyones.lawmaking.domain.entity.Bill;
import com.everyones.lawmaking.domain.entity.BillTimeline;
import com.everyones.lawmaking.domain.entity.IngestStatusType;
import com.everyones.lawmaking.domain.entity.Party;
import com.everyones.lawmaking.domain.entity.Congressman;
import com.everyones.lawmaking.global.util.SearchQuery;
import com.everyones.lawmaking.service.StatisticsService;
import com.everyones.lawmaking.service.BillService;
import com.everyones.lawmaking.service.PartyService;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
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
@Import(CongressmanRepositoryCustom.class)
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfEnvironmentVariable(named = "LAWDIGEST_MYSQL_TEST_URL", matches = ".+")
class BillSearchMysqlTest {
    @Autowired private BillRepository repository;
    @Autowired private BillReportRepository reports;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PartyRepository parties;
    @Autowired private CongressmanRepository congressmen;
    @Autowired private CongressmanRepositoryCustom rankings;
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
        jdbc.update("DELETE FROM RepresentativeProposer");
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

    @Test
    void categorySurfacesAndTimelineShareCurrentAssemblyScope() {
        jdbc.update("UPDATE Bill SET category = ?, bill_result = ?, stage = ? WHERE bill_id = ?",
                "economy", "원안가결", "본회의 심의", "exact");
        jdbc.update("UPDATE Bill SET category = ?, stage = ? WHERE bill_id = ?",
                "economy", "공포", "body");
        jdbc.update("UPDATE Bill SET bill_result = ? WHERE bill_id = ?", "수정가결 원안가결", "other");
        repository.saveAndFlush(Bill.builder().id("previous").billNumber(19).assemblyNumber(21)
                .billName("이전 대수").category("economy").billResult("수정가결")
                .ingestStatus(IngestStatusType.READY).build());
        repository.saveAndFlush(Bill.builder().id("staged").billNumber(20).assemblyNumber(22)
                .billName("아직 검증되지 않음").category("economy").billResult("수정가결")
                .ingestStatus(IngestStatusType.PENDING).build());

        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            var bills = new BillService(repository, statistics);
            var stats = new StatisticsService(statistics, timelines);
            var page = bills.getBillListByCategory(PageRequest.of(0, 10), "economy");
            assertThat(page.getBillList()).extracting(b -> b.getBillInfoDto().getBillId())
                    .containsExactly("body", "exact");
            assertThat(bills.getCategoryCounts()).singleElement().satisfies(category ->
                    assertThat(category.getCount()).isEqualTo(2));
            assertThat(stats.getBillCountByCategory()).singleElement().satisfies(category ->
                    assertThat(category.getCount()).isEqualTo(2));
            var timeline = bills.getBillStateCount();
            assertThat(timeline.getPassedCount()).isEqualTo(1).isEqualTo(stats.getOverview().getPassedCount());
            assertThat(timeline.getTreatmentCount()).isEqualTo(2);
            assertThat(stats.getResultBreakdown()).extracting(result -> result.getResult())
                    .containsExactlyInAnyOrder("원안가결", "결과 기록 없음", "결과 확인 필요");
        });
    }

    @Test
    void activeRosterDefinesSeatsAndCurrentReadyBillsDefineRankings() {
        var independent = parties.saveAndFlush(Party.builder().name("무소속").districtCongressmanCount(12).build());
        congressmen.saveAndFlush(Congressman.builder().id("reelected").name("가의원").state(true)
                .assemblyNumber(21).party(independent).district("비례대표").build());
        congressmen.saveAndFlush(Congressman.builder().id("zero").name("나의원").state(true)
                .assemblyNumber(22).party(independent).build());
        congressmen.saveAndFlush(Congressman.builder().id("inactive").name("다의원").state(false)
                .assemblyNumber(22).party(independent).district("서울").build());
        congressmen.saveAndFlush(Congressman.builder().id("unassigned").name("라의원").state(true)
                .assemblyNumber(22).district("서울").build());
        var firstParty = parties.saveAndFlush(Party.builder().name("첫 정당").build());
        var secondParty = parties.saveAndFlush(Party.builder().name("둘째 정당").build());
        congressmen.saveAndFlush(Congressman.builder().id("party-one").name("마의원").state(true)
                .assemblyNumber(22).party(firstParty).district("서울").build());
        congressmen.saveAndFlush(Congressman.builder().id("party-two").name("바의원").state(true)
                .assemblyNumber(22).party(secondParty).district("서울").build());
        jdbc.update("UPDATE Bill SET assembly_number = 21 WHERE bill_id = 'body'");
        jdbc.update("UPDATE Bill SET ingest_status = 'PENDING' WHERE bill_id = 'other'");
        jdbc.update("""
                INSERT INTO RepresentativeProposer (bill_id, congressman_id, party_id)
                VALUES ('exact', 'reelected', ?), ('body', 'reelected', ?), ('other', 'reelected', ?)
                """, independent.getId(), independent.getId(), independent.getId());

        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            var partyService = new PartyService(parties);
            var detail = partyService.getPartyById(independent.getId());
            var memberList = congressmen.findByPartyId(independent.getId()).getContent();
            assertThat(detail.getTotalCongressmanCount()).isEqualTo(5);
            assertThat(partyService.getPartyById(firstParty.getId()).getParliamentaryRank()).isEqualTo(1);
            assertThat(partyService.getPartyById(secondParty.getId()).getParliamentaryRank()).isEqualTo(1);
            assertThat(detail.getParliamentaryRank()).isNull();
            assertThat(detail.getDistrictCongressmanCount()).isZero();
            assertThat(detail.getProportionalCongressmanCount()).isEqualTo(1);
            assertThat(detail.getUnclassifiedCongressmanCount()).isEqualTo(1);
            assertThat(memberList).hasSize(2);
            assertThat(partyService.getParliamentaryParty()).extracting(r -> r.getCongressmanCount())
                    .containsExactly(2L, 1L, 1L, 1L);
            assertThat(rankings.findCongressmanRanking(independent.getId(), 0, 10)).satisfiesExactly(
                    member -> {
                        assertThat(member.getCongressmanId()).isEqualTo("reelected");
                        assertThat(member.getProposeCount()).isEqualTo(1);
                    },
                    member -> {
                        assertThat(member.getCongressmanId()).isEqualTo("zero");
                        assertThat(member.getProposeCount()).isZero();
                    });
            assertThat(rankings.findCongressmanRanking(null, 0, 10))
                    .hasSize(5)
                    .anySatisfy(member -> {
                        assertThat(member.getCongressmanId()).isEqualTo("unassigned");
                        assertThat(member.getPartyId()).isZero();
                    });
        });
    }

    @Test
    void reportFeedShowsPublishedReportsOnlyAndPaginatesByPublication() {
        jdbc.update("UPDATE Bill SET gpt_summary = ? WHERE bill_id = ?", "기존 AI 요약", "body");
        repository.saveAndFlush(Bill.builder().id("pending-report").billNumber(22).assemblyNumber(22)
                .billName("검증 대기").ingestStatus(IngestStatusType.PENDING).build());
        jdbc.update("""
                INSERT INTO BillReport (bill_id, title, markdown, published_at)
                VALUES ('exact', '첫 리포트', '## 쉬운 요약', '2026-10-31 00:00:00'),
                       ('other', '새 리포트', '## 주요 내용', '2026-11-01 00:00:00'),
                       ('pending-report', '비공개 리포트', '본문', '2026-11-03 00:00:00')
                """);

        var first = reports.findPublished(PageRequest.of(0, 1));
        var second = reports.findPublished(PageRequest.of(1, 1));
        assertThat(first.getContent()).singleElement().satisfies(report ->
                assertThat(report.billId()).isEqualTo("other"));
        assertThat(first.hasNext()).isTrue();
        assertThat(second.getContent()).singleElement().satisfies(report ->
                assertThat(report.billId()).isEqualTo("exact"));
        assertThat(second.hasNext()).isFalse();
        assertThat(reports.findPublishedByBillId("body")).isEmpty();
        assertThat(reports.findPublishedByBillId("pending-report")).isEmpty();
        assertThat(reports.findPublishedByBillId("exact")).get()
                .satisfies(report -> assertThat(report.getMarkdown()).isEqualTo("## 쉬운 요약"));
    }

    private void insert(String id, int number, String name, String date, String searchText) {
        repository.saveAndFlush(Bill.builder().id(id).billNumber(number).assemblyNumber(22)
                .billName(name).title(name).proposeDate(LocalDate.parse(date)).ingestStatus(IngestStatusType.READY).build());
        jdbc.update("INSERT INTO BillSearchDocument(bill_id, search_text) VALUES (?, ?)", id, searchText);
    }
}
