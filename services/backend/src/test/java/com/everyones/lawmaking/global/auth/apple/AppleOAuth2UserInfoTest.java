package com.everyones.lawmaking.global.auth.apple;

import static org.assertj.core.api.Assertions.assertThat;

import com.everyones.lawmaking.domain.entity.Provider;
import com.everyones.lawmaking.global.auth.socialInfo.AppleOAuth2UserInfo;
import com.everyones.lawmaking.global.auth.socialInfo.OAuth2UserInfo;
import com.everyones.lawmaking.global.auth.socialInfo.OAuth2UserInfoFactory;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AppleOAuth2UserInfoTest {

    @Test
    void readsSubjectAndEmailFromIdTokenClaims() {
        OAuth2UserInfo info = OAuth2UserInfoFactory.getOAuth2UserInfo(Provider.APPLE, claims(null));

        assertThat(info).isInstanceOf(AppleOAuth2UserInfo.class);
        assertThat(info.getId()).isEqualTo("001234.apple-user.0001");
        assertThat(info.getEmail()).isEqualTo("abc123@privaterelay.appleid.com");
        assertThat(info.getImageUrl()).isNull();
    }

    @Test
    void joinsKoreanFamilyAndGivenNameWithoutSpace() {
        var info = new AppleOAuth2UserInfo(claims("{\"name\":{\"firstName\":\"민재\",\"lastName\":\"박\"}}"));

        assertThat(info.getName()).isEqualTo("박민재");
    }

    @Test
    void writesLatinNameInGivenFamilyOrder() {
        var info = new AppleOAuth2UserInfo(claims("{\"name\":{\"firstName\":\"Minjae\",\"lastName\":\"Park\"}}"));

        assertThat(info.getName()).isEqualTo("Minjae Park");
    }

    @Test
    void fallsBackToEmailLocalPartWhenAppleSendsNoName() {
        assertThat(new AppleOAuth2UserInfo(claims(null)).getName()).isEqualTo("abc123");
        assertThat(new AppleOAuth2UserInfo(claims("{\"name\":{\"firstName\":\" \"}}")).getName()).isEqualTo("abc123");
        assertThat(new AppleOAuth2UserInfo(claims("not-json")).getName()).isEqualTo("abc123");
    }

    private static Map<String, Object> claims(String user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", "001234.apple-user.0001");
        claims.put("email", "abc123@privaterelay.appleid.com");
        if (user != null) {
            claims.put(AppleOAuth2UserInfo.USER_ATTRIBUTE, user);
        }
        return claims;
    }
}
