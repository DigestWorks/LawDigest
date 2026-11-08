package com.everyones.lawmaking.global.auth.apple;

import com.everyones.lawmaking.global.config.OAuthConfig.AppleProperties;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;

final class AppleTestKeys {
    static final String CLIENT_ID = "kr.lawdigest.web.test";
    static final String TEAM_ID = "TEAMFIXTUR";
    static final String KEY_ID = "KEYFIXTURE";
    static final String REDIRECT_URI = "https://test.api.lawdigest.kr/v1/login/oauth2/code/apple";

    private AppleTestKeys() {
    }

    static KeyPair ecKeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        return generator.generateKeyPair();
    }

    /** Apple에서 내려받는 .p8 파일과 같은 PEM 형식 */
    static String pem(KeyPair keyPair) {
        String body = Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(keyPair.getPrivate().getEncoded());
        return "-----BEGIN PRIVATE KEY-----\n" + body + "\n-----END PRIVATE KEY-----\n";
    }

    static AppleProperties properties(String privateKey) {
        return new AppleProperties(CLIENT_ID, TEAM_ID, KEY_ID, privateKey, REDIRECT_URI);
    }
}
