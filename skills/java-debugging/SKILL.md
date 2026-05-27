---
name: java-debugging
description: Debug Java applications including JVM flags, thread dumps, heap analysis, and common debugging patterns. Use when troubleshooting runtime issues, memory leaks, deadlocks, or performance problems in Java applications.
---

# Java Debugging Skill

## Setup

Ensure you have a JDK installed with `jcmd`, `jstack`, and `jmap` available:

```bash
java -version  # Should show JDK, not just JRE
jcmd --help    # Verify diagnostic tools are available
```

## Debugging Workflow

### 1. Check JVM Status

```bash
# List all Java processes with their PIDs
jcmd | grep -i java

# Get detailed VM info for a specific PID
jcmd <pid> VM.info
```

### 2. Thread Analysis

```bash
# Get thread dump (equivalent to jstack)
jcmd <pid> Thread.print > thread-dump.txt

# Get thread states summary
jcmd <pid> Thread.print | grep -E "java.lang.Thread.State|\".*\""
```

**Common thread states to look for:**
- `BLOCKED` — waiting for a monitor lock (potential deadlock)
- `WAITING` — waiting indefinitely (LockSupport.park, Object.wait)
- `TIMED_WAITING` — waiting with a timeout (Thread.sleep, wait(timeout))
- `RUNNABLE` — actively executing or waiting for CPU

### 3. Deadlock Detection

```bash
# Detect deadlocks automatically via thread dump
jcmd <pid> Thread.print | grep -A 10 "Found deadlock"

# Check for blocked threads
jcmd <pid> Thread.print | grep -B 5 "BLOCKED"
```

### 4. Memory Analysis

```bash
# Get heap dump (use with caution in production)
jcmd <pid> GC.heap_dump /tmp/heap.hprof

# Get class histogram (memory usage by class)
jcmd <pid> GC.class_histogram | head -50

# Check memory pools and native memory
jcmd <pid> VM.native_memory summary 2>/dev/null || jcmd <pid> VM.flags | grep -i native
```

### 5. JVM Flags for Debugging

Common flags to add when starting the application:

```bash
# Basic debugging (add via java_run tool or mvn command)
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/tmp/heapdump.hprof
-Xlog:gc*:file=gc.log:time,uptime

# Thread debugging
-XX:+PrintConcurrentLocks
-XX:+UnlockDiagnosticVMOptions -XX:+PrintDeadlockedThreads

# Performance profiling (JDK 21+)
-XX:StartFlightRecording=filename=/tmp/profile.jfr,duration=60s
```

## Common Issues & Fixes

### OutOfMemoryError

| Error | Cause | Fix |
|-------|-------|-----|
| `java.lang.OutOfMemoryError: Java heap space` | Heap too small or memory leak | Increase `-Xmx`, analyze heap dump with `jcmd <pid> GC.class_histogram` |
| `java.lang.OutOfMemoryError: Metaspace` | Too many classes loaded (dynamic proxies, CGLIB) | Increase `-XX:MaxMetaspaceSize`, check for classloader leaks |
| `java.lang.OutOfMemoryError: Direct buffer memory` | NIO direct buffers not GC'd | Reduce buffer size, ensure proper cleanup in `finally` blocks |
| `java.lang.OutOfMemoryError: GC overhead limit exceeded` | GC spending >98% time recovering <2% heap | Increase heap, find memory leak, or disable with `-XX:-UseGCOverheadLimit` |

### Slow Performance

1. **CPU-bound**: Use `jcmd <pid> Thread.print` to find hot threads, check for infinite loops or expensive operations
2. **GC pressure**: Check GC logs with `jcmd <pid> VM.flags | grep -i gc`
3. **Lock contention**: Look for BLOCKED threads in thread dumps

### Spring Boot Specific Debugging

```bash
# Enable debug logging for specific packages via application.yml
logging:
  level:
    org.springframework.web: DEBUG
    com.yourpackage: TRACE

# Actuator endpoints (if spring-boot-starter-actuator is present)
curl http://localhost:8080/actuator/threaddump
curl http://localhost:8080/actuator/metrics/jvm.memory.used
curl http://localhost:8080/actuator/env

# Enable debug mode (shows condition evaluation report)
./mvnw spring-boot:run -Dspring-boot.run.arguments="--debug"
```

## Debugging with the Toolkit

### Using `java_run` for debugging sessions:
```bash
# Start app with debug flags via maven_run (java_run doesn't support custom JVM args directly)
maven_run(projectDir=".", goals="spring-boot:run -Dspring-boot.run.jvmArguments=\"-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005\"")
```

### Stopping a running app:
```bash
# Use java_stop to gracefully terminate an app started with java_run
java_stop(projectDir=".")
```

### Using `java_dependency_tree` for dependency conflicts:
When you see `NoSuchMethodError` or version conflicts, run:
```bash
java_dependency_tree(projectDir=".")
# Look for conflicting versions in the output tree
```

> **Note**: `java_run`, `maven_run`, `java_stop`, and `java_dependency_tree` are provided by the **Java Spring Tools** extension (`java-spring-tools.ts`). This skill provides the debugging methodology and JVM diagnostics guidance; the tools above are used to execute those strategies.

## Tips

- Always capture thread dumps with `jcmd` rather than `kill -3` for cleaner output
- Use `-XX:+HeapDumpOnOutOfMemoryError` in production environments
- For long-running issues, enable GC logging: `-Xlog:gc*:file=gc.log:time,uptime`
- Use `jstat -gc <pid> 1000` for real-time GC monitoring
- In Spring Boot, use `@ConditionalOnProperty` to enable debug-only beans
