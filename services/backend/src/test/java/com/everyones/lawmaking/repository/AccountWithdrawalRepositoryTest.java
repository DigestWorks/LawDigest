package com.everyones.lawmaking.repository;

import com.everyones.lawmaking.LawmakingApplication;
import com.everyones.lawmaking.domain.entity.AuthInfo;
import com.everyones.lawmaking.domain.entity.Provider;
import com.everyones.lawmaking.domain.entity.SocialToken;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = LawmakingApplication.class, properties = {
        "ACTIVE=test",
        "spring.datasource.url=jdbc:h2:mem:account-withdrawal;MODE=MySQL;NON_KEYWORDS=USER"
})
@ActiveProfiles("test")
@Transactional
class AccountWithdrawalRepositoryTest {
    @Autowired
    private AuthInfoRepository authInfo;

    @Autowired
    private OAuth2ClientTokenRepository socialTokens;

    @Test
    void deletionPreservesTheSameSocialIdAtAnotherProvider() {
        var google = authInfo.saveAndFlush(AuthInfo.builder().provider(Provider.GOOGLE).socialId("shared").build());
        var naver = authInfo.saveAndFlush(AuthInfo.builder().provider(Provider.NAVER).socialId("shared").build());
        socialTokens.saveAndFlush(SocialToken.builder().clientRegistrationId("GOOGLE").principalName("shared").build());
        var naverToken = socialTokens.saveAndFlush(
                SocialToken.builder().clientRegistrationId("NAVER").principalName("shared").build());

        assertThat(authInfo.deleteAuthInfoById(google.getId())).isEqualTo(1);
        socialTokens.deleteByClientRegistrationIdAndPrincipalName("GOOGLE", "shared");
        socialTokens.flush();

        assertThat(authInfo.findById(google.getId())).isEmpty();
        assertThat(authInfo.findById(naver.getId())).isPresent();
        assertThat(socialTokens.findTop1ByClientRegistrationIdAndPrincipalNameOrderByCreatedDateDesc("GOOGLE", "shared"))
                .isEmpty();
        assertThat(socialTokens.findById(naverToken.getId())).isPresent();
    }
}
