package com.everyones.lawmaking.service;

import com.everyones.lawmaking.common.dto.SearchPartyDto;
import com.everyones.lawmaking.common.dto.PartySeatCount;
import com.everyones.lawmaking.common.dto.response.FollowingPartyResponse;
import com.everyones.lawmaking.common.dto.response.ParliamentaryPartyResponse;
import com.everyones.lawmaking.common.dto.response.PartyDetailResponse;
import com.everyones.lawmaking.common.dto.response.SearchResponse;
import com.everyones.lawmaking.domain.entity.Party;
import com.everyones.lawmaking.global.error.PartyException;
import com.everyones.lawmaking.repository.PartyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PartyService {
    private final PartyRepository partyRepository;

    private static final String PARTY_ID_KEY_STRING = "partyId";

    public Party findById(long partyId) {
        return partyRepository.findById(partyId)
                .orElseThrow(() -> new PartyException.PartyNotFound(Map.of(PARTY_ID_KEY_STRING, Long.toString(partyId))));
    }

    public PartyDetailResponse getPartyById(long partyId) {
        var party = partyRepository.findPartyDetailById(partyId)
                .orElseThrow(() -> new PartyException.PartyNotFound(Map.of(PARTY_ID_KEY_STRING, Long.toString(partyId))));
        var seatCounts = partyRepository.findActiveSeatCounts();
        var seats = seatCounts.stream()
                .filter(count -> count.partyId() != null && count.partyId() == partyId)
                .findFirst()
                .orElse(new PartySeatCount(partyId, party.getName(), party.getPartyImageUrl(), 0, 0, 0));
        int totalSeats = Math.toIntExact(seatCounts.stream().mapToLong(PartySeatCount::totalCount).sum());
        Integer rank = null;
        if (seats.totalCount() > 0 && !"무소속".equals(party.getName())) {
            rank = 1 + Math.toIntExact(seatCounts.stream()
                    .filter(count -> count.partyId() != null && !"무소속".equals(count.partyName()))
                    .filter(count -> count.totalCount() > seats.totalCount())
                    .count());
        }
        return PartyDetailResponse.from(party, seats, totalSeats, rank);
    }

    public List<FollowingPartyResponse> getFollowingParty(long userId) {
        var parties = partyRepository.findFollowingPartyByUserId(userId);

        return parties.stream()
                .map(FollowingPartyResponse::from)
                .toList();
    }

    // 검색 파티
    public List<SearchResponse> searchParty(String searchWord) {
        var searchPartyList= partyRepository.findBySearchWord(
                com.everyones.lawmaking.global.util.SearchQuery.escapeLike(searchWord));
        return searchPartyList.stream()
                .map(SearchPartyDto::from)
                .collect(Collectors.toList());
    }

    public List<Party> getPartyListByBillId(String billId) {
        List<Party> partyList = partyRepository.findPartyByBillId(billId);
        if (partyList.isEmpty()) {
            throw new PartyException.PartyNotFound(Map.of("billId", billId));
        }
        return partyList;

    }

    public List<String> getPartyInfoList(String billId) {
        List<Party> partyList = getPartyListByBillId(billId);
        return partyList.stream().map(party -> {
            var partyName = party.getName();
            var partyImageUrl = party.getPartyImageUrl();
            return partyName + ":" + partyImageUrl;
        }).toList();

    }

    public List<ParliamentaryPartyResponse> getParliamentaryParty() {
        return partyRepository.findActiveSeatCounts().stream()
                .map(seats -> new ParliamentaryPartyResponse(
                        seats.partyId() == null ? 0 : seats.partyId(),
                        seats.partyName() == null ? "소속 미확인" : seats.partyName(),
                        seats.partyImageUrl(), seats.totalCount()))
                .sorted(Comparator.comparing(ParliamentaryPartyResponse::getCongressmanCount).reversed()
                        .thenComparing(ParliamentaryPartyResponse::getPartyId))
                .toList();
    }






}
