package com.everyones.lawmaking.global.config.OAuthConfig;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.autoconfigure.security.oauth2.client.OAuth2ClientProperties;
import org.springframework.boot.autoconfigure.security.oauth2.client.OAuth2ClientPropertiesMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;

/**
 * spring.security.oauth2.client.* 등록(카카오, 네이버, 구글)은 Boot와 같은 매퍼로 만들고,
 * Apple 설정이 모두 있을 때만 Apple 등록을 더한다.
 */
@Configuration
public class OAuthClientRegistrationConfig {

    @Bean
    public InMemoryClientRegistrationRepository clientRegistrationRepository(
            OAuth2ClientProperties oauth2ClientProperties, AppleProperties appleProperties) {
        List<ClientRegistration> registrations =
                new ArrayList<>(new OAuth2ClientPropertiesMapper(oauth2ClientProperties).asClientRegistrations().values());
        if (appleProperties.isConfigured()) {
            registrations.add(appleRegistration(appleProperties));
        }
        return new InMemoryClientRegistrationRepository(registrations);
    }

    /**
     * name, email scope를 요청하면 Apple은 response_mode=form_post를 요구한다.
     * 이 저장소의 구글 설정처럼 authorization URI에 고정 파라미터를 붙인다.
     */
    static ClientRegistration appleRegistration(AppleProperties properties) {
        return ClientRegistration.withRegistrationId(AppleProperties.REGISTRATION_ID)
                .clientId(properties.getClientId())
                .clientName("APPLE")
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(properties.getRedirectUri())
                .scope("name", "email")
                .authorizationUri(AppleProperties.AUTHORIZATION_URI + "?response_mode=form_post")
                .tokenUri(AppleProperties.TOKEN_URI)
                .jwkSetUri(AppleProperties.JWK_SET_URI)
                .userNameAttributeName("sub")
                .build();
    }
}
