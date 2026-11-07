package com.everyones.lawmaking.controller;

import com.everyones.lawmaking.global.BaseResponse;
import com.everyones.lawmaking.repository.PublicSitemapRepository;
import com.everyones.lawmaking.repository.PublicSitemapRepository.Kind;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/discovery/sitemap")
@RequiredArgsConstructor
public class PublicSitemapController {
    private final PublicSitemapRepository sitemap;

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Index(int pageSize, Map<String, Long> counts) {}

    @GetMapping
    public BaseResponse<Index> index() {
        var counts = new LinkedHashMap<String, Long>();
        for (var kind : Kind.values()) counts.put(kind.name(), sitemap.count(kind));
        return BaseResponse.ok(new Index(PublicSitemapRepository.PAGE_SIZE, counts));
    }

    @GetMapping("/{kind}")
    public ResponseEntity<BaseResponse<List<String>>> list(@PathVariable Kind kind, @RequestParam int page) {
        if (page < 0 || page > PublicSitemapRepository.MAX_PAGE) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(BaseResponse.ok(sitemap.list(kind, page)));
    }
}
