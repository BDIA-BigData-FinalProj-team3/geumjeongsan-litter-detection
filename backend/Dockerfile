# ===== 1) Build Stage =====
FROM gradle:8.7-jdk21 AS builder
WORKDIR /app

COPY . .
RUN gradle clean bootJar --no-daemon


# ===== 2) Run Stage =====
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy built jar from build stage
COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
