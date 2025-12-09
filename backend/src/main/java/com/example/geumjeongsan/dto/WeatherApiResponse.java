package com.example.geumjeongsan.dto;

import lombok.Data;
import java.util.List;

@Data
public class WeatherApiResponse {
    private Response response;
    
    @Data
    public static class Response {
        private Body body;
    }
    
    @Data
    public static class Body {
        private Items items;
    }
    
    @Data
    public static class Items {
        private List<Item> item;
    }
    
    @Data
    public static class Item {
        private String category;
        private String obsrValue;
    }
}

