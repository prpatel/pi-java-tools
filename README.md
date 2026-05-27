# Java tools and extensions for pi

This repo contains pi extensions and skills for Java Spring Boot development. It uses pi (pi.dev) which is a a minimal agentic coding tool and terminal coding harness. Why use pi? It is minimal, has a very small footprint and initial context that it sends to an LLM, hence is fast and lightweight.

This project provides a number of tools to build a Java application - and is a **mini software factory** that will build a complete application from a spec!

This project is currently **BETA** so use with care! It has a minimal permissions gate (the default one built into pi itself). 

## AI Models

I've used this to test the capability of **local** and **cloud** models including:
* Qwen3.6 27B and 35B-A3 (running local!)
* Gemini 3.1 Flash and Pro
* Sonnet 4.6
  
## Getting started

The extension **java-workflow** will take a spec.md file and:

analyze → architect → develop → test → review → fix → verify

Here's how to get started and build a full Java application in **a few mins**

* Go to https://pi.dev/ and install pi using the instructions at the top.
* Select a model to use:
  * You'll get asked on installation to setup an env variable for major providers
  * You can get the config by going to https://pi.dev/models and selecting/searching for provider & model (note that this lists the same model multiple times by provider!)
  * You can also ask pi itself to help configure this! But be warned, it may overwrite your existing ~/.pi/agent/models.json file if you're not careful!
  * use /model within pi select a model
* Let's build an app! Open a new terminal window then type this in:
  * mkdir tmp; cd tmp
  * git clone https://github.com/prpatel/pi-java-tools
  * mkdir spring-boot-todo
  * cd spring-boot-todo
  * pi -e ../pi-java-tools
  * /java-workflow  ../pi-java-tools/example-specs/todo.md

 The pi agent will now start building out todo application!

 the "pi -e" loads the extension only for this specific run of pi. You can install it as a "permanent" extension, see instructions below.

## Next steps

If you're a java developer, you already know how to start this Spring Boot application, but you can just tell pi to do it! Just type this in and hit enter:

```
run the application and open a browser so I can test it
```

You can have a look at the spec file while it's running to see the requirements, structure, standards (like use Java 21 records) etc. Here's the tech stack I put in the spec:

- **Backend Framework**: Spring Boot 3.x
- **Language**: Java 21
- **Build Tool**: Maven
- **Database**: H2 (In-memory) for simplicity
- **Frontend UI**: Thymeleaf (Server-Side Rendering)
- **Frontend Assets**: Standard HTML5, CSS3, Vanilla JavaScript (Fetch API)
- **Testing**: JUnit 5, MockMvc, Mockito

Depending on the model you used, the application may need some bug fixes. You can tell pi to fix them:

```
When I click the checkbox nothing happens. Fix it.
```

Check out the pi docs https://pi.dev/docs/latest, they are quite good... or just ask pi to help you!

If you have questions or suggestions, msg me on LinkedIn: https://www.linkedin.com/in/prpatel/

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
/java-workflow /path/to/pi-java-tools/example-specs/user-api.md
```


## License

MIT
