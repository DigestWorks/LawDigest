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
import com.everyones.lawmaking.service.BillTimelineService;
import com.everyones.lawmaking.service.VotePartyService;
import com.everyones.lawmaking.service.VoteRecordService;
import com.everyones.lawmaking.facade.TimelineFacade;
import java.util.List;
import java.time.LocalDate;
import java.util.Optional;
import java.time.LocalDateTime;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;
import java.nio.file.Files;
import java.nio.file.Path;
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
import static org.mockito.Mockito.*;

/** 격리된 로컬 MySQL DB에서 운영과 같은 기본 FULLTEXT 쿼리를 실행한다. */
@DataJpaTest
@Import({CongressmanRepositoryCustom.class, BillActivityRepository.class, PublicSitemapRepository.class})
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfEnvironmentVariable(named = "LAWDIGEST_MYSQL_TEST_URL", matches = ".+")
class BillSearchMysqlTest {
    @Autowired private BillRepository repository;
    @Autowired private BillReportRepository reports;
    @Autowired private PublicSitemapRepository publicSitemap;
    @Autowired private VoteRecordRepository voteRecords;
    @Autowired private VotePartyRepository voteParties;
    @Autowired private BillActivityRepository activity;
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
                  FULLTEXT KEY search_index (search_text)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                """);
        jdbc.update("DELETE FROM BillSearchDocument");
        timelines.deleteAll();
        jdbc.update("DELETE FROM RepresentativeProposer");
        jdbc.update("DELETE FROM BillLike");
        jdbc.update("DELETE FROM VoteParty");
        jdbc.update("DELETE FROM VoteRecord");
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
                SearchQuery.escapeLike(query.text()), query.expression(), query.billNumber());
        var second = repository.findBillByKeyword(PageRequest.of(1, 1), query.text(),
                SearchQuery.escapeLike(query.text()), query.expression(), query.billNumber());
        assertThat(first.getContent()).containsExactly("exact");
        assertThat(first.hasNext()).isTrue();
        assertThat(second.getContent()).containsExactly("body");
        assertThat(second.hasNext()).isFalse();
    }

    @Test
    void officialNamesRemainSearchableWithShortTokensAndWithoutSearchDocuments() {
        String name = "인공지능 및 데이터 기반 행정 활성화에 관한 법률 일부개정법률안";
        insert("indexed-official", 4, name, "2026-11-02", name);
        insert("raw-official", 5, name, "2026-11-03", name);
        insert("pending-official", 6, name, "2026-11-04", name);
        jdbc.update("DELETE FROM BillSearchDocument WHERE bill_id = 'raw-official'");
        jdbc.update("UPDATE Bill SET ingest_status = 'PENDING' WHERE bill_id = 'pending-official'");

        var query = SearchQuery.from(name);
        var first = repository.findBillByKeyword(PageRequest.of(0, 1), query.text(),
                SearchQuery.escapeLike(query.text()), query.expression(), query.billNumber());
        var second = repository.findBillByKeyword(PageRequest.of(1, 1), query.text(),
                SearchQuery.escapeLike(query.text()), query.expression(), query.billNumber());
        assertThat(first.getContent()).containsExactly("raw-official");
        assertThat(first.hasNext()).isTrue();
        assertThat(second.getContent()).containsExactly("indexed-official");
        assertThat(second.hasNext()).isFalse();
    }

    @Test
    void exactBillNumberOutranksBodyMatchAndIncludesUnindexedReadyBill() {
        insert("number-exact", 2219875, "형사소송법 일부개정법률안", "2026-07-09", "공식 원문");
        insert("number-mention", 2219876, "동명 법안", "2026-07-10", "2219875 참조");
        insert("number-pending", 2219877, "검증 대기", "2026-07-11", "미공개 원문");
        jdbc.update("DELETE FROM BillSearchDocument WHERE bill_id = 'number-exact'");
        jdbc.update("UPDATE Bill SET ingest_status = 'PENDING' WHERE bill_id = 'number-pending'");

        var number = SearchQuery.from("2219875");
        var first = repository.findBillByKeyword(PageRequest.of(0, 1), number.text(),
                SearchQuery.escapeLike(number.text()), number.expression(), number.billNumber());
        var second = repository.findBillByKeyword(PageRequest.of(1, 1), number.text(),
                SearchQuery.escapeLike(number.text()), number.expression(), number.billNumber());
        assertThat(first.getContent()).containsExactly("number-exact");
        assertThat(first.hasNext()).isTrue();
        assertThat(second.getContent()).containsExactly("number-mention");
        assertThat(second.hasNext()).isFalse();

        var decorated = SearchQuery.from("제 2219875 호");
        var decoratedResult = repository.findBillByKeyword(PageRequest.of(0, 1), decorated.text(),
                SearchQuery.escapeLike(decorated.text()), decorated.expression(), decorated.billNumber());
        assertThat(decoratedResult.getContent()).containsExactly("number-exact");

        var hidden = SearchQuery.from("2219877");
        assertThat(repository.findBillByKeyword(PageRequest.of(0, 1), hidden.text(),
                SearchQuery.escapeLike(hidden.text()), hidden.expression(), hidden.billNumber()).getContent()).isEmpty();
    }

    @Test
    void ordinaryPunctuationDoesNotBecomeBooleanOperators() {
        for (String input : new String[]{"의료법 일부개정법률안(대안)", "소방+", "5·18", "R&D", "소방~", "소방(주)"}) {
            var query = SearchQuery.from(input);
            var result = repository.findBillByKeyword(PageRequest.of(0, 10), query.text(),
                    SearchQuery.escapeLike(query.text()), query.expression(), query.billNumber());
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
        var first = repository.findSimilarBills(name, "exact", null, 22, PageRequest.of(0, 1));
        var last = repository.findSimilarBills(name, "exact", null, 22, PageRequest.of(1, 1));
        assertThat(first.getContent()).extracting(Bill::getId).containsExactly("same-new");
        assertThat(first.getTotalElements()).isEqualTo(2);
        assertThat(last.getContent()).extracting(Bill::getId).containsExactly("same-old");
        assertThat(last.hasNext()).isFalse();

        jdbc.update("UPDATE Bill SET assembly_number=21, bill_result='임기만료폐기' WHERE bill_id='same-old'");
        var current = repository.findSimilarBills(name, "exact", true, 22, PageRequest.of(0, 1));
        var previous = repository.findSimilarBills(name, "exact", false, 22, PageRequest.of(0, 1));
        assertThat(current.getContent()).extracting(Bill::getId).containsExactly("same-new");
        assertThat(current.getTotalElements()).isEqualTo(1);
        assertThat(previous.getContent()).extracting(Bill::getBillResult).containsExactly("임기만료폐기");
        assertThat(repository.countSimilarBills(name, "exact", false, 22)).isEqualTo(1);
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
    void assemblyScopeFiltersBeforePagingAndKeepsReadyBillsWithoutAiSummary() {
        jdbc.update("UPDATE Bill SET gpt_summary = 'AI 요약', stage = '위원회 심사' WHERE bill_id = 'exact'");
        jdbc.update("UPDATE Bill SET title = NULL, summary = '국회 원문', stage = '접수' WHERE bill_id = 'other'");
        repository.saveAndFlush(Bill.builder().id("current-pending").billNumber(23).assemblyNumber(22)
                .billName("미공개 법안").proposeDate(LocalDate.of(2026, 11, 3))
                .ingestStatus(IngestStatusType.PENDING).build());
        repository.saveAndFlush(Bill.builder().id("discarded").billNumber(21).assemblyNumber(21)
                .billName("임기만료 법안").summary("제안이유").billResult("임기만료폐기")
                .stage("위원회 심사").proposeDate(LocalDate.of(2024, 5, 20))
                .ingestStatus(IngestStatusType.READY).build());
        repository.saveAndFlush(Bill.builder().id("older-with-ai").billNumber(20).assemblyNumber(20)
                .billName("제20대 법안").title("제20대 법안").gptSummary("AI 요약")
                .stage("위원회 심사").proposeDate(LocalDate.of(2019, 5, 20))
                .ingestStatus(IngestStatusType.READY).build());
        repository.saveAndFlush(Bill.builder().id("archive-pending").billNumber(22).assemblyNumber(21)
                .billName("공개 대기 중").proposeDate(LocalDate.of(2024, 5, 22))
                .ingestStatus(IngestStatusType.PENDING).build());

        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            var page = PageRequest.of(0, 1);
            var current = repository.findBillWithDetailAndPage(page, Optional.empty(), null, "22");
            assertThat(current.getBillList()).singleElement().satisfies(row -> {
                var info = row.getBillInfoDto();
                assertThat(info.getBillId()).isEqualTo("other");
                assertThat(info.getBillName()).isEqualTo("방송법");
                assertThat(info.getGptSummary()).isNull();
                assertThat(info.getSummary()).isEqualTo("국회 원문");
            });
            assertThat(current.getPaginationResponse().isLastPage()).isFalse();
            var stage = repository.findBillWithDetailAndPage(page, Optional.empty(), "접수", "22");
            assertThat(stage.getBillList()).extracting(b -> b.getBillInfoDto().getBillId()).containsExactly("other");
            assertThat(stage.getPaginationResponse().isLastPage()).isTrue();

            var archived = repository.findBillWithDetailAndPage(page, Optional.empty(), "위원회 심사", "21");
            assertThat(archived.getBillList()).singleElement().satisfies(row -> {
                var info = row.getBillInfoDto();
                assertThat(info.getAssemblyNumber()).isEqualTo(21);
                assertThat(info.getBillResult()).isEqualTo("임기만료폐기");
                assertThat(info.getGptSummary()).isNull();
                assertThat(info.getSummary()).isEqualTo("제안이유");
            });
            var combined = repository.findBillWithDetailAndPage(page, Optional.empty(), null, "all");
            assertThat(combined.getBillList()).extracting(b -> b.getBillInfoDto().getBillId()).containsExactly("other");
            assertThat(combined.getPaginationResponse().isLastPage()).isFalse();
            var last = repository.findBillWithDetailAndPage(PageRequest.of(3, 1), Optional.empty(), null, "all");
            assertThat(last.getBillList()).extracting(b -> b.getBillInfoDto().getBillId()).containsExactly("discarded");
            assertThat(last.getPaginationResponse().isLastPage()).isTrue();

            var legacy = repository.findBillWithDetailAndPage(PageRequest.of(0, 10), Optional.empty(), null, null);
            assertThat(legacy.getBillList()).extracting(b -> b.getBillInfoDto().getBillId())
                    .containsExactly("exact", "older-with-ai");
        });
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
            var bills = new BillService(repository, statistics, activity);
            var stats = new StatisticsService(statistics, timelines);
            var page = bills.getBillListByCategory(PageRequest.of(0, 10), "economy");
            assertThat(page.getBillList()).extracting(b -> b.getBillInfoDto().getBillId())
                    .containsExactly("body", "exact");
            assertThat(bills.getCategoryCounts()).filteredOn(category -> category.getCategory().equals("economy")).singleElement().satisfies(category ->
                    assertThat(category.getCount()).isEqualTo(2));
            assertThat(stats.getBillCountByCategory()).filteredOn(category -> category.getCategory().equals("economy")).singleElement().satisfies(category ->
                    assertThat(category.getCount()).isEqualTo(2));
            assertThat(bills.getCategoryCounts()).filteredOn(category -> category.getCategory().equals("unknown"))
                    .singleElement().satisfies(category -> assertThat(category.getCount()).isEqualTo(1));
            assertThat(bills.getBillListByCategory(PageRequest.of(0, 10), "unknown").getBillList())
                    .extracting(b -> b.getBillInfoDto().getBillId()).containsExactly("other");
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

        assertThat(publicSitemap.count(PublicSitemapRepository.Kind.reports)).isEqualTo(2);
        assertThat(publicSitemap.list(PublicSitemapRepository.Kind.reports, 0)).containsExactly("exact", "other");
        assertThat(publicSitemap.list(PublicSitemapRepository.Kind.bills, 0))
                .containsExactly("body", "exact", "other");
        assertThat(publicSitemap.list(PublicSitemapRepository.Kind.bills, 1)).isEmpty();

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

    @Test
    void hotActivityUsesSevenDaysAndKeepsRankAfterHydratingBills() throws Exception {
        jdbc.execute(Files.readString(Path.of("../../infra/db/migrations/20261103_create_bill_view_activity.sql")));
        var now = LocalDateTime.now().withNano(0);
        var utcNow = LocalDateTime.now(java.time.ZoneOffset.UTC).withNano(0);
        jdbc.update("INSERT INTO User(email,name,image_url,role) VALUES ('hot-fixture@example.test','검증','', 'MEMBER')");
        long userId = jdbc.queryForObject("SELECT user_id FROM User WHERE email='hot-fixture@example.test'", Long.class);
        jdbc.update("INSERT INTO BillLike (bill_id,user_id,created_date) VALUES ('exact',?,?),('body',?,?)",
                userId, now.minusDays(1), userId, now.minusDays(8));
        jdbc.update("INSERT INTO BillViewActivity (bill_id,viewed_at,view_count) VALUES ('exact',?,5),('body',?,5),('other',?,99)",
                utcNow.minusDays(7).plusMinutes(1), utcNow.minusDays(1), utcNow.minusDays(7).minusSeconds(1));

        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            var bills = new BillService(repository, statistics, activity);
            assertThat(bills.getPopularBills()).extracting(bill -> bill.getBillInfoDto().getBillId())
                    .containsExactly("exact", "body");
            assertThat(bills.getPopularBills().get(0).getHotActivity().scrapCount()).isEqualTo(1);
        });
        jdbc.update("DELETE FROM BillLike WHERE bill_id='exact' AND user_id=?", userId);
        assertThat(activity.findPopular(22, utcNow.minusDays(7), utcNow, now.minusDays(7), now))
                .extracting(BillActivityRepository.Score::billId).containsExactly("body", "exact");
    }

    @Test
    void concurrentDetailViewsKeepLifetimeAndRecentCountersInSync() throws Exception {
        jdbc.execute(Files.readString(Path.of("../../infra/db/migrations/20261103_create_bill_view_activity.sql")));
        var bills = new BillService(repository, statistics, activity);
        var pool = Executors.newFixedThreadPool(3);
        try {
            var calls = IntStream.range(0, 12).<Callable<Void>>mapToObj(index -> () -> {
                new TransactionTemplate(transactions).executeWithoutResult(status -> bills.updateViewCount("exact"));
                return null;
            }).toList();
            for (var result : pool.invokeAll(calls)) result.get();
        } finally {
            pool.shutdownNow();
        }
        assertThat(activity.currentViews("exact")).isEqualTo(12);
        assertThat(jdbc.queryForObject("SELECT SUM(view_count) FROM BillViewActivity WHERE bill_id='exact'", Long.class))
                .isEqualTo(12L);
    }

    @Test
    void timelineIncludesGovernmentAndChairReceiptsWithoutRepresentativeRelations() {
        String chairId = "PRC_A2A5D0E9X1J6G1Y9Z5K9G4Q4Z3B7E2";
        String governmentId = "ARC_A2F5P0I9T1R8W1H4N3J8Q0G5I9W9N0";
        String chairName = "산업재해보상보험법 일부개정법률안(대안)";
        String governmentName = "국유재산특례제한법 일부개정법률안";
        insert(chairId, 2213261, chairName, "2025-09-24", chairName);
        insert(governmentId, 2213110, governmentName, "2025-09-18", governmentName);
        jdbc.update("UPDATE Bill SET proposers = '기후에너지환경노동위원장' WHERE bill_id = ?", chairId);
        jdbc.update("UPDATE Bill SET proposers = '정부' WHERE bill_id = ?", governmentId);
        jdbc.update("UPDATE Bill SET ingest_status = 'PENDING' WHERE bill_id = 'other'");
        jdbc.update("""
                INSERT INTO BillTimeline (bill_id,bill_timeline_stage,status_update_date)
                VALUES (?, '접수', '2025-09-24'), (?, '접수', '2025-09-18'), ('other', '접수', '2025-09-24')
                """, chairId, governmentId);
        var facade = new TimelineFacade(new BillTimelineService(timelines),
                new BillService(repository, statistics, activity),
                new VotePartyService(voteParties), new VoteRecordService(voteRecords));

        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            var dates = facade.getTimeline(PageRequest.of(0, 3)).getTimelineResponseList();
            assertThat(dates).hasSize(2);
            assertThat(dates.get(0).getSubmittedList()).singleElement().satisfies(bill -> {
                assertThat(bill.getBillId()).isEqualTo(chairId);
                assertThat(bill.getBillProposers()).isEqualTo("기후에너지환경노동위원장");
                assertThat(bill.getPartyInfo()).isEmpty();
            });
            assertThat(dates.get(1).getSubmittedList()).singleElement().satisfies(bill -> {
                assertThat(bill.getBillId()).isEqualTo(governmentId);
                assertThat(bill.getBillProposers()).isEqualTo("정부");
                assertThat(bill.getPartyInfo()).isEmpty();
            });
        });
    }

    @Test
    void plenaryUsesDatedResultsAndKeepsVotesOnUnambiguousDates() {
        var party = parties.saveAndFlush(Party.builder().name("표결 정당").build());
        jdbc.update("UPDATE Bill SET bill_result='원안가결' WHERE bill_id IN ('body', 'other')");
        jdbc.update("""
                INSERT INTO VoteRecord (bill_id,total_vote_count,votes_for_count,votes_againt_count,abstention_count)
                VALUES ('exact',100,80,15,5), ('other',120,90,25,5)
                """);
        jdbc.update("INSERT INTO VoteParty (bill_id,party_id,votes_for_count) VALUES ('exact',?,55)", party.getId());
        jdbc.update("""
                INSERT INTO BillTimeline (bill_id,bill_timeline_stage,status_update_date,bill_result)
                VALUES ('exact','본회의 심의','2026-01-28',NULL),
                       ('exact','본회의 심의','2026-01-29','수정가결'),
                       ('body','본회의 심의','2026-01-29',NULL),
                       ('other','본회의 심의','2026-01-29','부결'),
                       ('other','본회의 심의','2026-01-29','원안가결')
                """);
        var date = LocalDate.of(2026, 1, 29);
        var recordService = spy(new VoteRecordService(voteRecords));
        var partyService = spy(new VotePartyService(voteParties));
        var facade = new TimelineFacade(new BillTimelineService(timelines),
                new BillService(repository, statistics, activity), partyService, recordService);

        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            var plenary = facade.getPlenaryBills(date);
            assertThat(plenary).hasSize(3);
            assertThat(plenary).anySatisfy(item -> {
                assertThat(item.getBillInfo().getBillId()).isEqualTo("exact");
                assertThat(item.getBillInfo().getBillResult()).isEqualTo("수정가결");
                assertThat(item.getApprovalVoteCount()).isEqualTo(80);
                assertThat(item.getPartyVoteList()).singleElement().satisfies(vote ->
                        assertThat(vote.getPartyApprovalCount()).isEqualTo(55));
            }).anySatisfy(item -> {
                assertThat(item.getBillInfo().getBillId()).isEqualTo("body");
                assertThat(item.getBillInfo().getBillResult()).isEqualTo("원안가결");
            }).anySatisfy(item -> {
                assertThat(item.getBillInfo().getBillId()).isEqualTo("other");
                assertThat(item.getBillInfo().getBillResult()).isNull();
                assertThat(item.getApprovalVoteCount()).isNull();
                assertThat(item.getPartyVoteList()).isEmpty();
            });
            assertThat(facade.getPlenaryBills(date.minusDays(1))).singleElement().satisfies(item -> {
                assertThat(item.getBillInfo().getBillResult()).isNull();
                assertThat(item.getApprovalVoteCount()).isNull();
                assertThat(item.getPartyVoteList()).isEmpty();
            });
        });
        verify(recordService, times(2)).getRecordsForBills(anyList());
        verify(partyService, times(2)).getPartyVotesForBills(anyList());
        verify(recordService, never()).getVoteRecordByBillId(anyString());
        verify(partyService, never()).getVotePartyListWithPartyByBillId(anyString());
    }

    private void insert(String id, int number, String name, String date, String searchText) {
        repository.saveAndFlush(Bill.builder().id(id).billNumber(number).assemblyNumber(22)
                .billName(name).title(name).proposeDate(LocalDate.parse(date)).ingestStatus(IngestStatusType.READY).build());
        jdbc.update("INSERT INTO BillSearchDocument(bill_id, search_text) VALUES (?, ?)", id, searchText);
    }
}
