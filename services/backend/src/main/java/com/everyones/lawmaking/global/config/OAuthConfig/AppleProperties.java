package com.everyones.lawmaking.global.config.OAuthConfig;

import java.util.stream.Stream;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Sign in with Apple 설정.
 * 엔드포인트와 client_secret 형식은 Apple 공식 문서를 따른다.
 * https://developer.apple.com/documentation/signinwithapplerestapi/generate-and-validate-tokens
 * https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret
 */
@Getter
@Component
public class AppleProperties {
    public static final String REGISTRATION_ID = "apple";
    public static final String ISSUER = "https://appleid.apple.com";
    public static final String AUTHORIZATION_URI = ISSUER + "/auth/authorize";
    public static final String TOKEN_URI = ISSUER + "/auth/token";
    public static final String REVOKE_URI = ISSUER + "/auth/revoke";
    public static final String JWK_SET_URI = ISSUER + "/auth/keys";

    private final String clientId;
    private final String teamId;
    private final String keyId;
    private final String privateKey;
    private final String redirectUri;

    public AppleProperties(
            @Value("${app.auth.apple.client-id:}") String clientId,
            @Value("${app.auth.apple.team-id:}") String teamId,
            @Value("${app.auth.apple.key-id:}") String keyId,
            @Value("${app.auth.apple.private-key:}") String privateKey,
            @Value("${app.auth.apple.redirect-uri:}") String redirectUri) {
        this.clientId = clientId;
        this.teamId = teamId;
        this.keyId = keyId;
        this.privateKey = privateKey;
        this.redirectUri = redirectUri;
    }

    /** 다섯 값이 모두 있어야 Apple 로그인을 켠다. */
    public boolean isConfigured() {
        return Stream.of(clientId, teamId, keyId, privateKey, redirectUri).allMatch(StringUtils::hasText);
    }
}
