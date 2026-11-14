package com.everyones.lawmaking.global.error;

import java.util.Map;

public class CommitteeException extends CustomException {

    public CommitteeException(ErrorCode errorCode, Map<String, String> inputValueProperties) {
        super(errorCode, inputValueProperties);
    }

    public static class CommitteeNotFound extends CommitteeException {
        public CommitteeNotFound(Map<String, String> inputValueProperties) {
            super(ErrorCode.COMMITTEE_NOT_FOUND, inputValueProperties);
        }
    }
}
