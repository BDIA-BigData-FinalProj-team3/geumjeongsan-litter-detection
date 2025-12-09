# Geumjeongsan Backend

Spring Boot 기반 백엔드 애플리케이션

## 기술 스택

- Java 24
- Spring Boot 3.3.0
- Gradle 9.2.1

## 실행 방법

### 로컬 실행

```bash
./gradlew bootRun
```

또는 환경변수와 함께:

```bash
export DEPLOYMENT_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
export BUILD_NUMBER=123
export COMMIT_SHA=abc1234
export ENVIRONMENT=local

./gradlew bootRun
```

### 빌드

```bash
./gradlew clean build
```

## API 엔드포인트

### 헬스체크
```
GET /health
```

응답:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 배포정보
```
GET /deployment-info
```

응답:
```json
{
  "deployment_time": "2024-01-15T10:30:00Z",
  "build_number": "123",
  "commit_sha": "abc1234",
  "environment": "test"
}
```

## 테스트

```bash
# 헬스체크
curl http://localhost:8080/health

# 배포정보
curl http://localhost:8080/deployment-info
```

