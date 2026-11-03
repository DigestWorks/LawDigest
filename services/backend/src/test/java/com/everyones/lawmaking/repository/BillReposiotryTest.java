package com.everyones.lawmaking.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.everyones.lawmaking.domain.entity.Bill;
import com.everyones.lawmaking.domain.entity.BillProposer;
import com.everyones.lawmaking.domain.entity.Congressman;
import com.everyones.lawmaking.domain.entity.IngestStatusType;
import com.everyones.lawmaking.global.config.QuerydslConfig;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
public class BillReposiotryTest {
    @SpringBootConfiguration
    @EnableAutoConfiguration
    @EntityScan(basePackageClasses = Bill.class)
    @EnableJpaRepositories(basePackageClasses = BillRepository.class)
    @Import(QuerydslConfig.class)
    static class TestJpaConfig {
    }

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private BillRepository billRepository;

    @Test
    void mainFeedOnlyReturnsBillsWithTitleAndGptSummary() {
        persistReadyBill("summarized", "짧은 요약", "상세 요약");
        persistReadyBill("missing-title", null, "상세 요약");
        persistReadyBill("missing-gpt", "짧은 요약", null);
        persistReadyBill("blank-title", " ", "상세 요약");
        persistReadyBill("blank-gpt", "짧은 요약", " ");
        entityManager.flush();

        var response = billRepository.findBillWithDetailAndPage(PageRequest.of(0, 10), Optional.empty(), null);

        assertThat(response.getBillList())
                .extracting(billDto -> billDto.getBillInfoDto().getBillId())
                .containsExactly("summarized");
    }

    @Test
    void feedBillInfoByIdListOnlyReturnsBillsWithTitleAndGptSummary() {
        persistReadyBill("summarized", "짧은 요약", "상세 요약");
        persistReadyBill("missing-title", null, "상세 요약");
        persistReadyBill("missing-gpt", "짧은 요약", null);
        entityManager.flush();

        var bills = billRepository.findFeedBillInfoByIdList(List.of("summarized", "missing-title", "missing-gpt"));

        assertThat(bills)
                .extracting(Bill::getId)
                .containsExactly("summarized");
    }

    @Test
    void publicProposerPagesOrderSameDayBillsByDescendingId() {
        var congressman = entityManager.persist(Congressman.builder()
                .id("member")
                .name("테스트 의원")
                .assemblyNumber(22)
                .build());
        for (String id : List.of("bill-a", "bill-c", "bill-b", "bill-d")) {
            persistReadyBill(id, "짧은 요약", "상세 요약");
            entityManager.persist(BillProposer.builder()
                    .bill(entityManager.find(Bill.class, id))
                    .congressman(congressman)
                    .build());
        }
        entityManager.flush();
        entityManager.clear();

        var first = billRepository.findBillByPublicProposer(congressman.getId(), PageRequest.of(0, 2));
        var second = billRepository.findBillByPublicProposer(congressman.getId(), PageRequest.of(1, 2));

        assertThat(first.getContent()).extracting(Bill::getId).containsExactly("bill-d", "bill-c");
        assertThat(second.getContent()).extracting(Bill::getId).containsExactly("bill-b", "bill-a");
        assertThat(first.hasNext()).isTrue();
        assertThat(second.hasNext()).isFalse();
    }

    private void persistReadyBill(String billId, String title, String gptSummary) {
        entityManager.persist(Bill.builder()
                .id(billId)
                .billNumber(Math.abs(billId.hashCode()))
                .assemblyNumber(22)
                .billName("테스트 법안 " + billId)
                .proposeDate(LocalDate.of(2026, 6, 1))
                .stage("접수")
                .summary("원문 요약")
                .title(title)
                .gptSummary(gptSummary)
                .ingestStatus(IngestStatusType.READY)
                .billLike(new ArrayList<>())
                .build());
    }

}
