import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/**
 * Java Spring Tools Extension.
 * Provides tools for scaffolding, building, and running Spring Boot projects via Maven.
 */

export default function (pi: ExtensionAPI) {
  // --- spring_initializr tool ---
  pi.registerTool({
    name: "spring_initializr",
    label: "Spring Initializr",
    description:
      "Generates a new Spring Boot project using start.spring.io API and extracts it to the specified path.",
    promptSnippet: "Scaffold a new Spring Boot project with Maven",
    promptGuidelines: [
      "Use spring_initializr to bootstrap a new Spring Boot project.",
      "Specify dependencies as comma-separated values (e.g., 'web,data-jpa,h2,validation').",
      "Common dependencies: web, data-jpa, postgresql, mysql, h2, validation, actuator, security, testcontainers.",
    ],
    parameters: Type.Object({
      path: Type.String({ description: "Directory to extract the project to" }),
      groupId: Type.String({ description: "Maven Group ID (e.g., com.example)" }),
      artifactId: Type.String({ description: "Maven Artifact ID (e.g., demo)" }),
      dependencies: Type.String({ description: "Comma-separated list of Spring Boot starters" }),
      javaVersion: Type.Optional(Type.String({ description: "Java version (17, 21)" })),
      bootVersion: Type.Optional(Type.String({ description: "Spring Boot version (e.g., 3.2.5)" })),
    }),
    async execute(_toolCallId, params, _signal, onUpdate, ctx) {
      const javaVer = params.javaVersion || "21";
      const bootVer = params.bootVersion || "3.4.0";
      const url = `https://start.spring.io/starter.zip?type=maven-project&language=java&bootVersion=${bootVer}&baseDir=${params.artifactId}&groupId=${params.groupId}&artifactId=${params.artifactId}&name=${params.artifactId}&description=Spring+Boot+Project&packageName=${params.groupId}.${params.artifactId}&packaging=jar&javaVersion=${javaVer}&dependencies=${params.dependencies}`;

      onUpdate?.({ content: [{ type: "text", text: `Downloading Spring Boot project from start.spring.io...` }] });

      const { execSync } = await import("node:child_process");
      try {
        execSync(`mkdir -p "${params.path}"`);
        execSync(`curl -sL -o "${params.path}/starter.zip" "${url}"`);
        execSync(`cd "${params.path}" && unzip -q starter.zip && rm starter.zip`);
        return {
          content: [{ type: "text", text: `✅ Spring Boot project scaffolded successfully.\n\nPath: ${params.path}/${params.artifactId}\nGroup ID: ${params.groupId}\nArtifact ID: ${params.artifactId}\nJava Version: ${javaVer}\nSpring Boot Version: ${bootVer}\nDependencies: ${params.dependencies}` }],
          details: { path: `${params.path}/${params.artifactId}`, groupId: params.groupId, artifactId: params.artifactId },
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `❌ Failed to scaffold project.\n\nError: ${error.message || error}` }],
          details: { error: error.message },
          isError: true,
        };
      }
    },
  });

  // --- maven_run tool ---
  pi.registerTool({
    name: "maven_run",
    label: "Maven Run",
    description:
      "Run Maven wrapper commands in a specific project directory. Streams output in real-time.",
    promptSnippet: "Run Maven commands for building Java projects",
    promptGuidelines: [
      "Use maven_run to execute Maven goals in a project directory.",
      "Common goals: 'clean compile', 'clean test', 'clean package', 'clean install'.",
      "Use './mvnw' wrapper for consistent builds.",
    ],
    parameters: Type.Object({
      projectDir: Type.String({ description: "Path to the project directory containing mvnw" }),
      goals: Type.String({ description: "Maven goals to run (e.g., 'clean install')" }),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const { spawn } = await import("node:child_process");
      const goalsSplit = params.goals.split(/\s+/);

      // Detect if this is a long-running goal like spring-boot:run
      const isLongRunning = goalsSplit.some(g => g.startsWith("spring-boot:run") || g === "spring-boot:run");

      if (isLongRunning) {
        onUpdate?.({ content: [{ type: "text", text: `🚀 Running Maven (long-running): ${params.goals}\n` }] });
      } else {
        onUpdate?.({ content: [{ type: "text", text: `🔨 Running Maven: ${params.goals}\n` }] });
      }

      const child = spawn("./mvnw", goalsSplit, {
        cwd: params.projectDir,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let output: string[] = [];
      const MAX_OUTPUT_LINES = 200;
      let started = false;
      let mavenFinalized = false; // Stop onUpdate calls after tool resolves

      // Handle cancellation
      if (signal) {
        signal.addEventListener("abort", () => {
          if (!child.killed && child.pid) {
            onUpdate?.({ content: [{ type: "text", text: `\n⚠️  Canceling Maven build...` }] });
            child.kill("SIGTERM");
          }
        });
      }

      child.stdout?.on("data", (data: Buffer) => {
        if (mavenFinalized) return;
        const text = data.toString();
        const lines = text.split("\n");
        for (const line of lines) {
          output.push(line);
          if (output.length > MAX_OUTPUT_LINES) {
            output = output.slice(-MAX_OUTPUT_LINES);
          }

          // Detect Spring Boot startup for long-running goals
          if (isLongRunning && !started) {
            if (/Started \w+ in [\d.]+/i.test(line) || /Tomcat started on port \d+/i.test(line)) {
              started = true;
            }
          }
        }
        onUpdate?.({ content: [{ type: "text", text }] });
      });

      child.stderr?.on("data", (data: Buffer) => {
        if (mavenFinalized) return;
        const text = data.toString();
        output.push(text);
        if (output.length > MAX_OUTPUT_LINES) {
          output = output.slice(-MAX_OUTPUT_LINES);
        }
        onUpdate?.({ content: [{ type: "text", text }] });
      });

      if (!isLongRunning) {
        // Standard short-lived Maven build — wait for exit
        return new Promise((resolve) => {
          child.on("error", (err: Error) => {
            resolve({
              content: [{ type: "text", text: `❌ Failed to start Maven: ${err.message}` }],
              details: { error: err.message },
              isError: true,
            });
          });

          child.on("exit", (code) => {
            const success = code === 0;
            resolve({
              content: [{ type: "text", text: `\n${success ? '✅' : '❌'} Maven ${params.goals} finished with exit code ${code}` }],
              details: { exitCode: code ?? 1, command: `./mvnw ${params.goals}` },
              isError: !success,
            });
          });
        });
      }

      // Long-running process (spring-boot:run) — resolve on startup or timeout
      const timeoutMs = 120_000;
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        if (!started && !timedOut) {
          timedOut = true;
        }
      }, timeoutMs);

      return new Promise((resolve) => {
        const finalize = (success: boolean) => {
          mavenFinalized = true;
          clearTimeout(timeoutId);
          const pid = child.pid;
          const summary = started
            ? `✅ Application started successfully via Maven.${pid !== undefined ? `\nProcess PID: ${pid}` : ''}`
            : timedOut
              ? `⏱️  App is running in the background (timed out waiting for startup message).${pid !== undefined ? `\nProcess PID: ${pid}` : ''}`
              : `❌ Application failed to start.`;

          resolve({
            content: [{ type: "text", text: `\n${summary}\n\n--- Recent output ---\n${output.slice(-30).join("\n")}` }],
            details: { pid: child.pid, started, projectDir: params.projectDir },
            isError: !success,
          });
        };

        child.on("error", (err: Error) => {
          mavenFinalized = true;
          onUpdate?.({ content: [{ type: "text", text: `\n❌ Failed to start Maven: ${err.message}` }] });
          finalize(false);
        });

        child.on("exit", (code) => {
          if (!started && !timedOut) {
            finalize(code === 0);
          }
        });

        // Poll for startup detection or timeout
        const checkDone = () => {
          if (started || timedOut) {
            finalize(true);
          } else {
            setTimeout(checkDone, 500);
          }
        };
        checkDone();
      });
    },
  });

  // --- java_run tool ---
  pi.registerTool({
    name: "java_run",
    label: "Java Run (Spring Boot)",
    description:
      "Run a Spring Boot application using Maven. Streams output in real-time and detects when the app is fully started.",
    promptSnippet: "Run a Spring Boot application",
    promptGuidelines: [
      "Use java_run to start the Spring Boot application for manual testing.",
      "The app runs on port 8080 by default (check application.yml for custom ports).",
      "Output is streamed in real-time. The tool returns once the app reports 'Started' or after 120 seconds.",
      "Use java_stop to terminate a running Spring Boot application.",
    ],
    parameters: Type.Object({
      projectDir: Type.String({ description: "Path to the project directory containing mvnw" }),
      profile: Type.Optional(Type.String({ description: "Spring profile to activate (e.g., dev, test)" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const profileArg = params.profile ? `-Dspring-boot.run.profiles=${params.profile}` : "";
      const projectDir = params.projectDir;
      const profileLabel = params.profile ? ` with profile '${params.profile}'` : "";

      onUpdate?.({ content: [{ type: "text", text: `🚀 Starting Spring Boot application${profileLabel}...\n` }] });

      const { spawn } = await import("node:child_process");
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      // PID file for tracking the running process
      const pidDir = path.join(projectDir, ".pi");
      await fs.mkdir(pidDir, { recursive: true });
      const pidFile = path.join(pidDir, "spring-boot.pid");

      let started = false;
      let finalized = false; // Stop onUpdate calls after tool resolves to avoid "outside active run" errors
      let outputBuffer: string[] = [];
      const MAX_OUTPUT_LINES = 200; // Keep last N lines for summary

      // Build spawn args — omit empty profile arg
      const spawnArgs = ["spring-boot:run"];
      if (profileArg) {
        spawnArgs.push(profileArg);
      }

      // Spawn mvnw directly (not via shell) for better signal handling
      const child = spawn("./mvnw", spawnArgs, {
        cwd: projectDir,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      });

      const pid = child.pid;
      if (pid) {
        await fs.writeFile(pidFile, String(pid));
      }

      // Handle cancellation via signal
      if (signal) {
        signal.addEventListener("abort", () => {
          if (!child.killed && child.pid) {
            onUpdate?.({ content: [{ type: "text", text: `\n⚠️  Canceling Spring Boot application (PID ${child.pid})...` }] });
            child.kill("SIGTERM");
          }
        });
      }

      // Stream stdout
      child.stdout?.on("data", (data: Buffer) => {
        if (finalized) return; // Ignore output after tool has resolved
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;

          outputBuffer.push(line);
          if (outputBuffer.length > MAX_OUTPUT_LINES) {
            outputBuffer = outputBuffer.slice(-MAX_OUTPUT_LINES);
          }

          // Detect Spring Boot startup completion
          // Matches: "Started TodoApplication in 2.98 seconds (process running for 3.263)"
          if (!started && /Started \w+ in [\d.]+/i.test(line)) {
            started = true;
          }
          // Also detect Tomcat startup as a secondary signal
          if (!started && /Tomcat started on port \d+/i.test(line)) {
            started = true;
          }

          onUpdate?.({ content: [{ type: "text", text: line + "\n" }] });
        }
      });

      // Stream stderr
      child.stderr?.on("data", (data: Buffer) => {
        if (finalized) return; // Ignore output after tool has resolved
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;

          outputBuffer.push(`[stderr] ${line}`);
          if (outputBuffer.length > MAX_OUTPUT_LINES) {
            outputBuffer = outputBuffer.slice(-MAX_OUTPUT_LINES);
          }

          onUpdate?.({ content: [{ type: "text", text: `[stderr] ${line}\n` }] });
        }
      });

      // Timeout after 120 seconds if app hasn't started
      const timeoutMs = 120_000;
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        if (!started && !timedOut) {
          timedOut = true;
          onUpdate?.({ content: [{ type: "text", text: `\n⏱️  Timeout reached (${timeoutMs / 1000}s). App may still be starting in the background.` }] });
        }
      }, timeoutMs);

      // Wait for either: started, error, or timeout
      return new Promise((resolve) => {
        const finalize = (success: boolean, exitCode?: number) => {
          finalized = true;
          clearTimeout(timeoutId);

          const summary = started
            ? `✅ Spring Boot application started successfully${profileLabel}.\n\nProcess PID: ${pid}\nTo stop: use java_stop tool or kill -15 ${pid}`
            : timedOut
              ? `⏱️  Spring Boot application is running in the background (timed out waiting for 'Started' message).\n\nProcess PID: ${pid}\nTo stop: use java_stop tool or kill -15 ${pid}`
              : `❌ Spring Boot application failed to start (exit code: ${exitCode}).`;

          resolve({
            content: [{ type: "text", text: `\n${summary}\n\n--- Recent output ---\n${outputBuffer.slice(-30).join("\n")}` }],
            details: {
              exitCode: exitCode ?? 0,
              pid,
              started,
              projectDir,
            },
            isError: !success && exitCode !== undefined,
          });
        };

        child.on("error", (err: Error) => {
          finalized = true;
          onUpdate?.({ content: [{ type: "text", text: `\n❌ Failed to start process: ${err.message}` }] });
          finalize(false);
        });

        child.on("exit", (code) => {
          if (!started && !timedOut) {
            finalize(code === 0, code);
          }
        });

        // Resolve once started or timed out
        const checkDone = () => {
          if (started || timedOut) {
            finalize(true);
          } else {
            setTimeout(checkDone, 500);
          }
        };
        checkDone();
      });
    },
  });

  // --- java_stop tool ---
  pi.registerTool({
    name: "java_stop",
    label: "Java Stop (Spring Boot)",
    description:
      "Stop a running Spring Boot application that was started with java_run.",
    promptSnippet: "Stop a running Spring Boot application",
    promptGuidelines: [
      "Use java_stop to gracefully terminate a Spring Boot application.",
      "Sends SIGTERM first, then SIGKILL after 5 seconds if the process doesn't exit.",
    ],
    parameters: Type.Object({
      projectDir: Type.String({ description: "Path to the project directory containing mvnw" }),
    }),
    async execute(_toolCallId, params, _signal, onUpdate, ctx) {
      const { readFileSync, unlinkSync } = await import("node:fs");
      const { spawn } = await import("node:child_process");
      const path = await import("node:path");

      const pidFile = path.join(params.projectDir, ".pi", "spring-boot.pid");

      try {
        const pid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);

        if (!pid || isNaN(pid)) {
          return { content: [{ type: "text", text: `⚠️  No valid PID found in ${pidFile}` }], isError: true };
        }

        onUpdate?.({ content: [{ type: "text", text: `Stopping Spring Boot application (PID ${pid})...` }] });

        // Try graceful shutdown first
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          return { content: [{ type: "text", text: `⚠️  Process ${pid} is not running.` }] };
        }

        // Wait up to 5 seconds for graceful shutdown
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            try {
              process.kill(pid, 0); // Check if process exists
            } catch {
              clearInterval(checkInterval);
              resolve();
            }
          }, 500);

          setTimeout(() => {
            clearInterval(checkInterval);
            // Force kill if still running
            try {
              process.kill(pid, "SIGKILL");
              onUpdate?.({ content: [{ type: "text", text: `\n⚠️  Process didn't stop gracefully. Sent SIGKILL.` }] });
            } catch {
              // Already dead
            }
            resolve();
          }, 5000);
        });

        // Clean up PID file
        try {
          unlinkSync(pidFile);
        } catch {
          // Ignore
        }

        return { content: [{ type: "text", text: `✅ Spring Boot application (PID ${pid}) stopped.` }] };
      } catch (err: any) {
        if (err.code === "ENOENT") {
          return { content: [{ type: "text", text: `⚠️  No running Spring Boot application found (PID file missing).` }] };
        }
        return { content: [{ type: "text", text: `❌ Failed to stop application: ${err.message}` }], isError: true };
      }
    },
  });

  // --- java_add_dependency tool ---
  pi.registerTool({
    name: "java_add_dependency",
    label: "Java Add Dependency",
    description:
      "Add a dependency to the project's pom.xml. Supports Maven Central coordinates.",
    promptSnippet: "Add dependencies to Java project build files",
    promptGuidelines: [
      "Use java_add_dependency when a new library is needed.",
      "If version is omitted, the Spring Boot BOM will manage it if available.",
    ],
    parameters: Type.Object({
      projectDir: Type.String({ description: "Path to the project directory containing pom.xml" }),
      groupId: Type.String({ description: "Maven group ID (e.g., org.springframework.boot)" }),
      artifactId: Type.String({ description: "Maven artifact ID (e.g., spring-boot-starter-web)" }),
      version: Type.Optional(Type.String({ description: "Version (optional if managed by BOM)" })),
      scope: Type.Optional(Type.String({ description: "Dependency scope (compile, provided, runtime, test)" })),
    }),
    async execute(_toolCallId, params, _signal, onUpdate, ctx) {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      const pomPath = path.join(params.projectDir, "pom.xml");
      let pom: string;

      try {
        pom = await fs.readFile(pomPath, "utf-8");
      } catch {
        return { content: [{ type: "text", text: `❌ pom.xml not found at ${pomPath}` }], isError: true };
      }

      const versionTag = params.version ? `        <version>${params.version}</version>\n` : "";
      const scopeTag = params.scope && params.scope !== "compile" ? `        <scope>${params.scope}</scope>\n` : "";

      const dependency = `    <dependency>
        <groupId>${params.groupId}</groupId>
        <artifactId>${params.artifactId}</artifactId>
${versionTag}${scopeTag}    </dependency>`;

      if (pom.includes("</dependencies>")) {
        pom = pom.replace("</dependencies>", `    ${dependency}\n  </dependencies>`);
      } else {
        pom = pom.replace("</project>", `  <dependencies>\n${dependency}\n  </dependencies>\n</project>`);
      }

      await fs.writeFile(pomPath, pom);

      return {
        content: [{ type: "text", text: `✅ Added dependency to pom.xml:\n\n${dependency}` }],
        details: { groupId: params.groupId, artifactId: params.artifactId },
      };
    },
  });

  // --- java_dependency_tree tool ---
  pi.registerTool({
    name: "java_dependency_tree",
    label: "Java Dependency Tree",
    description:
      "Display the Maven dependency tree for a project. Useful for debugging version conflicts and transitive dependencies.",
    promptSnippet: "Show Maven dependency tree",
    parameters: Type.Object({
      projectDir: Type.String({ description: "Path to the project directory containing mvnw" }),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const { spawn } = await import("node:child_process");

      onUpdate?.({ content: [{ type: "text", text: `🌳 Fetching dependency tree...\n` }] });

      const child = spawn("./mvnw", ["dependency:tree", "-Dverbose"], {
        cwd: params.projectDir,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let output: string[] = [];

      if (signal) {
        signal.addEventListener("abort", () => {
          if (!child.killed && child.pid) {
            child.kill("SIGTERM");
          }
        });
      }

      child.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        output.push(text);
        onUpdate?.({ content: [{ type: "text", text }] });
      });

      child.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        output.push(text);
        onUpdate?.({ content: [{ type: "text", text }] });
      });

      return new Promise((resolve) => {
        child.on("error", (err: Error) => {
          resolve({
            content: [{ type: "text", text: `❌ Failed to fetch dependency tree: ${err.message}` }],
            isError: true,
          });
        });

        child.on("exit", (code) => {
          resolve({
            content: [{ type: "text", text: code === 0 ? `\n✅ Dependency tree fetched.` : `\n❌ Failed (exit code ${code})` }],
            details: { exitCode: code ?? 1 },
            isError: code !== 0,
          });
        });
      });
    },
  });
}
