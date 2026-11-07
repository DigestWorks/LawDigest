package com.everyones.lawmaking.common.dto;

/** Counts from the active member roster, including members with no recorded election district. */
public record PartySeatCount(
        Long partyId,
        String partyName,
        String partyImageUrl,
        long totalCount,
        long districtCount,
        long proportionalCount
) {
    public int unclassifiedCount() {
        return Math.toIntExact(totalCount - districtCount - proportionalCount);
    }
}
