package com.everyones.lawmaking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.everyones.lawmaking.domain.entity.Provider;
import com.everyones.lawmaking.domain.entity.SocialToken;
import com.everyones.lawmaking.global.auth.apple.AppleClientSecretGenerator;
import com.everyones.lawmaking.global.config.OAuthConfig.AppleClientProperties;
import com.everyones.lawmaking.global.config.OAuthConfig.AppleProperties;
import com.everyones.lawmaking.repository.OAuth2ClientTokenRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestTemplate;

class AppleOAuthServiceTest {
    private final OAuth2ClientTokenRepository tokens = mock(OAuth2ClientTokenRepository.class);
    private final AppleClientSecretGenerator secrets = mock(AppleClientSecretGenerator.class);
    private final RestTemplate restTemplate = new RestTemplate();
    private MockRestServiceServer server;
    private AppleOAuthService service;

    @BeforeEach
    void setUp() {
        server = MockRestServiceServer.bindTo(restTemplate).build();
        when(secrets.generate()).thenReturn("signed-client-secret");
        var properties = new AppleProperties("kr.lawdigest.web", "TEAM", "KEY", "key", "https://api.lawdigest.kr/cb");
        service = new AppleOAuthService(tokens, new AppleClientProperties(properties, secrets), restTemplate);
    }

    @Test
    void exchangesSavedRefreshTokenForAccessToken() {
        var saved = mock(SocialToken.class);
        when(saved.getRefreshToken()).thenReturn("saved-refresh-token");
        when(tokens.findTop1ByClientRegistrationIdAndPrincipalNameOrderByCreatedDateDesc("APPLE", "apple-sub"))
                .thenReturn(Optional.of(saved));
        server.expect(requestTo(AppleProperties.TOKEN_URI))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().formData(form(
                        "client_id", "kr.lawdigest.web",
                        "client_secret", "signed-client-secret",
                        "grant_type", "refresh_token",
                        "refresh_token", "saved-refresh-token")))
                .andRespond(withSuccess(
                        "{\"access_token\":\"fresh-access-token\",\"token_type\":\"Bearer\",\"expires_in\":3600,\"id_token\":\"eyJ\"}",
                        MediaType.APPLICATION_JSON));

        var response = service.getOAuthTokenResponse(Provider.APPLE, "apple-sub");

        assertThat(response.getBody().getAccessToken()).isEqualTo("fresh-access-token");
        server.verify();
    }

    @Test
    void revokesAccessTokenAtApple() {
        server.expect(requestTo(AppleProperties.REVOKE_URI))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().formData(form(
                        "client_id", "kr.lawdigest.web",
                        "client_secret", "signed-client-secret",
                        "token", "fresh-access-token",
                        "token_type_hint", "access_token")))
                .andRespond(withSuccess());

        service.unlink(Provider.APPLE, "fresh-access-token");

        server.verify();
    }

    private static LinkedMultiValueMap<String, String> form(String... pairs) {
        var form = new LinkedMultiValueMap<String, String>();
        for (int i = 0; i < pairs.length; i += 2) {
            form.add(pairs[i], pairs[i + 1]);
        }
        return form;
    }
}
