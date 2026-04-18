package com.listmynest.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

/** Local Redis; validateConnection=false so the context starts even if Redis is not running yet. */
@Configuration
@Profile("local")
public class LocalRedisConfig {

    @Bean
    @Primary
    public RedisConnectionFactory localRedisConnectionFactory() {
        RedisStandaloneConfiguration cfg = new RedisStandaloneConfiguration("127.0.0.1", 6379);
        LettuceConnectionFactory factory = new LettuceConnectionFactory(cfg);
        factory.setValidateConnection(false);
        return factory;
    }
}
