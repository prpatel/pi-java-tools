---
name: spring-boot-workflow
description: Spring Boot development including application structure, auto-configuration, profiles, actuator endpoints, testing patterns, and deployment. Use when building or debugging Spring Boot applications.
---

# Spring Boot Workflow Skill

## Project Structure (Standard Layout)

```
src/main/java/com/example/app/
├── Application.java              # Main class with @SpringBootApplication
├── config/                       # Configuration classes (@Configuration)
│   ├── WebConfig.java            # Custom web MVC config
│   └── SecurityConfig.java       # Spring Security setup
├── controller/                   # REST controllers (@RestController)
│   └── UserController.java
├── service/                      # Business logic (@Service)
│   ├── UserService.java          # Interface
│   └── impl/UserServiceImpl.java # Implementation
├── repository/                   # Data access (Spring Data JPA)
│   └── UserRepository.java       # Extends JpaRepository
├── model/                        # JPA Entity classes (@Entity)
│   └── User.java
├── dto/                          # Data Transfer Objects (Records)
│   ├── CreateUserRequest.java    # Request DTOs
│   └── UserResponse.java         # Response DTOs
├── exception/                    # Global exception handling
│   ├── GlobalExceptionHandler.java  # @ControllerAdvice
│   └── ResourceNotFoundException.java
└── security/                     # Security components
    └── JwtAuthenticationFilter.java

src/test/java/com/example/app/
├── ApplicationTests.java         # @SpringBootTest integration test
├── controller/                   # Controller tests (@WebMvcTest)
│   └── UserControllerTest.java
└── service/                      # Service unit tests (Mockito)
    └── UserServiceImplTest.java

src/main/resources/
├── application.yml               # Main configuration
├── application-dev.yml           # Dev profile overrides
└── application-prod.yml          # Prod profile overrides
```

## Key Annotations Reference

| Annotation | Purpose | Layer |
|-----------|---------|-------|
| `@SpringBootApplication` | Main class marker (auto-config + component scan) | Application |
| `@RestController` | REST controller with @ResponseBody on all methods | Controller |
| `@GetMapping`, `@PostMapping`, etc. | HTTP method routing | Controller |
| `@Service` | Business logic layer component | Service |
| `@Repository` | Data access (enables exception translation) | Repository |
| `@Entity`, `@Table` | JPA entity mapping to database table | Model |
| `@ConfigurationProperties` | Type-safe property binding (preferred over @Value) | Config |
| `@Profile("dev")` | Conditional bean activation per profile | Any |
| `@Transactional` | Declarative transaction management | Service |
| `@ControllerAdvice` + `@ExceptionHandler` | Global exception handling | Exception |

## Auto-Configuration Patterns

Spring Boot auto-configures based on classpath and existing beans:

```java
// Only creates a bean if no other DataSource is defined
@Bean
@ConditionalOnMissingBean(DataSource.class)
public DataSource dataSource() {
    return DataSourceBuilder.create().build();
}

// Only active when a specific class is on the classpath
@Bean
@ConditionalOnClass(RestTemplate.class)
public RestTemplate restTemplate() {
    return new RestTemplate();
}

// Only active when a property is set to true
@Bean
@ConditionalOnProperty(name = "app.feature.enabled", havingValue = "true")
public Feature feature() {
    return new Feature();
}
```

## Profiles & Configuration

### application.yml (Main Config)

```yaml
spring:
  application:
    name: my-app
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate          # Use 'update' in dev, 'validate' in prod
    show-sql: false               # Set true in dev for debugging
    properties:
      hibernate:
        format_sql: true

server:
  port: 8080

app:
  feature:
    enabled: true
```

### Profile-Specific Configs

**application-dev.yml:**
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb       # In-memory DB for dev
  jpa:
    hibernate:
      ddl-auto: create-drop       # Auto-create schema on startup
    show-sql: true                # Log SQL queries

logging:
  level:
    org.springframework.web: DEBUG
    com.example.app: TRACE
```

**application-prod.yml:**
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when-authorized

spring:
  jpa:
    hibernate:
      ddl-auto: validate          # Fail if schema doesn't match entities
```

### Activate Profiles

```bash
# Via command line (use with java_run tool)
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Via environment variable
SPRING_PROFILES_ACTIVE=prod ./mvnw spring-boot:run

# Via application.yml default
spring:
  profiles:
    active: dev
```

## Testing Patterns

### Unit Test (Service Layer with Mockito)

```java
@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    void testCreateUser() {
        // Arrange (Given)
        CreateUserRequest request = new CreateUserRequest("john", "john@example.com");
        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act (When)
        UserResponse response = userService.createUser(request);

        // Assert (Then)
        assertNotNull(response.id());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void testCreateUser_duplicateEmail_throwsException() {
        CreateUserRequest request = new CreateUserRequest("john", "john@example.com");
        when(userRepository.existsByEmail(request.email())).thenReturn(true);

        assertThrows(DuplicateEmailException.class, () -> userService.createUser(request));
    }
}
```

### Integration Test (Controller with MockMvc)

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class UserControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testGetUser() throws Exception {
        mockMvc.perform(get("/api/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("john"));
    }

    @Test
    void testCreateUser() throws Exception {
        CreateUserRequest request = new CreateUserRequest("john", "john@example.com");

        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists());
    }
}
```

### Repository Test (Spring Data JPA)

```java
@DataJpaTest
class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testFindByEmail() {
        User user = new User("john", "john@example.com");
        entityManager.persist(user);
        entityManager.flush();

        Optional<User> found = userRepository.findByEmail("john@example.com");

        assertTrue(found.isPresent());
        assertEquals("john", found.get().getName());
    }
}
```

### Testcontainers (Real Database Integration)

```java
@SpringBootTest
@Testcontainers
class DatabaseIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void testRepositoryWithRealDatabase() {
        // Test with actual PostgreSQL in Docker container
    }
}

// Requires dependency: spring-boot-starter-test + testcontainers + postgresql module
```

## Actuator Endpoints

Add `spring-boot-starter-actuator` for built-in monitoring:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,env,beans
  endpoint:
    health:
      show-details: when-authorized
```

Common endpoints:
| Endpoint | Purpose |
|----------|---------|
| `/actuator/health` | Application health (UP/DOWN) |
| `/actuator/metrics` | Micrometer metrics (JVM, HTTP, etc.) |
| `/actuator/info` | Custom application info |
| `/actuator/env` | Environment properties |
| `/actuator/beans` | All Spring beans in context |
| `/actuator/threaddump` | Thread dump (useful for debugging) |

## Deployment

### Dockerfile (Multi-Stage Build)

```dockerfile
# Stage 1: Build with Maven
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests

# Stage 2: Run with minimal JRE image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Native Image (GraalVM) — Optional

For ultra-fast startup and low memory footprint:

```xml
<plugin>
    <groupId>org.graalvm.buildtools</groupId>
    <artifactId>native-maven-plugin</artifactId>
    <version>0.10.3</version>
    <configuration>
        <mainClass>com.example.Application</mainClass>
    </configuration>
</plugin>

# Build: ./mvnw native:compile
```

## Tips for the Toolkit

- Use `spring_initializr` tool to scaffold with correct dependencies from start.spring.io
- Use constructor injection over `@Autowired` fields for testability
- Prefer `@ConfigurationProperties` with Java Records over `@Value` for type-safe config
- Use `java_run` to start the application (streams output, auto-detects startup)
- Use `java_stop` to terminate a running application gracefully
- Use `@Transactional(readOnly = true)` on read-only service methods for performance
- Enable `spring.jpa.show-sql=true` and `hibernate.format_sql=true` in dev profile
- Use Testcontainers for integration tests with real databases instead of H2
- Add `spring-boot-starter-actuator` for production monitoring and debugging
