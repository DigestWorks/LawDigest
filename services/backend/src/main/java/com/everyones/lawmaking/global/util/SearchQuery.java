package com.everyones.lawmaking.global.util;

import com.everyones.lawmaking.global.error.BillException;
import java.util.LinkedHashSet;
import java.util.regex.Pattern;

/** 사용자 입력을 MySQL boolean 검색 연산자와 분리한다. */
public record SearchQuery(String text, String expression) {
    private static final Pattern WORD = Pattern.compile("[\\p{L}\\p{N}]+");
    public static final int MAX_LENGTH = 200;

    public static SearchQuery from(String input) {
        String text = input == null ? "" : input.strip();
        if (text.codePointCount(0, text.length()) < 2 || text.length() > MAX_LENGTH) {
            throw new BillException.SearchParameterInvalid();
        }
        var words = new LinkedHashSet<String>();
        var matcher = WORD.matcher(text);
        while (matcher.find()) {
            words.add(matcher.group());
        }
        if (words.isEmpty()) {
            throw new BillException.SearchParameterInvalid();
        }
        String expression = words.stream().map(word -> "+" + word + "*")
                .collect(java.util.stream.Collectors.joining(" "));
        return new SearchQuery(text, expression);
    }

    public static String escapeLike(String text) {
        return text.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
