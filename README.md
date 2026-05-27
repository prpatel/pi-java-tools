# pi-java-tools

Pi extensions and skills for Java Spring Boot development.

## What's included

### Extensions (3)

| Extension | Tools |
|---|---|
| **java-spring-tools** | `spring_initializr`, `maven_run`, `java_run`, `java_stop`, `java_add_dependency`, `java_dependency_tree` |
| **java-qa-tools** | `java_test_runner`, `java_static_analysis`, `java_test_coverage` |
| **java-workflow** | Automated lifecycle: analyze → architect → develop → test → review → fix → verify |

### Skills (8)

| Skill | Role |
|---|---|
| **spec-analyst** | Breaks down specs into requirements, data models, and API contracts |
| **spring-boot-architect** | Scaffolds Spring Boot projects with clean architecture |
| **java-developer** | Writes idiomatic Spring Boot code with TDD |
| **java-qa-engineer** | Writes JUnit 5 / Mockito / TestContainers tests |
| **java-reviewer** | Strict code review: SOLID, security, performance |
| **java-debugging** | JVM debugging, thread dumps, heap analysis |
| **maven-workflow** | Maven builds, dependency management, plugin config |
| **spring-boot-workflow** | Profiles, actuator, testing patterns, deployment |

## Install

### Via git

```bash
pi install git:github.com/prpatel/pi-java-tools@v1.0.0
```

### Try without installing

```bash
pi -e /path/to/pi-java-tools
```

## Usage

Once installed, the tools and skills are auto-discovered in every pi session.

### Run the automated workflow

```
/java-workflow "Create a REST API for user management with CRUD operations"
```

This orchestrates the full lifecycle: spec analysis → scaffolding → implementation → testing → code review → fixes → verification.

### Use individual tools

The LLM automatically uses the appropriate tools based on your requests:

- "Scaffold a Spring Boot project" → `spring_initializr`
- "Run the tests" → `java_test_runner`
- "Start the app" → `java_run`
- "Check coverage" → `java_test_coverage`

## Example Specs

The package includes 3 ready-to-use spec files in `example-specs/`:

| Spec | Complexity | What it builds |
|------|-----------|----------------|
| [user-api.md](example-specs/user-api.md) | ⭐ Basic | User CRUD API with validation, H2, error handling |
| [todo-api.md](example-specs/todo-api.md) | ⭐⭐ Intermediate | Todo API with JWT auth, roles, PostgreSQL |
| [todo.md](example-specs/todo.md) | ⭐⭐⭐ Advanced | Full-stack Todo app with Thymeleaf UI + REST API |

After installing, run one with:

```bash
/java-workflow ~/.pi/agent/git/github.com/prpatel/pi-java-tools/example-specs/user-api.md
```

## License

MIT
