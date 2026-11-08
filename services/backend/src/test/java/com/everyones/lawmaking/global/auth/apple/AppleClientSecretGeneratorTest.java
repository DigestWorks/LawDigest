package com.everyones.lawmaking.global.auth.apple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.everyones.lawmaking.global.config.OAuthConfig.AppleProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import java.security.KeyPair;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;
import org.junit.jupiter.api.Test;

class AppleClientSecretGeneratorTest {
    private static final Instant NOW = Instant.parse("2026-11-08T00:00:00Z");

    @Test
    void signsClientSecretWithAppleClaims() throws Exception {
        KeyPair keyPair = AppleTestKeys.ecKeyPair();
        var generator = new AppleClientSecretGenerator(
                AppleTestKeys.properties(AppleTestKeys.pem(keyPair)), Clock.fixed(NOW, ZoneOffset.UTC));

        Jws<Claims> jws = parse(generator.generate(), keyPair);

        assertThat(jws.getHeader().getAlgorithm()).isEqualTo("ES256");
        assertThat(jws.getHeader().getKeyId()).isEqualTo(AppleTestKeys.KEY_ID);
        assertThat(jws.getBody().getIssuer()).isEqualTo(AppleTestKeys.TEAM_ID);
        assertThat(jws.getBody().getSubject()).isEqualTo(AppleTestKeys.CLIENT_ID);
        assertThat(jws.getBody().getAudience()).isEqualTo(AppleProperties.ISSUER);
        assertThat(jws.getBody().getIssuedAt()).isEqualTo(Date.from(NOW));
        assertThat(jws.getBody().getExpiration()).isEqualTo(Date.from(NOW.plus(AppleClientSecretGenerator.LIFETIME)));
    }

    @Test
    void acceptsPrivateKeyWrittenOnOneEnvLine() throws Exception {
        KeyPair keyPair = AppleTestKeys.ecKeyPair();
        String escapedNewlines = AppleTestKeys.pem(keyPair).replace("\n", "\\n");
        String bodyOnly = AppleTestKeys.pem(keyPair)
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("\n", "");

        assertThat(AppleClientSecretGenerator.parsePrivateKey(escapedNewlines)).isEqualTo(keyPair.getPrivate());
        assertThat(AppleClientSecretGenerator.parsePrivateKey(bodyOnly)).isEqualTo(keyPair.getPrivate());
    }

    @Test
    void refusesToSignWithoutConfiguration() {
        var generator = new AppleClientSecretGenerator(new AppleProperties("", "", "", "", ""));

        assertThatThrownBy(generator::generate).isInstanceOf(IllegalStateException.class);
    }

    private static Jws<Claims> parse(String token, KeyPair keyPair) {
        return Jwts.parserBuilder()
                .setSigningKey(keyPair.getPublic())
                .setClock(() -> Date.from(NOW))
                .build()
                .parseClaimsJws(token);
    }
}
