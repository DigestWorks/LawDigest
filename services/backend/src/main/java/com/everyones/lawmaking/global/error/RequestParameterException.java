package com.everyones.lawmaking.global.error;

public class RequestParameterException extends CustomException {
    public RequestParameterException() {
        super(ErrorCode.INVALID_QUERY_PARAMETER);
    }
}
