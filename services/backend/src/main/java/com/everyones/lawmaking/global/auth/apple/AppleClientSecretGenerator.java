package com.everyones.lawmaking.global.auth.apple;

import com.everyones.lawmaking.global.config.OAuthConfig.AppleProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Apple 토큰·폐기 요청에 쓰는 client_secret JWT를 만든다.
 * header: alg=ES256, kid=Key ID / claims: iss=Team ID, iat, exp, aud=https://appleid.apple.com, sub=Services ID
 * https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret
 */
@Component
public class AppleClientSecretGenerator {
    static final Duration LIFETIME = Duration.ofMinutes(5);

    private final AppleProperties properties;
    private final Clock clock;
    private volatile PrivateKey signingKey;

    @Autowired
    public AppleClientSecretGenerator(AppleProperties properties) {
        this(properties, Clock.systemUTC());
    }

    AppleClientSecretGenerator(AppleProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public String generate() {
        if (!properties.isConfigured()) {
            throw new IllegalStateException("Apple 로그인 설정이 없습니다.");
        }
        Instant now = clock.instant();
        return Jwts.builder()
                .setHeaderParam("kid", properties.getKeyId())
                .setIssuer(properties.getTeamId())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plus(LIFETIME)))
                .setAudience(AppleProperties.ISSUER)
                .setSubject(properties.getClientId())
                .signWith(signingKey(), SignatureAlgorithm.ES256)
                .compact();
    }

    private PrivateKey signingKey() {
        if (signingKey == null) {
            signingKey = parsePrivateKey(properties.getPrivateKey());
        }
        return signingKey;
    }

    /**
     * .p8 파일 내용을 PKCS#8 EC 키로 읽는다.
     * .env 한 줄에 넣을 수 있도록 BEGIN/END 줄, 실제 줄바꿈, 문자열 "\n", 공백을 모두 허용한다.
     */
    static PrivateKey parsePrivateKey(String raw) {
        String body = raw.replace("\\n", "\n")
                .replaceAll("-----(BEGIN|END) PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        try {
            byte[] der = Base64.getDecoder().decode(body);
            return KeyFactory.getInstance("EC").generatePrivate(new PKCS8EncodedKeySpec(der));
        } catch (IllegalArgumentException | GeneralSecurityException exception) {
            throw new IllegalStateException("APPLE_PRIVATE_KEY를 PKCS#8 EC 키로 읽을 수 없습니다.", exception);
        }
    }
}
