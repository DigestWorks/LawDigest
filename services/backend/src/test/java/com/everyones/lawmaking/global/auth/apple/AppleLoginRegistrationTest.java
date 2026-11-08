package com.everyones.lawmaking.global.auth.apple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.everyones.lawmaking.global.config.OAuthConfig.AppleProperties;
import com.everyones.lawmaking.global.config.OAuthConfig.OAuthClientRegistrationConfig;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.security.oauth2.client.OAuth2ClientProperties;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationExchange;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationResponse;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;

class AppleLoginRegistrationTest {
    private final OAuthClientRegistrationConfig config = new OAuthClientRegistrationConfig();

    @Test
    void keepsExistingProvidersAndSkipsAppleWithoutConfiguration() {
        var repository = config.clientRegistrationRepository(
                existingProviders(), new AppleProperties("", "", "", "", ""));

        assertThat(repository.findByRegistrationId("apple")).isNull();
        ClientRegistration kakao = repository.findByRegistrationId("kakao");
        assertThat(kakao.getClientId()).isEqualTo("kakao-client");
        assertThat(kakao.getRedirectUri()).isEqualTo("https://test.api.lawdigest.kr/v1/login/oauth2/code/kakao");
        assertThat(kakao.getProviderDetails().getAuthorizationUri()).isEqualTo("https://kauth.kakao.com/oauth/authorize");
        assertThat(kakao.getProviderDetails().getTokenUri()).isEqualTo("https://kauth.kakao.com/oauth/token");
        assertThat(repository.findByRegistrationId("google").getProviderDetails().getUserInfoEndpoint().getUri())
                .isEqualTo("https://www.googleapis.com/oauth2/v3/userinfo");
    }

    @Test
    void redirectsToAppleWithFormPostAndNameEmailScope() throws Exception {
        var repository = appleRepository();
        var request = new MockHttpServletRequest("GET", "/v1/oauth2/authorization/apple");
        request.setServletPath("/v1/oauth2/authorization/apple");

        OAuth2AuthorizationRequest authorization =
                new DefaultOAuth2AuthorizationRequestResolver(repository, "/v1/oauth2/authorization").resolve(request);

        MultiValueMap<String, String> query = UriComponentsBuilder
                .fromUriString(authorization.getAuthorizationRequestUri()).build().getQueryParams();
        assertThat(authorization.getAuthorizationRequestUri()).startsWith(AppleProperties.AUTHORIZATION_URI + "?");
        assertThat(query.getFirst("response_mode")).isEqualTo("form_post");
        assertThat(query.getFirst("response_type")).isEqualTo("code");
        assertThat(query.getFirst("client_id")).isEqualTo(AppleTestKeys.CLIENT_ID);
        assertThat(query.getFirst("scope")).isIn("name%20email", "name email");
        assertThat(query.getFirst("state")).isNotBlank();
    }

    @Test
    void replacesClientSecretOnlyForAppleTokenRequest() throws Exception {
        var generator = mock(AppleClientSecretGenerator.class);
        when(generator.generate()).thenReturn("signed-client-secret");
        var converter = new AppleAwareTokenRequestConverter(generator);
        var repository = config.clientRegistrationRepository(existingProviders(), configuredApple());

        assertThat(body(converter, repository.findByRegistrationId("apple")).getFirst("client_secret"))
                .isEqualTo("signed-client-secret");
        assertThat(body(converter, repository.findByRegistrationId("google")).getFirst("client_secret"))
                .isEqualTo("google-secret");
    }

    @SuppressWarnings("unchecked")
    private static MultiValueMap<String, String> body(AppleAwareTokenRequestConverter converter, ClientRegistration registration) {
        var authorizationRequest = OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri(registration.getProviderDetails().getAuthorizationUri())
                .clientId(registration.getClientId())
                .redirectUri(registration.getRedirectUri())
                .scopes(Set.copyOf(registration.getScopes()))
                .state("state-fixture")
                .build();
        var authorizationResponse = OAuth2AuthorizationResponse.success("code-fixture")
                .redirectUri(registration.getRedirectUri())
                .state("state-fixture")
                .build();
        var grantRequest = new OAuth2AuthorizationCodeGrantRequest(
                registration, new OAuth2AuthorizationExchange(authorizationRequest, authorizationResponse));
        return (MultiValueMap<String, String>) converter.convert(grantRequest).getBody();
    }

    private InMemoryClientRegistrationRepository appleRepository() throws Exception {
        return config.clientRegistrationRepository(existingProviders(), configuredApple());
    }

    private static AppleProperties configuredApple() throws Exception {
        return AppleTestKeys.properties(AppleTestKeys.pem(AppleTestKeys.ecKeyPair()));
    }

    private static OAuth2ClientProperties existingProviders() {
        var properties = new OAuth2ClientProperties();
        var kakao = new OAuth2ClientProperties.Registration();
        kakao.setClientId("kakao-client");
        kakao.setClientSecret("kakao-secret");
        kakao.setClientName("KAKAO");
        kakao.setAuthorizationGrantType("authorization_code");
        kakao.setClientAuthenticationMethod("client_secret_post");
        kakao.setRedirectUri("https://test.api.lawdigest.kr/v1/login/oauth2/code/kakao");
        kakao.setScope(Set.of("profile_nickname", "account_email"));
        properties.getRegistration().put("kakao", kakao);
        var kakaoProvider = new OAuth2ClientProperties.Provider();
        kakaoProvider.setAuthorizationUri("https://kauth.kakao.com/oauth/authorize");
        kakaoProvider.setTokenUri("https://kauth.kakao.com/oauth/token");
        kakaoProvider.setUserInfoUri("https://kapi.kakao.com/v2/user/me");
        kakaoProvider.setUserNameAttribute("id");
        properties.getProvider().put("kakao", kakaoProvider);

        var google = new OAuth2ClientProperties.Registration();
        google.setClientId("google-client");
        google.setClientSecret("google-secret");
        google.setAuthorizationGrantType("authorization_code");
        google.setClientAuthenticationMethod("client_secret_post");
        google.setRedirectUri("https://test.api.lawdigest.kr/v1/login/oauth2/code/google");
        google.setScope(Set.of("profile", "email"));
        properties.getRegistration().put("google", google);
        var googleProvider = new OAuth2ClientProperties.Provider();
        googleProvider.setAuthorizationUri("https://accounts.google.com/o/oauth2/auth?access_type=offline&prompt=consent");
        googleProvider.setTokenUri("https://oauth2.googleapis.com/token");
        googleProvider.setUserInfoUri("https://www.googleapis.com/oauth2/v3/userinfo");
        googleProvider.setUserNameAttribute("sub");
        properties.getProvider().put("google", googleProvider);
        return properties;
    }
}
