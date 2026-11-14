package com.everyones.lawmaking.global.constant;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 국회 위원회 명칭 규칙.
 *
 * <p>이전 명칭: 2025-09 국회법 개정(정부조직 개편에 따른 상임위원회 명칭 변경).
 * 출처: https://www.heraldk.com/article/2025092803475220966
 */
public final class CommitteeNames {

    public static final String STANDING = "standing";
    public static final String SPECIAL = "special";

    /** 이전 명칭 → 현재 명칭. */
    private static final Map<String, String> FORMER_TO_CURRENT = Map.of(
            "기획재정위원회", "재정경제기획위원회",
            "환경노동위원회", "기후에너지환경노동위원회",
            "여성가족위원회", "성평등가족위원회"
    );

    /** 위원회가 아니라 심의 단계이거나 값이 없음을 뜻하는 표기. */
    private static final Set<String> NOT_COMMITTEE = Set.of("-", "본회의");

    private CommitteeNames() {
    }

    public static boolean isCommittee(String name) {
        return name != null && !name.isBlank() && !NOT_COMMITTEE.contains(name.trim());
    }

    /** 이전 명칭이면 현재 명칭을, 아니면 그대로 돌려준다. */
    public static String canonical(String name) {
        var trimmed = name.trim();
        return FORMER_TO_CURRENT.getOrDefault(trimmed, trimmed);
    }

    /** 현재 명칭의 이전 명칭들(이름순). */
    public static List<String> formerNamesOf(String current) {
        return FORMER_TO_CURRENT.entrySet().stream()
                .filter(entry -> entry.getValue().equals(current))
                .map(Map.Entry::getKey)
                .sorted()
                .toList();
    }

    /** 현재 명칭과 이전 명칭을 모두 담은 목록. 법안 조회 조건에 쓴다. */
    public static List<String> namesOf(String current) {
        return Stream.concat(Stream.of(current), formerNamesOf(current).stream()).toList();
    }

    public static String typeOf(String name) {
        return name.endsWith("특별위원회") ? SPECIAL : STANDING;
    }

    /** 의원 소속 위원회 문자열(쉼표 구분)을 정확한 이름 집합으로 나눈다. */
    public static Set<String> splitMemberships(String commits) {
        if (commits == null || commits.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(commits.split(","))
                .map(String::trim)
                .filter(CommitteeNames::isCommittee)
                .map(CommitteeNames::canonical)
                .collect(Collectors.toUnmodifiableSet());
    }
}
