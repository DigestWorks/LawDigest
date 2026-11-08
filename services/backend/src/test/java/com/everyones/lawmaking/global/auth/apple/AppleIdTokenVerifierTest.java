package com.everyones.lawmaking.global.auth.apple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.everyones.lawmaking.global.config.OAuthConfig.AppleProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

class AppleIdTokenVerifierTest {
    private KeyPair keyPair;
    private AppleIdTokenVerifier verifier;

    @BeforeEach
    void setUp() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        keyPair = generator.generateKeyPair();
        verifier = new AppleIdTokenVerifier(
                NimbusJwtDecoder.withPublicKey((RSAPublicKey) keyPair.getPublic()).build(), AppleTestKeys.CLIENT_ID);
    }

    @Test
    void returnsClaimsOfValidAppleIdToken() {
        var jwt = verifier.verify(idToken(AppleProperties.ISSUER, AppleTestKeys.CLIENT_ID, Instant.now().plusSeconds(600)));

        assertThat(jwt.getSubject()).isEqualTo("001234.apple-user.0001");
        assertThat(jwt.getClaimAsString("email")).isEqualTo("abc123@privaterelay.appleid.com");
    }

    @Test
    void rejectsTokenIssuedForAnotherClient() {
        String token = idToken(AppleProperties.ISSUER, "com.other.app", Instant.now().plusSeconds(600));

        assertThatThrownBy(() -> verifier.verify(token)).isInstanceOf(OAuth2AuthenticationException.class);
    }

    @Test
    void rejectsTokenFromAnotherIssuer() {
        String token = idToken("https://attacker.example", AppleTestKeys.CLIENT_ID, Instant.now().plusSeconds(600));

        assertThatThrownBy(() -> verifier.verify(token)).isInstanceOf(OAuth2AuthenticationException.class);
    }

    @Test
    void rejectsExpiredToken() {
        String token = idToken(AppleProperties.ISSUER, AppleTestKeys.CLIENT_ID, Instant.now().minusSeconds(3600));

        assertThatThrownBy(() -> verifier.verify(token)).isInstanceOf(OAuth2AuthenticationException.class);
    }

    private String idToken(String issuer, String audience, Instant expiresAt) {
        return Jwts.builder()
                .setIssuer(issuer)
                .setAudience(audience)
                .setSubject("001234.apple-user.0001")
                .claim("email", "abc123@privaterelay.appleid.com")
                .setIssuedAt(Date.from(expiresAt.minusSeconds(600)))
                .setExpiration(Date.from(expiresAt))
                .signWith(keyPair.getPrivate(), SignatureAlgorithm.RS256)
                .compact();
    }
}
