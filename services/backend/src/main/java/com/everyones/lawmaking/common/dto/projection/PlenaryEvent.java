package com.everyones.lawmaking.common.dto.projection;

import java.time.LocalDate;

public record PlenaryEvent(String billId, LocalDate date, String result) {}
