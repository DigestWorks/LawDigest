package com.everyones.lawmaking.service;

import com.everyones.lawmaking.controller.AuthController;
import com.everyones.lawmaking.facade.UserFacade;
import com.everyones.lawmaking.global.config.OAuthConfig.AppProperties;
import com.everyones.lawmaking.global.error.AuthException;
import com.everyones.lawmaking.global.error.GlobalExceptionHandler;
import com.everyones.lawmaking.global.service.TokenService;
import com.everyones.lawmaking.repository.AuthInfoRepository;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthServiceTest {
    private final TokenService tokens = mock(TokenService.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        var properties = new AppProperties();
        properties.setCookieDomain(".lawdigest.kr");
        properties.setAccessTokenExpiry(30);
        properties.setRefreshTokenExpiry(60);
        var service = new AuthService(mock(AuthInfoRepository.class), properties, tokens);
        var facade = mock(UserFacade.class);
        doAnswer(call -> {
            service.reissueToken(call.getArgument(0), call.getArgument(1));
            return null;
        }).when(facade).reissueToken(any(), any());
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(facade))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void missingRefreshCookieReturnsUnauthorized() throws Exception {
        mvc.perform(post("/v1/auth/reissue/token")).andExpect(status().isUnauthorized());
        verify(tokens, never()).reissueToken(anyString());
    }

    @Test
    void invalidRefreshTokenReturnsUnauthorized() throws Exception {
        when(tokens.reissueToken("invalid")).thenThrow(new AuthException.TokenNotFound());
        mvc.perform(post("/v1/auth/reissue/token").cookie(new Cookie("refreshToken", "invalid")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void transientFailureReturnsServerErrorAndPreservesSession() throws Exception {
        when(tokens.reissueToken("valid")).thenThrow(new IllegalStateException("temporary failure"));
        mvc.perform(post("/v1/auth/reissue/token").cookie(new Cookie("refreshToken", "valid")))
                .andExpect(status().isInternalServerError());
        verify(tokens, never()).logout(any(), any());
    }

    @Test
    void successfulRefreshReturnsTheNormalResponseAndNewCookies() throws Exception {
        when(tokens.reissueToken("valid")).thenReturn(Map.of("accessToken", "new-access", "refreshToken", "new-refresh"));
        mvc.perform(post("/v1/auth/reissue/token").cookie(new Cookie("refreshToken", "valid")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").value("success"))
                .andExpect(header().exists("Set-Cookie"));
        verify(tokens, never()).logout(any(), any());
    }
}
