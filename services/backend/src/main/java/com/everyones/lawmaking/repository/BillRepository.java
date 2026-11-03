package com.everyones.lawmaking.repository;

import com.everyones.lawmaking.domain.entity.Bill;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillRepository extends JpaRepository<Bill, String>, BillRepositoryCustom{


    // 특정 의원이 대표 발의한 법안들
    @Query("SELECT b FROM Bill b " +
            "WHERE exists (select rp FROM b.representativeProposer rp where rp.congressman.id = :congressmanId) " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "ORDER BY b.proposeDate desc, b.id desc")
    Slice<Bill> findByRepresentativeProposer(String congressmanId, Pageable pageable);

    @Query("SELECT b FROM Bill b " +
            "WHERE exists (select rp FROM b.representativeProposer rp where rp.congressman.id = :congressmanId) " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "AND b.stage = :stage " +
            "ORDER BY b.proposeDate desc, b.id desc")
    Slice<Bill> findByRepresentativeProposer(String congressmanId, Pageable pageable, String stage);

    // 특정의원이 공동 발의한 법안들
    @Query("SELECT b " +
            "FROM Bill b " +
            "WHERE b.id IN (" +
            "    SELECT DISTINCT bp.bill.id " +
            "    FROM BillProposer bp " +
            "    WHERE bp.congressman.id = :congressmanId" +
            ") " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "ORDER BY b.proposeDate DESC")
    Slice<Bill> findBillByPublicProposer(String congressmanId, Pageable pageable);

    @Query("SELECT b FROM Bill b " +
            "WHERE exists (select bp FROM b.publicProposer bp where bp.congressman.id = :congressmanId) " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "AND b.stage = :stage " +
            "ORDER BY b.proposeDate desc, b.id desc")
    Slice<Bill> findBillByPublicProposer(String congressmanId, Pageable pageable, String stage);

    // 정당 소속 의원들이 대표 발의한 법안
    @Query("SELECT b FROM Bill b " +
            "WHERE exists (select rp FROM b.representativeProposer rp where rp.congressman.party.id = :partyId) " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "ORDER BY b.proposeDate DESC, b.id DESC")
    Slice<Bill> findRepresentativeBillsByParty(Pageable pageable, @Param("partyId") long partyId);

    @Query("SELECT b FROM Bill b " +
            "WHERE exists (select rp FROM b.representativeProposer rp where rp.congressman.party.id = :partyId) " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "AND b.stage = :stage " +
            "ORDER BY b.proposeDate DESC, b.id DESC")
    Slice<Bill> findRepresentativeBillsByParty(Pageable pageable, @Param("partyId") long partyId,@Param("stage") String stage);

    // 정당 소속 의원들이 공동 발의한 법안
    // TODO: 쿼리 개선 필요
    @Query("SELECT distinct b FROM Bill b " +
            "JOIN b.publicProposer bp " +
            "WHERE bp.congressman.party.id = :partyId " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "ORDER BY b.proposeDate DESC, b.id DESC")
    Slice<Bill> findPublicBillsByParty(Pageable pageable, @Param("partyId") long partyId);


    @Query("SELECT b FROM Bill b " +
            "WHERE exists (select bp FROM b.publicProposer bp where bp.congressman.party.id = :partyId) " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "AND b.stage = :stage " +
            "ORDER BY b.proposeDate DESC, b.id DESC")
    Slice<Bill> findPublicBillsByParty(Pageable pageable, @Param("partyId") long partyId,@Param("stage") String stage);

    // 유저가 스크랩한 법안 페이징해서 가져오는 쿼리
    @Query("SELECT b FROM Bill b " +
            "JOIN b.billLike bl " +
            "JOIN bl.user u " +
            "WHERE u.id = :userId " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "ORDER BY bl.createdDate DESC, b.id desc")
    Slice<Bill> findByUserId(Pageable pageable, @Param("userId") long userId);

    // 단일 법안과 관련된 정보 가져오는 쿼리
    Optional<Bill> findBillById(String billId);

    /**
     * TODO: 삭제 예정
     * @deprecated
     * 본래 페이징과 분리하여 fetch join + batch size를 함께 사용하여 가져오려 했으나, 그냥 batch size로 처리
      */

    @Query("SELECT b FROM Bill b " +
            "WHERE b.id in :billList " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "ORDER BY b.proposeDate desc, b.id desc")
    List<Bill> findBillInfoByIdList(List<String> billList);

    @Query("SELECT b FROM Bill b " +
            "WHERE b.id in :billList " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "AND b.title IS NOT NULL " +
            "AND length(trim(b.title)) > 0 " +
            "AND b.gptSummary IS NOT NULL " +
            "AND length(trim(b.gptSummary)) > 0 " +
            "ORDER BY b.proposeDate desc, b.id desc")
    List<Bill> findFeedBillInfoByIdList(List<String> billList);

    // 유사한 법안 조회 법안과 같은 이름을 가진 법안 조회
    @Query("SELECT b FROM Bill b " +
            "WHERE b.billName = :billName " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "AND b.id != :billId ORDER BY b.proposeDate DESC, b.id DESC")
    Page<Bill> findSimilarBills(@Param("billName") String billName, @Param("billId") String billId, Pageable pageable);

    @Query(value = """
            SELECT bsd.bill_id FROM BillSearchDocument bsd
            JOIN Bill b ON b.bill_id = bsd.bill_id
            WHERE b.ingest_status = 'READY'
              AND MATCH(bsd.search_text) AGAINST(:expression IN BOOLEAN MODE) > 0
            ORDER BY CASE
              WHEN b.bill_name = :keyword OR b.title = :keyword THEN 0
              WHEN b.bill_name LIKE CONCAT('%', :namePattern, '%') ESCAPE '!' THEN 1
              WHEN b.title LIKE CONCAT('%', :namePattern, '%') ESCAPE '!' THEN 2
              ELSE 3 END,
              MATCH(bsd.search_text) AGAINST(:expression IN BOOLEAN MODE) DESC,
              b.propose_date DESC, bsd.bill_id DESC
            """, nativeQuery = true)
    Slice<String> findBillByKeyword(Pageable pageable, @Param("keyword") String keyword,
            @Param("namePattern") String namePattern, @Param("expression") String expression);



    @Query("select distinct b from Bill b " +
            "JOIN b.representativeProposer rp " +
            "JOIN rp.congressman c " +
            "JOIN c.congressmanLike cl " +
            "where cl.user.id = :userId " +
            "and b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY " +
            "ORDER BY b.proposeDate desc, b.id desc")
    Slice<Bill> findByUserAndCongressmanLike(Pageable pageable, long userId);

    @Query("SELECT DISTINCT b FROM Bill b " +
            "LEFT JOIN FETCH b.representativeProposer rp " +
            "LEFT JOIN FETCH rp.congressman c " +
            "LEFT JOIN FETCH c.party " +
            "WHERE b.id IN :billIds " +
            "AND b.ingestStatus = com.everyones.lawmaking.domain.entity.IngestStatusType.READY")
    List<Bill> findBillsWithPartiesByIds(@Param("billIds") List<String> billIds);

    @Query(value = "SELECT jt.tag AS keyword, COUNT(*) AS cnt " +
            "FROM Bill b, " +
            "JSON_TABLE(b.summary_tags, '$[*]' COLUMNS (tag VARCHAR(255) PATH '$')) jt " +
            "WHERE b.summary_tags IS NOT NULL " +
            "AND b.ingest_status = 'READY' " +
            "AND jt.tag IS NOT NULL AND jt.tag <> '' " +
            "GROUP BY jt.tag " +
            "ORDER BY cnt DESC, keyword " +
            "LIMIT :size", nativeQuery = true)
    List<Object[]> findTopTrendingKeywords(@Param("size") int size);

}
