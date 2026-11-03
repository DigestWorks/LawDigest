package com.everyones.lawmaking.service;

import com.everyones.lawmaking.common.dto.response.BillTimelineResponse;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RedisService {

    private final RedisTemplate<String, Object> redisTemplate;

    private final String TIMELINE_KEY = "timelineQueue";


    public boolean isTimelineCached(LocalDate localDate) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(TIMELINE_KEY + localDate));
    }
    public BillTimelineResponse getTimelineCached(LocalDate localDate) {
        return (BillTimelineResponse) redisTemplate.opsForValue().get(TIMELINE_KEY + localDate);
    }
}
