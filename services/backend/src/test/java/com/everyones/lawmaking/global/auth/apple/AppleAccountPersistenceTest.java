package com.everyones.lawmaking.global.auth.apple;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.everyones.lawmaking.LawmakingApplication;
import com.everyones.lawmaking.domain.entity.Provider;
import com.everyones.lawmaking.global.config.OAuthConfig.AppleProperties;
import com.everyones.lawmaking.global.service.CustomOAuth2UserService;
import com.everyones.lawmaking.repository.UserRepository;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** Apple 사용자는 프로필 사진이 없다. 실제 엔티티 제약(name, email, image_url NOT NULL)으로 저장되는지 확인한다. */
@SpringBootTest(classes = LawmakingApplication.class, properties = {
        "ACTIVE=test",
        "spring.datasource.url=jdbc:h2:mem:apple-account;MODE=MySQL;NON_KEYWORDS=USER"
})
@ActiveProfiles("test")
@Transactional
class AppleAccountPersistenceTest {
    @Autowired
    private CustomOAuth2UserService userService;

    @Autowired
    private UserRepository users;

    @MockBean
    private AppleIdTokenVerifier verifier;

    @AfterEach
    void clearRequest() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void savesAppleAccountWithoutProfileImageAndFindsItOnNextLogin() {
        RequestContextHolder.setRequestAttributes(
                new ServletRequestAttributes(new MockHttpServletRequest("POST", "/v1/login/oauth2/code/apple")));
        when(verifier.verify("apple-id-token")).thenReturn(Jwt.withTokenValue("apple-id-token")
                .header("alg", "RS256")
                .issuer(AppleProperties.ISSUER)
                .subject("001234.apple-user.0001")
                .claim("email", "abc123@privaterelay.appleid.com")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(600))
                .build());

        userService.loadUser(request());
        users.flush();
        userService.loadUser(request());

        var saved = users.findBySocialIdAndProvider("001234.apple-user.0001", Provider.APPLE).orElseThrow();
        assertThat(saved.getName()).isEqualTo("abc123");
        assertThat(saved.getEmail()).isEqualTo("abc123@privaterelay.appleid.com");
        assertThat(saved.getImageUrl()).isEmpty();
        assertThat(users.count()).isEqualTo(1);
    }

    private static OAuth2UserRequest request() {
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
        return new OAuth2UserRequest(registration, accessToken, Map.of("id_token", "apple-id-token"));
    }
}
