package com.everyones.lawmaking.service;

import com.everyones.lawmaking.common.dto.response.OAuthTokenResponse;
import com.everyones.lawmaking.domain.entity.Provider;
import com.everyones.lawmaking.global.config.OAuthConfig.AppleClientProperties;
import com.everyones.lawmaking.repository.OAuth2ClientTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

/**
 * 탈퇴 시 Apple 연결을 끊는다.
 * 저장한 refresh token으로 access token을 받고(/auth/token), 그 access token을 폐기한다(/auth/revoke).
 * https://developer.apple.com/documentation/signinwithapplerestapi/generate-and-validate-tokens
 * https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens
 */
@Service
public class AppleOAuthService extends OAuthService {

    private final AppleClientProperties properties;
    private final RestTemplate restTemplate;

    @Autowired
    public AppleOAuthService(OAuth2ClientTokenRepository oAuth2ClientTokenRepository,
                             AppleClientProperties properties, RestTemplate restTemplate) {
        super(oAuth2ClientTokenRepository);
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    @Override
    public Provider getProvider() {
        return properties.getProvider();
    }

    @Override
    public ResponseEntity<OAuthTokenResponse> getOAuthTokenResponse(Provider provider, String socialId) {
        var recentSavedRefreshToken = super.getRecentSavedRefreshToken(provider, socialId);
        MultiValueMap<String, String> requestBody = new LinkedMultiValueMap<>();
        requestBody.add("client_id", properties.getClientId());
        requestBody.add("client_secret", properties.getClientSecret());
        requestBody.add("grant_type", "refresh_token");
        requestBody.add("refresh_token", recentSavedRefreshToken);

        var response = restTemplate.postForEntity(properties.getOAuthTokenUri(), form(requestBody), OAuthTokenResponse.class);
        return ResponseEntity.ok(response.getBody());
    }

    @Override
    public void unlink(Provider provider, String accessToken) {
        MultiValueMap<String, String> requestBody = new LinkedMultiValueMap<>();
        requestBody.add("client_id", properties.getClientId());
        requestBody.add("client_secret", properties.getClientSecret());
        requestBody.add("token", accessToken);
        requestBody.add("token_type_hint", "access_token");

        restTemplate.postForEntity(properties.getUnlinkUri(), form(requestBody), String.class);
    }

    private static HttpEntity<MultiValueMap<String, String>> form(MultiValueMap<String, String> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        return new HttpEntity<>(body, headers);
    }
}
