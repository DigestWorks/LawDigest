package com.everyones.lawmaking.controller;

import com.everyones.lawmaking.common.dto.response.SearchBillResponse;
import com.everyones.lawmaking.common.dto.response.PaginationResponse;
import com.everyones.lawmaking.facade.SearchFacade;
import com.everyones.lawmaking.global.error.GlobalExceptionHandler;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SearchControllerTest {
    private SearchFacade facade;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        facade = mock(SearchFacade.class);
        mvc = MockMvcBuilders.standaloneSetup(new SearchController(facade))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"김", " ", "@@", "%%", "*", "()"})
    void invalidBillInputIsBadRequest(String keyword) throws Exception {
        mvc.perform(get("/v1/search/bill").param("search_word", keyword).param("page", "0"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(facade);
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "wrong"})
    void invalidPageIsBadRequest(String page) throws Exception {
        mvc.perform(get("/v1/search/bill").param("search_word", "소방").param("page", page))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(facade);
    }

    @Test
    void parenthesizedBillNameReachesSearch() throws Exception {
        when(facade.searchBill("의료법(대안)", 0)).thenReturn(SearchBillResponse.builder()
                .searchResponse(List.of()).paginationResponse(PaginationResponse.of(true, 0)).build());
        mvc.perform(get("/v1/search/bill").param("search_word", " 의료법(대안) ").param("page", "0"))
                .andExpect(status().isOk());
        verify(facade).searchBill("의료법(대안)", 0);
    }

    @Test
    void blankPersonInputIsBadRequest() throws Exception {
        mvc.perform(get("/v1/search/congressman/party").param("search_word", " "))
                .andExpect(status().isBadRequest());
    }
}
