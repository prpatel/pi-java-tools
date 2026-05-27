# Todo API with Authentication

## Overview
A task management REST API with JWT-based authentication, role-based access control, and PostgreSQL persistence.

## Functional Requirements

### User Entity
- `id` — UUID primary key
- `username` — String (3-50 chars), unique, required
- `passwordHash` — String, BCrypt hashed, never exposed in API responses
- `role` — Enum: `USER`, `ADMIN`

### Todo Entity
- `id` — UUID primary key
- `title` — String (1-200 chars), required
- `description` — Text, optional
- `completed` — Boolean, default false
- `dueDate` — LocalDate, optional
- `ownerId` — UUID, foreign key to User (cascade delete)

### API Endpoints

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user (returns JWT) |
| POST | `/api/auth/login` | Login with credentials (returns JWT) |

#### Todos (Protected — requires valid JWT)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/todos` | List user's todos (filter by completed, sort by dueDate) |
| POST | `/api/todos` | Create todo |
| GET | `/api/todos/{id}` | Get todo by ID (must own it) |
| PUT | `/api/todos/{id}` | Update todo (must own it) |
| DELETE | `/api/todos/{id}` | Delete todo (must own it) |

#### Admin Only
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users (no passwords) |

### Security
- JWT tokens with 24-hour expiration
- Passwords hashed with BCrypt (strength 12)
- `@PreAuthorize` annotations for role-based access control
- Users can only access their own todos

## Technical Requirements
- Spring Boot 3.4+ with Java 21
- PostgreSQL database (use Testcontainers for integration tests)
- Spring Security with JWT authentication filter
- Constructor injection throughout
- Java Records for DTOs

## Testing Requirements
- Unit tests: `TodoService`, `AuthService` with Mockito
- Integration tests: Controller endpoints with MockMvc + JWT setup
- Security tests: Verify unauthorized access returns 401, wrong role returns 403
- Testcontainers for PostgreSQL integration tests

## Dependencies (for spring_initializr)
`web,data-jpa,postgresql,security,validation,testcontainers`
