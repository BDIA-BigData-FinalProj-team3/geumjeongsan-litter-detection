package com.example.geumjeongsan.api.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class MediaConcatRequest {
    /**
     * 합칠 영상 URL 2개 (순서대로 이어붙임)
     */
    private List<String> urls;

    /**
     * 기본: stream copy(-c copy) 시도 후 실패하면 re-encode로 fallback
     */
    private boolean reencodeFallback = true;
}


