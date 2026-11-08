package com.everyones.lawmaking.global.config.OAuthConfig;

import com.everyones.lawmaking.domain.entity.Provider;
import com.everyones.lawmaking.global.auth.apple.AppleClientSecretGenerator;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AppleClientProperties implements OAuth2ClientProperties {
    private final AppleProperties properties;
    private final AppleClientSecretGenerator clientSecretGenerator;

    @Override
    public Provider getProvider() {
        return Provider.APPLE;
    }

    @Override
    public String getClientId() {
        return properties.getClientId();
    }

    /** Apple client_secret은 고정값이 아니라 요청마다 서명한 JWT다. */
    @Override
    public String getClientSecret() {
        return clientSecretGenerator.generate();
    }

    @Override
    public URI getOAuthTokenUri() {
        return URI.create(AppleProperties.TOKEN_URI);
    }

    @Override
    public URI getUnlinkUri() {
        return URI.create(AppleProperties.REVOKE_URI);
    }
}
