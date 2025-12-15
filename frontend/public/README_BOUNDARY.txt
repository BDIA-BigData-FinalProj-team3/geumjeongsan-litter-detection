금정산 경계(마스크) 파일 안내

1) 기본(자동 생성) 경계
- 파일: /geumjeongsan_boundary.geojson
- 생성: `npm run generate:geumjeong-boundary`

2) 공식/정식 경계(있으면 우선 적용)
- 파일: /geumjeongsan_boundary_official.geojson
- 이 파일이 존재하면 MainMap은 이 파일을 최우선으로 로드합니다.

즉, 공식 경계 GeoJSON을 구해서 위 파일명으로 넣기만 하면 코드 수정 없이 즉시 “공식 경계”로 마스크가 바뀝니다.


