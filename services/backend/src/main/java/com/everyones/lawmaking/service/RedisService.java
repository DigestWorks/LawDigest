package com.everyones.lawmaking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisService {
    private static final String TIMELINE_KEY = "lawdigest:timeline:page:v2:";
    private static final Duration TIMELINE_TTL = Duration.ofSeconds(60);

    private final StringRedisTemplate redis;

    public String readTimelinePage(int page, int size) {
        try {
            return redis.opsForValue().get(key(page, size));
        } catch (DataAccessException ex) {
            log.debug("Timeline cache read unavailable", ex);
            return null;
        }
    }

    public void cacheTimelinePage(int page, int size, String json) {
        try {
            redis.opsForValue().set(key(page, size), json, TIMELINE_TTL);
        } catch (DataAccessException ex) {
            log.debug("Timeline cache write unavailable", ex);
        }
    }

    private String key(int page, int size) {
        return TIMELINE_KEY + page + ":" + size;
    }
}
