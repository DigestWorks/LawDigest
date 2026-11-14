package com.everyones.lawmaking.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.everyones.lawmaking.common.dto.response.BillListResponse;
import com.everyones.lawmaking.common.dto.response.PaginationResponse;
import com.everyones.lawmaking.global.error.CommitteeException;
import com.everyones.lawmaking.global.error.GlobalExceptionHandler;
import com.everyones.lawmaking.service.CommitteeService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class CommitteeControllerTest {

    private CommitteeService committeeService;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        committeeService = mock(CommitteeService.class);
        mvc = MockMvcBuilders.standaloneSetup(new CommitteeController(committeeService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void unknownCommitteeReturnsNotFound() throws Exception {
        when(committeeService.getCommittee("없는위원회"))
                .thenThrow(new CommitteeException.CommitteeNotFound(Map.of("name", "없는위원회")));

        mvc.perform(get("/v1/committee/detail").param("name", "없는위원회"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("해당 위원회를 찾을 수 없습니다."));
    }

    @Test
    void billPageSizeIsClamped() throws Exception {
        when(committeeService.getBills(eq("보건복지위원회"), any()))
                .thenReturn(BillListResponse.of(PaginationResponse.of(true, 0), List.of()));

        mvc.perform(get("/v1/committee/bill").param("name", "보건복지위원회").param("size", "500").param("page", "-3"))
                .andExpect(status().isOk());

        verify(committeeService).getBills("보건복지위원회", PageRequest.of(0, 50));
    }
}
