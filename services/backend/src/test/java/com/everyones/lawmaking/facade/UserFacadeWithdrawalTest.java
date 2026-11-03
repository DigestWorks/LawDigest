package com.everyones.lawmaking.facade;

import com.everyones.lawmaking.common.dto.response.OAuthTokenResponse;
import com.everyones.lawmaking.domain.entity.AuthInfo;
import com.everyones.lawmaking.domain.entity.Provider;
import com.everyones.lawmaking.global.config.OAuthConfig.OAuthServiceFactory;
import com.everyones.lawmaking.global.error.ExternalException;
import com.everyones.lawmaking.global.service.TokenService;
import com.everyones.lawmaking.repository.OAuth2ClientTokenRepository;
import com.everyones.lawmaking.service.AuthService;
import com.everyones.lawmaking.service.LikeService;
import com.everyones.lawmaking.service.NotificationService;
import com.everyones.lawmaking.service.OAuthService;
import com.everyones.lawmaking.service.SearchKeywordService;
import com.everyones.lawmaking.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.HttpServerErrorException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserFacadeWithdrawalTest {
    private final UserService users = mock(UserService.class);
    private final AuthService auth = mock(AuthService.class);
    private final TokenService tokens = mock(TokenService.class);
    private final OAuthServiceFactory providers = mock(OAuthServiceFactory.class);
    private final OAuthService oauth = mock(OAuthService.class);
    private final OAuth2ClientTokenRepository oauthTokens = mock(OAuth2ClientTokenRepository.class);
    private final PlatformTransactionManager transactions = mock(PlatformTransactionManager.class);
    private final SimpleTransactionStatus transaction = new SimpleTransactionStatus();
    private final MockHttpServletRequest request = new MockHttpServletRequest();
    private final MockHttpServletResponse response = new MockHttpServletResponse();

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("17", null));
        when(transactions.getTransaction(any())).thenReturn(transaction);
        when(auth.getAuthInfo(17L)).thenReturn(AuthInfo.builder().id(27L).socialId("social-fixture").provider(Provider.GOOGLE).build());
        when(users.deleteUserById(17L)).thenReturn(1);
        when(auth.deleteAuthInfoById(27L)).thenReturn(1);
        when(providers.getOAuthService(Provider.GOOGLE)).thenReturn(oauth);
        var oauthToken = mock(OAuthTokenResponse.class);
        when(oauthToken.getAccessToken()).thenReturn("fixture-token");
        when(oauth.getOAuthTokenResponse(Provider.GOOGLE, "social-fixture")).thenReturn(ResponseEntity.ok(oauthToken));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void keepsSessionWhenProviderUnlinkFails() {
        var facade = facade();
        doThrow(new HttpServerErrorException(HttpStatus.SERVICE_UNAVAILABLE))
                .when(oauth).unlink(Provider.GOOGLE, "fixture-token");

        assertThatThrownBy(() -> facade.withdraw(request, response)).isInstanceOf(ExternalException.ApiException.class);

        verify(transactions).rollback(transaction);
        verify(tokens, never()).clearSession(request, response);
    }

    @Test
    void clearsSessionOnlyAfterWithdrawalCommits() {
        var result = facade().withdraw(request, response);
        assertThat(result.getProvider()).isEqualTo("GOOGLE");

        var ordered = inOrder(tokens, users, auth, oauthTokens, oauth, transactions);
        ordered.verify(tokens).invalidateToken(17L);
        ordered.verify(users).deleteUserById(17L);
        ordered.verify(auth).deleteAuthInfoById(27L);
        ordered.verify(oauthTokens).deleteByClientRegistrationIdAndPrincipalName("GOOGLE", "social-fixture");
        ordered.verify(oauth).unlink(Provider.GOOGLE, "fixture-token");
        ordered.verify(transactions).commit(transaction);
        ordered.verify(tokens).clearSession(request, response);
    }

    @Test
    void keepsSessionWhenCommitFails() {
        doThrow(new TransactionSystemException("fixture commit failure")).when(transactions).commit(transaction);

        assertThatThrownBy(() -> facade().withdraw(request, response)).isInstanceOf(TransactionSystemException.class);
        verify(tokens, never()).clearSession(request, response);
    }

    private UserFacade facade() {
        return new UserFacade(users, auth, tokens, providers, mock(LikeService.class),
                mock(NotificationService.class), mock(SearchKeywordService.class), oauthTokens,
                new TransactionTemplate(transactions));
    }
}
