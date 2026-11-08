package com.everyones.lawmaking.global.service;

import com.everyones.lawmaking.domain.entity.AuthInfo;
import com.everyones.lawmaking.domain.entity.Provider;
import com.everyones.lawmaking.domain.entity.Role;
import com.everyones.lawmaking.domain.entity.User;
import com.everyones.lawmaking.global.auth.PrincipalDetails;
import com.everyones.lawmaking.global.auth.apple.AppleIdTokenVerifier;
import com.everyones.lawmaking.global.auth.socialInfo.AppleOAuth2UserInfo;
import com.everyones.lawmaking.global.auth.socialInfo.OAuth2UserInfo;
import com.everyones.lawmaking.global.auth.socialInfo.OAuth2UserInfoFactory;
import com.everyones.lawmaking.repository.AuthInfoRepository;
import com.everyones.lawmaking.repository.UserRepository;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.endpoint.OidcParameterNames;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private static final String APPLE_USER_PARAMETER = "user";

    private final AuthInfoRepository authInfoRepository;
    private final UserRepository userRepository;
    private final AppleIdTokenVerifier appleIdTokenVerifier;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        var provider = Provider.valueOf(userRequest.getClientRegistration().getRegistrationId().toUpperCase());
        // Apple은 사용자 정보 엔드포인트가 없으므로 토큰 응답의 id_token에서 사용자 정보를 읽는다.
        Map<String, Object> attributes = provider == Provider.APPLE
                ? appleAttributes(userRequest)
                : super.loadUser(userRequest).getAttributes();

        try {
            return this.process(provider, attributes);
        } catch (AuthenticationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new InternalAuthenticationServiceException(ex.getMessage());
        }
    }

    private OAuth2User process(Provider provider, Map<String, Object> attributes) {

        // 소셜로그인에서 사용자 정보를 가져왔음
        var userInfo = OAuth2UserInfoFactory.getOAuth2UserInfo(provider, attributes);

        var userSocialId = userInfo.getId();
        // 저장된 AuthInfo 찾아서 값이 있으면 우리가 찾는 사용자인지 확인

        // 저장된 AuthInfo 으로 사용자 객체 들고옴
        var savedUser = userRepository.findBySocialIdAndProvider(userSocialId, provider)
                //TODO: 글로벌 익셉션으로 관리하기 현재는 401 에러
                .orElseGet(() -> createAuthAndUser(userInfo,provider));
        return PrincipalDetails.create(savedUser, userSocialId, provider, attributes);


    }

    /*
     * Apple id_token을 검증한 claims에, 첫 인가 때만 form POST로 오는 user(이름) 값을 더한다.
     * https://developer.apple.com/documentation/signinwithapple/authenticating-users-with-sign-in-with-apple
     * */
    private Map<String, Object> appleAttributes(OAuth2UserRequest userRequest) {
        Object idToken = userRequest.getAdditionalParameters().get(OidcParameterNames.ID_TOKEN);
        if (!(idToken instanceof String token) || !StringUtils.hasText(token)) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_id_token", "Apple 토큰 응답에 id_token이 없습니다.", null));
        }
        Map<String, Object> attributes = new HashMap<>(appleIdTokenVerifier.verify(token).getClaims());
        currentRequestParameter(APPLE_USER_PARAMETER)
                .ifPresent(user -> attributes.put(AppleOAuth2UserInfo.USER_ATTRIBUTE, user));
        return attributes;
    }

    private Optional<String> currentRequestParameter(String name) {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return Optional.ofNullable(attributes.getRequest().getParameter(name)).filter(StringUtils::hasText);
        }
        return Optional.empty();
    }

    private User createAuthAndUser(OAuth2UserInfo userInfo, Provider provider) {
        // AuthInfo에 데이터 저장
        AuthInfo authInfo = AuthInfo.builder()
                .socialId(userInfo.getId())
                .provider(provider)
                .build();
        authInfoRepository.save(authInfo);
        // User에 데이터 저장
        User user = User.builder()
                .authInfo(authInfo)
                .email(userInfo.getEmail())
                .imageUrl(userInfo.getImageUrl())
                .name(userInfo.getName())
                .role(Role.MEMBER)
                .build();
        userRepository.save(user);


        return user;

    }
}