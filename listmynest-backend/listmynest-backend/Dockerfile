# ListMyNest API — production JAR (Java 17)
# Multi-stage: builds the Spring Boot fat JAR inside the image (no local Gradle required).
#
# Build:  docker build -t listmynest-api .
# Run:    docker run --env-file .env -e SPRING_PROFILES_ACTIVE=prod -p 8080:8080 listmynest-api

FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

RUN apk add --no-cache bash

COPY gradlew gradlew.bat ./
COPY gradle ./gradle
COPY build.gradle ./
COPY src ./src

RUN chmod +x ./gradlew \
    && ./gradlew bootJar --no-daemon -x test \
    && JAR=$(ls build/libs/*-SNAPSHOT.jar | grep -v plain) \
    && cp "$JAR" /app/app.jar

FROM eclipse-temurin:17-jre-alpine AS runner
WORKDIR /app

RUN addgroup -S listmynest && adduser -S listmynest -G listmynest

COPY --from=build /app/app.jar /app/app.jar

USER listmynest:listmynest
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod

ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-jar", "/app/app.jar"]
