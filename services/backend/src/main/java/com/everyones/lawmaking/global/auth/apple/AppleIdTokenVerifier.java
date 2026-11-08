package com.everyones.lawmaking.global.auth.apple;

import com.everyones.lawmaking.global.config.OAuthConfig.AppleProperties;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

/**
 * Apple id_token을 Apple 공개키(JWKS)로 검증하고 iss, aud, 만료를 확인한다.
 * JWKS는 첫 검증 때 가져오므로 서버 기동에는 네트워크가 필요 없다.
 */
@Component
public class AppleIdTokenVerifier {
    private final NimbusJwtDecoder decoder;

    @Autowired
    public AppleIdTokenVerifier(AppleProperties properties) {
        this(NimbusJwtDecoder.withJwkSetUri(AppleProperties.JWK_SET_URI).build(), properties.getClientId());
    }

    AppleIdTokenVerifier(NimbusJwtDecoder decoder, String clientId) {
        decoder.setJwtValidator(validator(clientId));
        this.decoder = decoder;
    }

    public Jwt verify(String idToken) {
        try {
            return decoder.decode(idToken);
        } catch (JwtException exception) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_id_token", "Apple id_token 검증에 실패했습니다.", null), exception);
        }
    }

    private static OAuth2TokenValidator<Jwt> validator(String clientId) {
        return new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(AppleProperties.ISSUER),
                new JwtClaimValidator<List<String>>(JwtClaimNames.AUD,
                        audience -> audience != null && audience.contains(clientId)));
    }
}
