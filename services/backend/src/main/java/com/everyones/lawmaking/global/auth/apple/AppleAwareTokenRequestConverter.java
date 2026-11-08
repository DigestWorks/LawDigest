package com.everyones.lawmaking.global.auth.apple;

import com.everyones.lawmaking.global.config.OAuthConfig.AppleProperties;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequestEntityConverter;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.util.MultiValueMap;

/** Apple 토큰 교환 요청에만 매번 새로 서명한 client_secret을 넣는다. 다른 제공자 요청은 그대로 둔다. */
public class AppleAwareTokenRequestConverter extends OAuth2AuthorizationCodeGrantRequestEntityConverter {
    private final AppleClientSecretGenerator clientSecretGenerator;

    public AppleAwareTokenRequestConverter(AppleClientSecretGenerator clientSecretGenerator) {
        this.clientSecretGenerator = clientSecretGenerator;
    }

    @Override
    protected MultiValueMap<String, String> createParameters(OAuth2AuthorizationCodeGrantRequest request) {
        MultiValueMap<String, String> parameters = super.createParameters(request);
        if (AppleProperties.REGISTRATION_ID.equals(request.getClientRegistration().getRegistrationId())) {
            parameters.set(OAuth2ParameterNames.CLIENT_SECRET, clientSecretGenerator.generate());
        }
        return parameters;
    }
}
