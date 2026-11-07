package com.everyones.lawmaking.controller;

import com.everyones.lawmaking.common.dto.response.BillTimelinePaginationResponse;
import com.everyones.lawmaking.common.dto.response.BillTimelineResponse;
import com.everyones.lawmaking.common.dto.response.PaginationResponse;
import com.everyones.lawmaking.facade.BillFacade;
import com.everyones.lawmaking.facade.TimelineFacade;
import com.everyones.lawmaking.service.RedisService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class BillTimelineControllerTest {
    private final TimelineFacade timeline = mock(TimelineFacade.class);
    private final RedisService cache = mock(RedisService.class);
    private final BillTimelineController controller = new BillTimelineController(
            timeline, mock(BillFacade.class), cache, new ObjectMapper().findAndRegisterModules());

    @Test
    void rejectsInvalidPaginationWithoutQueryingData() throws Exception {
        assertThat(controller.getTimelinePaging(0, -1).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.getTimelinePaging(0, 11).getStatusCode().value()).isEqualTo(400);
        assertThat(controller.getTimelinePaging(-1, 3).getStatusCode().value()).isEqualTo(400);
        verifyNoInteractions(timeline, cache);
    }

    @Test
    void storesResponseAndUsesItOnCacheHit() throws Exception {
        var day = BillTimelineResponse.of(LocalDate.of(2026, 3, 17),
                List.of(), List.of(), List.of(), List.of());
        when(timeline.getTimeline(PageRequest.of(0, 3))).thenReturn(
                BillTimelinePaginationResponse.of(PaginationResponse.of(true, 0), List.of(day)));
        var response = controller.getTimelinePaging(0, 3);
        assertThat(response.getBody()).contains("\"code\":200", "\"timeline_response_list\"");
        verify(cache).cacheTimelinePage(0, 3, response.getBody());

        when(cache.readTimelinePage(0, 3)).thenReturn(response.getBody());
        assertThat(controller.getTimelinePaging(0, 3).getBody()).isEqualTo(response.getBody());
        verify(timeline, times(1)).getTimeline(PageRequest.of(0, 3));
    }

    @Test
    @EnabledIfEnvironmentVariable(named = "LAWDIGEST_REDIS_TEST_PORT", matches = "36381")
    void redisRoundTripsTimelineJsonWithExpiry() {
        var factory = new LettuceConnectionFactory("127.0.0.1", 36381);
        factory.afterPropertiesSet();
        try {
            var template = new StringRedisTemplate(factory);
            var service = new RedisService(template);
            String json = "{\"code\":200}";
            service.cacheTimelinePage(1, 3, json);
            assertThat(service.readTimelinePage(1, 3)).isEqualTo(json);
            assertThat(template.getExpire("lawdigest:timeline:page:v2:1:3")).isBetween(1L, 60L);
        } finally {
            factory.destroy();
        }
    }
}
