package com.everyones.lawmaking.global.handler;

import com.everyones.lawmaking.global.config.OAuthConfig.AppProperties;
import com.everyones.lawmaking.global.util.CookieUtil;
import com.everyones.lawmaking.repository.OAuth2AuthorizationRequestBasedOnCookieRepository;
import com.everyones.lawmaking.repository.OAuth2ClientTokenRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;

import static com.everyones.lawmaking.repository.OAuth2AuthorizationRequestBasedOnCookieRepository.REDIRECT_URI_PARAM_COOKIE_NAME;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private final OAuth2AuthorizationRequestBasedOnCookieRepository authorizationRequestRepository;
    private final OAuth2ClientTokenRepository oAuth2ClientTokenRepository;
    private final AppProperties appProperties;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws ServletException, IOException {
        var targetUrl = CookieUtil.getCookie(request, REDIRECT_URI_PARAM_COOKIE_NAME)
                .map(Cookie::getValue)
                .filter(this::isAllowedRedirect)
                .orElse("/v1/login");
        targetUrl = UriComponentsBuilder.fromUriString(targetUrl)
                .queryParam("error", UriUtils.encodeQueryParam(exception.getLocalizedMessage(), StandardCharsets.UTF_8))
                .build()
                .toUriString();

        // 사용자 principal (사용자명 등)을 가져와서 토큰 삭제
        String clientRegistrationId = request.getParameter("client_id"); // 예: google, facebook 등
        if (clientRegistrationId != null && request.getUserPrincipal() != null) {
            String principalName = request.getUserPrincipal().getName();
            oAuth2ClientTokenRepository.deleteByClientRegistrationIdAndPrincipalName(clientRegistrationId, principalName);
        }
        authorizationRequestRepository.removeAuthorizationRequestCookies(request, response);

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    private boolean isAllowedRedirect(String value) {
        final URI target;
        try {
            target = URI.create(value);
        } catch (IllegalArgumentException exception) {
            return false;
        }
        if (target.getScheme() == null || target.getHost() == null || target.getUserInfo() != null) {
            return false;
        }

        return appProperties.getOauth2ClientRedirectUri().stream()
                .map(URI::create)
                .anyMatch(allowed -> target.getScheme().equalsIgnoreCase(allowed.getScheme())
                        && target.getHost().equalsIgnoreCase(allowed.getHost())
                        && target.getPort() == allowed.getPort());
    }
}
