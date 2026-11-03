package com.everyones.lawmaking.repository;

import com.everyones.lawmaking.common.dto.PartySeatCount;
import com.everyones.lawmaking.domain.entity.Party;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
@Repository
public interface PartyRepository extends JpaRepository<Party, Long> {


    @Query("SELECT p " +
            "FROM Party p " +
            "WHERE p.id = :partyId")
    Optional<Party> findPartyDetailById(@Param("partyId") long partyId);

    @Query("SELECT p FROM Party p " +
            "JOIN p.partyFollow pf " +
            "WHERE pf.user.id = :userId")
    List<Party> findFollowingPartyByUserId(@Param("userId") long userId);

    @Query("SELECT p FROM Party p " +
            "WHERE p.name LIKE %:searchWord% ESCAPE '!' ORDER BY p.name, p.id ")
    List<Party> findBySearchWord(@Param("searchWord") String searchWord);


    @Query("SELECT distinct p " +
            "from Party p " +
            "join p.congressmanList c " +
            "join c.representativeProposer rp " +
            "where rp.bill.id =:billId")
    List<Party> findPartyByBillId(@Param("billId") String billId);

    Optional<Party> findPartyByName(String partyName);
    @Query("""
            SELECT new com.everyones.lawmaking.common.dto.PartySeatCount(
                p.id, p.name, p.partyImageUrl, COUNT(c),
                SUM(CASE WHEN c.district IS NOT NULL AND TRIM(c.district) NOT IN ('', '비례대표') THEN 1 ELSE 0 END),
                SUM(CASE WHEN TRIM(c.district) = '비례대표' THEN 1 ELSE 0 END))
            FROM Congressman c LEFT JOIN c.party p
            WHERE c.state = true
            GROUP BY p.id, p.name, p.partyImageUrl
            """)
    List<PartySeatCount> findActiveSeatCounts();

}
