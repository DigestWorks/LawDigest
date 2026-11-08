package com.everyones.lawmaking.global.auth.apple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.everyones.lawmaking.domain.entity.Provider;
import com.everyones.lawmaking.domain.entity.User;
import com.everyones.lawmaking.global.auth.PrincipalDetails;
import com.everyones.lawmaking.global.config.OAuthConfig.AppleProperties;
import com.everyones.lawmaking.global.service.CustomOAuth2UserService;
import com.everyones.lawmaking.repository.AuthInfoRepository;
import com.everyones.lawmaking.repository.UserRepository;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class AppleUserServiceTest {
    private final AuthInfoRepository authInfos = mock(AuthInfoRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final AppleIdTokenVerifier verifier = mock(AppleIdTokenVerifier.class);
    private final CustomOAuth2UserService service = new CustomOAuth2UserService(authInfos, users, verifier);

    @AfterEach
    void clearRequest() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void createsAccountFromVerifiedIdTokenAndFirstLoginName() {
        var callback = new MockHttpServletRequest("POST", "/v1/login/oauth2/code/apple");
        callback.setParameter("user", "{\"name\":{\"firstName\":\"민재\",\"lastName\":\"박\"},\"email\":\"abc123@privaterelay.appleid.com\"}");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(callback));
        when(verifier.verify("apple-id-token")).thenReturn(appleJwt());
        when(users.findBySocialIdAndProvider("001234.apple-user.0001", Provider.APPLE)).thenReturn(Optional.empty());

        var principal = (PrincipalDetails) service.loadUser(request(Map.of("id_token", "apple-id-token")));

        var saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getName()).isEqualTo("박민재");
        assertThat(saved.getValue().getEmail()).isEqualTo("abc123@privaterelay.appleid.com");
        assertThat(principal.getSocialId()).isEqualTo("001234.apple-user.0001");
        assertThat(principal.getProviderType()).isEqualTo(Provider.APPLE);
    }

    @Test
    void failsLoginWhenTokenResponseHasNoIdToken() {
        assertThatThrownBy(() -> service.loadUser(request(Map.of())))
                .isInstanceOf(OAuth2AuthenticationException.class);
        verify(users, never()).save(any());
    }

    private static Jwt appleJwt() {
        return Jwt.withTokenValue("apple-id-token")
                .header("alg", "RS256")
                .issuer(AppleProperties.ISSUER)
                .subject("001234.apple-user.0001")
                .claim("email", "abc123@privaterelay.appleid.com")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(600))
                .build();
    }

    private static OAuth2UserRequest request(Map<String, Object> tokenResponseParameters) {
        var registration = ClientRegistration.withRegistrationId("apple")
                .clientId(AppleTestKeys.CLIENT_ID)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(AppleTestKeys.REDIRECT_URI)
                .authorizationUri(AppleProperties.AUTHORIZATION_URI)
                .tokenUri(AppleProperties.TOKEN_URI)
                .build();
        var accessToken = new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "apple-access-token",
                Instant.now(), Instant.now().plusSeconds(3600));
        return new OAuth2UserRequest(registration, accessToken, tokenResponseParameters);
    }
}
