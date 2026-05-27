# Example Specs

Ready-to-use spec files for testing the Java workflow. Run them with:

```bash
/java-workflow /path/to/pi-java-tools/example-specs/user-api.md
```

## Specs

| File | Complexity | What it builds |
|------|-----------|----------------|
| [user-api.md](./user-api.md) | ⭐ Basic | User CRUD API with validation, H2, error handling |
| [todo-api.md](./todo-api.md) | ⭐⭐ Intermediate | Todo API with JWT auth, roles, PostgreSQL |
| [todo.md](./todo.md) | ⭐⭐⭐ Advanced | Full-stack Todo app with Thymeleaf UI + REST API |

## Using with the workflow

```bash
# Start pi, then run:
/java-workflow <path-to-package>/example-specs/user-api.md

# Or use the /skill: command to load a spec:
/skill:user-api
```

## Writing your own specs

Follow the same structure:

1. **Overview** — What you're building
2. **Data Model** — Entities with fields and types
3. **API Endpoints** — Table with method, path, description, status codes
4. **Technical Requirements** — Framework, database, Java version
5. **Testing Requirements** — Unit, integration, edge cases
6. **Dependencies** — Comma-separated list for `spring_initializr`
