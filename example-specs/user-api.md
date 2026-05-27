# User Management API

## Overview
Build a RESTful API for user management with full CRUD operations, validation, and comprehensive testing.

## Functional Requirements

### User Entity
- `id` — UUID, auto-generated primary key
- `name` — String (2-100 characters), required
- `email` — String, valid email format, unique constraint, required
- `createdAt` — Instant, auto-set on creation

### API Endpoints

| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| POST | `/api/users` | Create a new user | 201 Created, 400 Bad Request, 409 Conflict (duplicate email) |
| GET | `/api/users` | List all users (paginated) | 200 OK |
| GET | `/api/users/{id}` | Get user by ID | 200 OK, 404 Not Found |
| PUT | `/api/users/{id}` | Update user (full) | 200 OK, 404 Not Found, 409 Conflict |
| DELETE | `/api/users/{id}` | Delete user | 204 No Content, 404 Not Found |

### Validation Rules
- Name: 2-100 characters, no leading/trailing whitespace
- Email: Must be valid email format (use `@Pattern` annotation)
- Duplicate emails must return 409 Conflict with clear error message

### Error Handling
- Global exception handler (`@ControllerAdvice`) for consistent error responses
- Return structured JSON errors: `{ "timestamp": "...", "status": 400, "error": "Bad Request", "message": "...", "path": "/" }`

## Technical Requirements
- Spring Boot 3.4+ with Java 21
- H2 in-memory database for development/testing
- Spring Data JPA for persistence
- Constructor injection (no `@Autowired` fields)
- Java Records for DTOs (request/response objects)

## Testing Requirements
- Unit tests for `UserService` using Mockito (Arrange-Act-Assert pattern)
- Integration tests for `UserController` using MockMvc
- Repository tests with `@DataJpaTest`
- Test edge cases: duplicate email, invalid input, not found scenarios

## Dependencies (for spring_initializr)
`web,data-jpa,h2,validation`
