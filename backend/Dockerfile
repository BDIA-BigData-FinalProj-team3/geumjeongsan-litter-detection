# ===== 1) Build Stage =====
FROM gradle:8.7-jdk21 AS builder
WORKDIR /app

COPY . .
RUN gradle clean bootJar --no-daemon


# ===== 2) Run Stage =====
FROM eclipse-temurin:21-jre
WORKDIR /app

# Install Python 3 and pip (for fire_detector.py)
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Copy built jar from build stage
COPY --from=builder /app/build/libs/*.jar app.jar

# Copy ai directory (fire_detector.py and dependencies)
COPY --from=builder /app/ai /app/ai

# Install Python dependencies
RUN pip3 install --no-cache-dir -r /app/ai/requirements.txt --break-system-packages || \
    pip3 install --no-cache-dir -r /app/ai/requirements.txt

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
