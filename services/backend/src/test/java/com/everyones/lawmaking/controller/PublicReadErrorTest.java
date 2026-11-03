package com.everyones.lawmaking.controller;

import com.everyones.lawmaking.facade.BillFacade;
import com.everyones.lawmaking.facade.CongressmanFacade;
import com.everyones.lawmaking.facade.LikeFacade;
import com.everyones.lawmaking.facade.PartyFacade;
import com.everyones.lawmaking.global.error.CongressmanException;
import com.everyones.lawmaking.global.error.GlobalExceptionHandler;
import com.everyones.lawmaking.global.error.PartyException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicReadErrorTest {
    private BillFacade billFacade;
    private CongressmanFacade congressmanFacade;
    private PartyFacade partyFacade;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        billFacade = mock(BillFacade.class);
        congressmanFacade = mock(CongressmanFacade.class);
        partyFacade = mock(PartyFacade.class);
        LikeFacade likeFacade = mock(LikeFacade.class);
        mvc = MockMvcBuilders.standaloneSetup(
                        new BillController(billFacade, likeFacade),
                        new CongressmanController(congressmanFacade, billFacade, likeFacade),
                        new PartyController(partyFacade, billFacade, likeFacade))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @ParameterizedTest
    @CsvSource({"page,-1", "size,0", "size,-1", "stage,없는단계", "page,wrong"})
    void malformedMainFeedFiltersReturnBadRequest(String parameter, String value) throws Exception {
        mvc.perform(get("/v1/bill/mainfeed").param(parameter, value))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
        verifyNoInteractions(billFacade);
    }

    @Test
    void missingCongressmanReturnsNotFound() throws Exception {
        when(congressmanFacade.getCongressman("NOPE_123"))
                .thenThrow(new CongressmanException.CongressmanNotFound());
        mvc.perform(get("/v1/congressman/detail").param("congressman_id", "NOPE_123"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("해당 의원을 찾을 수 없습니다."));
    }

    @Test
    void missingPartyReturnsLocalizedNotFound() throws Exception {
        when(partyFacade.getPartyById(99999L)).thenThrow(new PartyException.PartyNotFound());
        mvc.perform(get("/v1/party/detail").param("party_id", "99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("해당 정당을 찾을 수 없습니다."));
    }
}
