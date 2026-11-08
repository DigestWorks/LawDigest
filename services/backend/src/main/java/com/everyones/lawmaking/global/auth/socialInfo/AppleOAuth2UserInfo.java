package com.everyones.lawmaking.global.auth.socialInfo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.Optional;
import org.springframework.util.StringUtils;

/**
 * 검증한 Apple id_token claims와 첫 인가 때만 오는 user JSON으로 사용자 정보를 만든다.
 * user JSON 형식: {"name":{"firstName":"..","lastName":".."},"email":".."}
 */
public class AppleOAuth2UserInfo implements OAuth2UserInfo {
    public static final String USER_ATTRIBUTE = "apple_user";

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String HANGUL = "\\p{IsHangul}+";

    private final Map<String, Object> attributes;

    public AppleOAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }

    @Override
    public String getId() {
        return text("sub");
    }

    @Override
    public String getName() {
        return nameFromUser().orElseGet(this::emailLocalPart);
    }

    @Override
    public String getEmail() {
        return text("email");
    }

    @Override
    public String getImageUrl() {
        return null;
    }

    private Optional<String> nameFromUser() {
        String user = text(USER_ATTRIBUTE);
        if (!StringUtils.hasText(user)) {
            return Optional.empty();
        }
        try {
            JsonNode name = OBJECT_MAPPER.readTree(user).path("name");
            String first = name.path("firstName").asText("").trim();
            String last = name.path("lastName").asText("").trim();
            return Optional.of(join(first, last)).filter(StringUtils::hasText);
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    /** 한글 성과 이름은 "박민재"처럼 붙여 쓰고, 그 밖에는 "Minjae Park" 순서로 쓴다. */
    private static String join(String first, String last) {
        if (first.isEmpty() || last.isEmpty()) {
            return first + last;
        }
        if (first.matches(HANGUL) && last.matches(HANGUL)) {
            return last + first;
        }
        return first + " " + last;
    }

    private String emailLocalPart() {
        String email = getEmail();
        if (!StringUtils.hasText(email)) {
            return null;
        }
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }

    private String text(String key) {
        Object value = attributes.get(key);
        return value == null ? null : value.toString();
    }
}
