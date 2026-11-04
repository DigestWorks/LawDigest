package com.everyones.lawmaking.global.handler;

import com.everyones.lawmaking.global.config.OAuthConfig.AppProperties;
import com.everyones.lawmaking.repository.OAuth2AuthorizationRequestBasedOnCookieRepository;
import com.everyones.lawmaking.repository.OAuth2ClientTokenRepository;
import jakarta.servlet.http.Cookie;
import java.net.URI;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "ACTIVE=test")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OAuth2AuthenticationFailureHandlerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void callbackRouteUsesTheRestrictedFailureHandler() throws Exception {
        var response = mockMvc.perform(get("/v1/login/oauth2/code/google")
                        .param("error", "access_denied")
                        .param("state", "probe")
                        .cookie(new Cookie("redirect_uri", "https://example.com/oauth-probe")))
                .andExpect(status().isFound())
                .andReturn()
                .getResponse();

        var target = URI.create(response.getRedirectedUrl());
        assertThat(target.getHost()).isNull();
        assertThat(target.getPath()).isEqualTo("/v1/login");
        assertThat(target.getQuery()).startsWith("error=");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://lawdigest.kr/login/googleLogin",
            "https://test.lawdigest.kr/login/naverLogin",
            "http://localhost:3000/login/kakaoLogin"
    })
    void redirectsToConfiguredWebOrigins(String target) throws Exception {
        var response = fail(target);

        assertThat(response.getStatus()).isEqualTo(302);
        assertThat(response.getRedirectedUrl()).isEqualTo(target + "?error=access_denied");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://example.com/oauth-probe",
            "https://lawdigest.kr.example.com/login/googleLogin",
            "//lawdigest.kr/login/googleLogin",
            "https://example.com@lawdigest.kr/login/googleLogin",
            "http://lawdigest.kr/login/googleLogin",
            "https://lawdigest.kr:444/login/googleLogin",
            "https://lawdigest.kr/bad path"
    })
    void rejectsExternalOrMalformedRedirects(String target) throws Exception {
        assertThat(fail(target).getRedirectedUrl()).isEqualTo("/v1/login?error=access_denied");
    }

    @Test
    void preservesTheEncodedReturnAddressWhenAddingTheFailure() throws Exception {
        var target = "https://lawdigest.kr/login/googleLogin?returnTo=%2F%3Ftab%3Dfollowing";
        assertThat(fail(target).getRedirectedUrl()).isEqualTo(target + "&error=access_denied");
    }

    @Test
    void usesDefaultPathWithoutRedirectCookie() throws Exception {
        assertThat(fail(null).getRedirectedUrl()).isEqualTo("/v1/login?error=access_denied");
    }

    private MockHttpServletResponse fail(String target) throws Exception {
        var properties = new AppProperties();
        properties.setOauth2ClientRedirectUri(List.of(
                "https://lawdigest.kr/", "https://test.lawdigest.kr/", "http://localhost:3000/"));
        var handler = new OAuth2AuthenticationFailureHandler(
                mock(OAuth2AuthorizationRequestBasedOnCookieRepository.class),
                mock(OAuth2ClientTokenRepository.class),
                properties);
        var request = new MockHttpServletRequest();
        if (target != null) {
            request.setCookies(new Cookie("redirect_uri", target));
        }
        var response = new MockHttpServletResponse();
        handler.onAuthenticationFailure(request, response, new BadCredentialsException("access_denied"));
        return response;
    }
}
