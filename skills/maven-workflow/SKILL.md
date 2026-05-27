---
name: maven-workflow
description: Complete Maven workflow including multi-module projects, dependency management, plugin configuration, and build optimization. Use when working with Maven-based Java projects for builds, dependency resolution, or project structure.
---

# Maven Workflow Skill

## Quick Reference

### Common Commands (use via `maven_run` tool)

```bash
mvn compile          # Compile source code only (fastest iteration)
mvn test             # Run tests (includes compile)
mvn package          # Package into JAR/WAR (includes test)
mvn install          # Install to local repo (includes package)
mvn clean            # Remove target directory
mvn clean install    # Full rebuild

# Specific test class (fast feedback)
mvn test -Dtest=MyClassTest

# Specific test method
mvn test -Dtest=MyClassTest#myTestMethod

# Skip tests (for quick packaging)
mvn package -DskipTests

# Dependency analysis
mvn dependency:tree          # Show dependency tree
mvn dependency:analyze       # Find unused/undeclared dependencies
```

## Multi-Module Projects

### Project Structure

```
parent-pom/
├── pom.xml              # Parent POM (packaging: pom)
├── module-api/          # API/interfaces module
│   └── pom.xml
├── module-impl/         # Implementation module (depends on api)
│   └── pom.xml
└── module-web/          # Web/Spring Boot module (depends on impl)
    └── pom.xml
```

### Parent POM Pattern

```xml
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>parent-pom</artifactId>
  <version>1.0-SNAPSHOT</version>
  <packaging>pom</packaging>

  <modules>
    <module>module-api</module>
    <module>module-impl</module>
    <module>module-web</module>
  </modules>

  <!-- Centralized dependency management via BOM -->
  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-dependencies</artifactId>
        <version>${spring-boot.version}</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>

  <!-- Centralized plugin management -->
  <build>
    <pluginManagement>
      <plugins>
        <plugin>
          <groupId>org.apache.maven.plugins</groupId>
          <artifactId>maven-compiler-plugin</artifactId>
          <version>3.12.1</version>
          <configuration>
            <source>21</source>
            <target>21</target>
            <release>21</release>
          </configuration>
        </plugin>
      </plugins>
    </pluginManagement>
  </build>
</project>
```

### Child Module POM

```xml
<parent>
  <groupId>com.example</groupId>
  <artifactId>parent-pom</artifactId>
  <version>1.0-SNAPSHOT</version>
</parent>

<artifactId>module-api</artifactId>

<!-- No need to specify versions for managed dependencies -->
<dependencies>
  <dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-core</artifactId>
  </dependency>
</dependencies>
```

## Dependency Management

### BOM (Bill of Materials)

Use dependency management BOMs to avoid version conflicts:

```xml
<dependencyManagement>
  <dependencies>
    <!-- Spring Boot BOM manages all spring-boot-* versions -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-dependencies</artifactId>
      <version>${spring-boot.version}</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

### Dependency Scopes

| Scope | Compile Time | Test | Runtime | Provided by Container |
|-------|-------------|------|---------|----------------------|
| `compile` (default) | ✅ | ✅ | ✅ | ❌ |
| `provided` | ✅ | ✅ | ❌ | ✅ (e.g., servlet-api) |
| `runtime` | ❌ | ✅ | ✅ | ❌ (e.g., JDBC driver) |
| `test` | ❌ | ✅ | ❌ | ❌ (e.g., JUnit) |

### Excluding Transitive Dependencies

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
  <exclusions>
    <!-- Exclude Tomcat, use Undertow instead -->
    <exclusion>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-tomcat</artifactId>
    </exclusion>
  </exclusions>
</dependency>

<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-undertow</artifactId>
</dependency>
```

## Essential Plugins

### Compiler Plugin (Java 21)

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId>
  <version>3.12.1</version>
  <configuration>
    <source>21</source>
    <target>21</target>
    <release>21</release>
    <parameters>true</parameters>  <!-- Required for Spring reflection -->
    <showWarnings>true</showWarnings>
    <compilerArgs>
      <arg>-Xlint:deprecation</arg>
      <arg>-Xlint:unchecked</arg>
    </compilerArgs>
  </configuration>
</plugin>
```

### Surefire Plugin (Testing)

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.2.3</version>
  <configuration>
    <!-- Include both *Test and *Tests patterns -->
    <includes>
      <include>**/*Test.java</include>
      <include>**/*Tests.java</include>
    </includes>
  </configuration>
</plugin>
```

### JaCoCo Plugin (Coverage)

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.11</version>
  <executions>
    <execution>
      <goals><goal>prepare-agent</goal></goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>prepare-package</phase>
      <goals><goal>report</goal></goals>
    </execution>
  </executions>
</plugin>

# Generate report: mvn test jacoco:report
# Report location: target/site/jacoco/index.html
```

### Exec Plugin (Run main class)

```xml
<plugin>
  <groupId>org.codehaus.mojo</groupId>
  <artifactId>exec-maven-plugin</artifactId>
  <version>3.1.1</version>
  <configuration>
    <mainClass>com.example.Main</mainClass>
  </configuration>
</plugin>

# Run: mvn exec:java
```

## Build Optimization

### Parallel Builds (Multi-Module)

```bash
# Run modules in parallel with 4 threads
mvn clean install -T 4

# Use all available CPU cores
mvn clean install -T 1C
```

### Incremental Builds

Maven is already incremental — only recompiles changed files:
- Use `mvn compile` (not full rebuild) for fast iteration during development
- Always use `./mvnw` wrapper to avoid version mismatches

### Dependency Analysis

```bash
# Find unused dependencies (declared but not used)
mvn dependency:analyze

# Find duplicate dependencies
mvn dependency:tree -Dverbose | grep "omitted for duplicate"

# Find undeclared dependencies (used but not declared)
mvn dependency:analyze -DignoreNonCompile=true
```

## Tips for the Toolkit

- Use `java_add_dependency` tool to add dependencies without manual XML editing
- Use `java_dependency_tree` tool to debug version conflicts (streams output in real-time)
- Use `maven_run` tool for all Maven commands (supports streaming output and cancellation)
- Use `java_run` to start Spring Boot apps (auto-detects startup, streams output)
- Use `java_stop` to terminate running Spring Boot applications
- Always use `<dependencyManagement>` in parent POMs to centralize versions
- Prefer BOM imports over individual version declarations for framework dependencies
