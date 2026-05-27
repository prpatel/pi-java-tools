import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/**
 * Java QA Tools Extension.
 * Provides tools for running tests, generating coverage reports, and executing QA processes in Java projects.
 */

export default function (pi: ExtensionAPI) {
  // --- java_test_runner tool ---
  pi.registerTool({
    name: "java_test_runner",
    label: "Java Test Runner",
    description:
      "Run JUnit 5 tests via Maven and extract concise test failure reports. Streams output in real-time.",
    promptSnippet: "Run JUnit 5 tests in a Java project",
    promptGuidelines: [
      "Use java_test_runner to execute the full test suite or a specific test class.",
      "Exit code 0 = all tests passed, non-zero = failures.",
      "Use testClass parameter to run a single test class for faster feedback.",
    ],
    parameters: Type.Object({
      projectDir: Type.String({ description: "Path to the project directory containing mvnw" }),
      testClass: Type.Optional(Type.String({ description: "Optional specific test class to run (e.g., MyServiceTest)" })),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const { spawn } = await import("node:child_process");

      const args = ["test"];
      if (params.testClass) {
        args.push(`-Dtest=${params.testClass}`);
      }

      onUpdate?.({ content: [{ type: "text", text: `🧪 Running tests${params.testClass ? ` for ${params.testClass}` : ""}...\n` }] });

      const child = spawn("./mvnw", args, {
        cwd: params.projectDir,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let output: string[] = [];
      const MAX_LINES = 500;

      if (signal) {
        signal.addEventListener("abort", () => {
          if (!child.killed && child.pid) {
            onUpdate?.({ content: [{ type: "text", text: `\n⚠️  Canceling test run...` }] });
            child.kill("SIGTERM");
          }
        });
      }

      child.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        output.push(text);
        if (output.length > MAX_LINES) output = output.slice(-MAX_LINES);
        onUpdate?.({ content: [{ type: "text", text }] });
      });

      child.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        output.push(text);
        if (output.length > MAX_LINES) output = output.slice(-MAX_LINES);
        onUpdate?.({ content: [{ type: "text", text }] });
      });

      return new Promise((resolve) => {
        child.on("error", (err: Error) => {
          resolve({
            content: [{ type: "text", text: `❌ Failed to start tests: ${err.message}` }],
            details: { error: err.message },
            isError: true,
          });
        });

        child.on("exit", (code) => {
          const success = code === 0;

          // Extract failure summary from output
          const fullOutput = output.join("\n");
          let failureSummary = "";

          if (!success) {
            const lines = fullOutput.split("\n");
            const failures: string[] = [];

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              // Capture test summary lines
              if (/Tests run:|Failures:|Errors:|Skipped:/i.test(line)) {
                failures.push(line);
              }
              // Capture failure blocks
              if (/<<< FAILURE!|\[ERROR\].*Failure/i.test(line)) {
                // Capture the next 15 lines of context
                for (let j = i; j < Math.min(i + 15, lines.length); j++) {
                  failures.push(lines[j]);
                }
              }
            }

            failureSummary = failures.length > 0 ? `\n--- Failure Summary ---\n${failures.join("\n")}` : "";
          }

          resolve({
            content: [{ type: "text", text: `\n${success ? '✅' : '❌'} Tests finished with exit code ${code}.${failureSummary}` }],
            details: { exitCode: code ?? 1, command: `./mvnw test${params.testClass ? ` -Dtest=${params.testClass}` : ""}` },
            isError: !success,
          });
        });
      });
    },
  });

  // --- java_static_analysis tool ---
  pi.registerTool({
    name: "java_static_analysis",
    label: "Java Static Analysis",
    description:
      "Run Maven verify phase to check for compilation warnings, Checkstyle violations, PMD issues, and SpotBugs if configured.",
    promptSnippet: "Run static analysis on a Java project",
    promptGuidelines: [
      "Use java_static_analysis to verify code quality before committing.",
      "Runs 'mvn verify -DskipTests' — skips tests but runs all check plugins.",
    ],
    parameters: Type.Object({
      projectDir: Type.String({ description: "Path to the project directory containing mvnw" }),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const { spawn } = await import("node:child_process");

      onUpdate?.({ content: [{ type: "text", text: `🔍 Running static analysis...\n` }] });

      const child = spawn("./mvnw", ["verify", "-DskipTests"], {
        cwd: params.projectDir,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let output: string[] = [];

      if (signal) {
        signal.addEventListener("abort", () => {
          if (!child.killed && child.pid) {
            onUpdate?.({ content: [{ type: "text", text: `\n⚠️  Canceling static analysis...` }] });
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
            content: [{ type: "text", text: `❌ Failed to start static analysis: ${err.message}` }],
            isError: true,
          });
        });

        child.on("exit", (code) => {
          resolve({
            content: [{ type: "text", text: `\n${code === 0 ? '✅' : '❌'} Static analysis finished with exit code ${code}` }],
            details: { exitCode: code ?? 1, command: "./mvnw verify -DskipTests" },
            isError: code !== 0,
          });
        });
      });
    },
  });

  // --- java_test_coverage tool ---
  pi.registerTool({
    name: "java_test_coverage",
    label: "Java Test Coverage",
    description:
      "Run tests with JaCoCo coverage report generation. Outputs HTML report path.",
    promptSnippet: "Generate test coverage report",
    promptGuidelines: [
      "Use java_test_coverage to check how much of the codebase is covered by tests.",
      "Requires JaCoCo plugin in pom.xml (included by default with spring-boot-starter-test).",
    ],
    parameters: Type.Object({
      projectDir: Type.String({ description: "Path to the project directory containing mvnw" }),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const { spawn } = await import("node:child_process");

      onUpdate?.({ content: [{ type: "text", text: `📊 Running tests with JaCoCo coverage...\n` }] });

      const child = spawn("./mvnw", ["test", "jacoco:report"], {
        cwd: params.projectDir,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let output: string[] = [];

      if (signal) {
        signal.addEventListener("abort", () => {
          if (!child.killed && child.pid) {
            onUpdate?.({ content: [{ type: "text", text: `\n⚠️  Canceling coverage report...` }] });
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
            content: [{ type: "text", text: `❌ Failed to generate coverage report: ${err.message}` }],
            isError: true,
          });
        });

        child.on("exit", (code) => {
          const reportPath = `${params.projectDir}/target/site/jacoco/index.html`;
          resolve({
            content: [{ type: "text", text: `\n${code === 0 ? '✅' : '❌'} Coverage report finished with exit code ${code}.\nReport path: ${reportPath}` }],
            details: { exitCode: code ?? 1, command: "./mvnw test jacoco:report", reportPath },
            isError: code !== 0,
          });
        });
      });
    },
  });
}
