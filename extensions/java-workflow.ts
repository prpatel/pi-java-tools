import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

/**
 * Java Spring Boot Workflow Extension.
 * 
 * Automated iteration with clean review context:
 * 1. Analyze spec (spec-analyst)
 * 2. Architect & scaffold (spring-boot-architect)
 * 3. Develop implementation (java-developer)
 * 4. Run tests (java-qa-engineer) — deterministic validation via exit codes
 * 5. Review code (java-reviewer) — FRESH context, no implementation bias
 * 6. Fix issues (back to full context)
 * 7. Verify final state
 * 
 * Key features:
 * - Automated iteration cycle (no manual "now review" prompts)
 * - Context compaction before review (clean slate)
 * - Deterministic test validation (parse actual exit codes)
 * - State persistence across long tasks
 */

type JavaWorkflowStage = "analyze" | "architect" | "develop" | "test" | "review" | "fix" | "verify" | "done";

interface JavaWorkflow {
  active: boolean;
  stage: JavaWorkflowStage;
  spec: string;
  iteration: number;
  maxIterations: number;
  testsPassed: boolean;
  reviewIssues: string[];
  contextCompacted: boolean;
}

const STAGE_DESCRIPTIONS: Record<JavaWorkflowStage, string> = {
  "analyze": "📋 Analyzing Spec",
  "architect": "🏗️ Architecting & Scaffolding",
  "develop": "💻 Writing Implementation",
  "test": "🧪 Running Tests",
  "review": "🔍 Code Review (Clean Context)",
  "fix": "🔧 Fixing Issues",
  "verify": "✅ Final Verification",
  "done": "🎉 Complete",
};

export default function (pi: ExtensionAPI) {
  let workflow: JavaWorkflow | null = null;

  // Restore state from session history
  pi.on("session_start", async (_event, ctx) => {
    workflow = null;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === "java-workflow-state") {
        workflow = entry.data as JavaWorkflow;
      }
    }
    if (workflow?.active) {
      updateStatus(ctx);
    }
  });

  const updateStatus = (ctx: any) => {
    if (workflow?.active) {
      const desc = STAGE_DESCRIPTIONS[workflow.stage];
      ctx.ui.setStatus("java-workflow", `${desc} (${workflow.iteration}/${workflow.maxIterations})`);
      pi.appendEntry("java-workflow-state", workflow);
    } else {
      ctx.ui.setStatus("java-workflow", undefined);
    }
  };

  // --- /java-workflow command ---
  pi.registerCommand("java-workflow", {
    description: "Start the full Java lifecycle workflow based on a spec file or prompt.",
    handler: async (args, ctx) => {
      let spec = args || "";

      // Read from file if provided
      if (spec.endsWith(".md") || spec.endsWith(".txt")) {
        try {
          const fs = await import("node:fs/promises");
          spec = await fs.readFile(spec, "utf-8");
        } catch (error) {
          ctx.ui.notify(`Could not read file: ${spec}`, "error");
          return;
        }
      }

      // Or open editor for manual input
      if (!spec) {
        spec = await ctx.ui.editor(
          "Enter feature description or spec:",
          "# Feature\n\nCreate a REST API for user management with CRUD operations.\nInclude JUnit 5 tests and proper error handling."
        );

        if (!spec) {
          ctx.ui.notify("Description required", "error");
          return;
        }
      }

      workflow = {
        active: true,
        stage: "analyze",
        spec,
        iteration: 0,
        maxIterations: 15,
        testsPassed: false,
        reviewIssues: [],
        contextCompacted: false,
      };

      updateStatus(ctx);

      pi.sendMessage({
        customType: "java-workflow",
        content: [
          "🚀 **Java Spring Boot Workflow Started**",
          "",
          "**Spec:**",
          "```",
          spec,
          "```",
          "",
          "**How this works:**",
          "1. **Analyze** — Break down the spec into requirements and data models",
          "2. **Architect** — Scaffold Spring Boot project with Maven via start.spring.io",
          "3. **Develop** — Implement controllers, services, repositories",
          "4. **Test** — Run JUnit 5 tests (deterministic exit code validation)",
          "5. **Review** — Context is compacted for unbiased code review",
          "6. **Fix** — Address any issues found in testing or review",
          "7. **Verify** — Final test run and confirmation",
          "",
          "All automatic — just watch!",
          "",
          `**Stage 1: ${STAGE_DESCRIPTIONS["analyze"]}**`,
        ].join("\n"),
        display: true,
      });

      // Start the workflow with spec analysis
      pi.sendUserMessage(
        "You are the 'spec-analyst'. Read this spec and break it down into: 1) Functional requirements, 2) Data models/entities needed, 3) REST API endpoints. Then call java_workflow_next to proceed.",
        { deliverAs: "followUp" }
      );
    },
  });

  // --- /java-workflow:status command ---
  pi.registerCommand("java-workflow:status", {
    description: "Check the current workflow status.",
    handler: async (_args, ctx) => {
      if (!workflow?.active) {
        ctx.ui.notify("No active workflow", "info");
        return;
      }

      const status = [
        `**Stage**: ${STAGE_DESCRIPTIONS[workflow.stage]}`,
        `**Iteration**: ${workflow.iteration}/${workflow.maxIterations}`,
        `**Tests**: ${workflow.testsPassed ? "✅ Passing" : "❌ Not passing"}`,
        `**Review Issues**: ${workflow.reviewIssues.length}`,
        `**Context**: ${workflow.contextCompacted ? "Compacted (clean)" : "Full"}`,
      ].join("\n");

      pi.sendMessage({ customType: "java-workflow", content: status, display: true });
    },
  });

  // --- /java-workflow:cancel command ---
  pi.registerCommand("java-workflow:cancel", {
    description: "Cancel the current workflow.",
    handler: async (_args, ctx) => {
      if (!workflow?.active) {
        ctx.ui.notify("No active workflow to cancel", "info");
        return;
      }

      workflow.active = false;
      updateStatus(ctx);
      ctx.ui.notify("Workflow cancelled", "info");
      workflow = null;
    },
  });

  // --- java_workflow_next tool ---
  pi.registerTool({
    name: "java_workflow_next",
    label: "Next Workflow Stage",
    description: "Move to the next stage of the Java workflow. Call when current stage is complete.",
    parameters: Type.Object({ notes: Type.Optional(Type.String({ description: "Notes about what was completed" })) }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!workflow?.active) {
        return { content: [{ type: "text", text: "❌ No active workflow" }], details: {} };
      }

      workflow.iteration++;

      if (workflow.iteration >= workflow.maxIterations) {
        workflow.active = false;
        updateStatus(ctx);
        return { content: [{ type: "text", text: "⚠️ Maximum iterations reached. Workflow complete." }], details: { workflow } };
      }

      let nextStage: JavaWorkflowStage;
      let message: string;
      let nextPrompt: string | null = null;

      switch (workflow.stage) {
        case "analyze":
          nextStage = "architect";
          message = "✅ Spec analyzed!\n\n**Stage 2: Architecting & Scaffolding**\n\nScaffolding Spring Boot project...";
          nextPrompt = "You are the 'spring-boot-architect'. Use spring_initializr to scaffold the project based on the spec. Include all necessary dependencies (web, data-jpa, validation, etc.). Set up standard folder structure. When done, call java_workflow_next.";
          break;

        case "architect":
          nextStage = "develop";
          message = "✅ Project scaffolded!\n\n**Stage 3: Writing Implementation**\n\nImplementing the feature...";
          nextPrompt = "You are the 'java-developer'. Read the spec and implement all features: controllers, services, repositories, entities, DTOs. Use modern Java (records, constructor injection). When done, call java_workflow_next.";
          break;

        case "develop":
          nextStage = "test";
          message = "✅ Implementation done!\n\n**Stage 4: Running Tests**\n\nRunning test suite...";
          nextPrompt = "You are the 'java-qa-engineer'. Write comprehensive JUnit 5 tests for all services and controllers. Use Mockito for unit tests, @SpringBootTest for integration tests. Run java_test_runner to execute tests. Call java_workflow_test_result with the exit code.";
          break;

        case "test":
          if (workflow.testsPassed) {
            nextStage = "review";
            message = "✅ Tests passed!\n\n**Stage 5: Code Review (Clean Context)**\n\nCompacting context for unbiased review...";

            // CRITICAL: Compact context before review to remove implementation bias
            await new Promise<void>((resolve) => {
              ctx.compact({
                customInstructions: "Keep only: 1) The original spec/description, 2) List of files created/modified, 3) Brief summary of what was implemented. Remove all implementation details, debugging thoughts, and conversation history.",
                onComplete: () => {
                  if (workflow) {
                    workflow.contextCompacted = true;
                    updateStatus(ctx);
                  }
                  resolve();
                },
              });
            });

            nextPrompt = "You are the 'java-reviewer'. Review all code files with fresh eyes. Check for: 1) Code quality and readability, 2) Test coverage gaps, 3) Edge cases not handled, 4) Error handling completeness, 5) Security issues (SQL injection, auth), 6) Performance issues (N+1 queries). Call java_workflow_review_result with your findings.";
          } else {
            nextStage = "fix";
            message = "❌ Tests failed!\n\n**Stage 6: Fixing Issues**\n\nFixing test failures...";
            nextPrompt = "You are the 'java-developer'. Review the test output above, identify the failures, and fix the code. When done, call java_workflow_next to re-run tests.";
          }
          break;

        case "fix":
          nextStage = "test";
          message = "🔧 Fixes applied!\n\n**Stage 4: Re-testing**\n\nVerifying fixes with test suite...";
          nextPrompt = "You are the 'java-qa-engineer'. Re-run the test suite using java_test_runner. Call java_workflow_test_result with the exit code.";
          break;

        case "review":
          if (workflow.reviewIssues.length === 0) {
            nextStage = "verify";
            message = "✅ Code review passed!\n\n**Stage 7: Final Verification**\n\nRunning final verification...";
            nextPrompt = "Run the full test suite one final time using java_test_runner to ensure everything works. Then call java_workflow_complete with a summary of what was built.";
          } else {
            nextStage = "fix";
            message = `📋 Review found ${workflow.reviewIssues.length} issue(s)\n\n**Stage 6: Fixing Issues**\n\nAddressing review feedback...`;
            nextPrompt = `You are the 'java-developer'. Fix these issues from the code review:\n${workflow.reviewIssues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}\n\nWhen done, call java_workflow_next to re-test.`;
          }
          break;

        case "verify":
          nextStage = "done";
          workflow.active = false;
          message = "🎉 **Workflow Complete!**\n\nAll stages passed successfully.";
          nextPrompt = null;
          break;

        default:
          nextStage = "done";
          message = "✅ Complete";
          nextPrompt = null;
      }

      workflow.stage = nextStage;
      workflow.contextCompacted = false; // Reset for next cycle
      updateStatus(ctx);

      if (nextPrompt) {
        pi.sendUserMessage(nextPrompt, { deliverAs: "followUp" });
      }

      return { content: [{ type: "text", text: message }], details: { workflow, stage: nextStage, notes: params.notes } };
    },
  });

  // --- java_workflow_test_result tool ---
  pi.registerTool({
    name: "java_workflow_test_result",
    label: "Report Test Result",
    description: "Report test execution result with exit code for deterministic validation.",
    parameters: Type.Object({
      exitCode: Type.Number({ description: "Exit code from test command (0 = pass, non-zero = fail)" }),
      output: Type.Optional(Type.String({ description: "Test output summary" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!workflow?.active) {
        return { content: [{ type: "text", text: "❌ No active workflow" }], details: {} };
      }

      // DETERMINISTIC: Parse actual exit code, not fuzzy text
      workflow.testsPassed = params.exitCode === 0;

      let message: string;
      if (workflow.testsPassed) {
        message = `✅ Tests passed! (exit code: ${params.exitCode})`;
      } else {
        message = `❌ Tests failed (exit code: ${params.exitCode})`;
        if (params.output) {
          message += `\n\nOutput:\n${params.output.substring(0, 500)}`;
        }
      }

      updateStatus(ctx);
      pi.sendUserMessage("Call java_workflow_next to progress to the next stage.", { deliverAs: "followUp" });

      return { content: [{ type: "text", text: message }], details: { workflow, testsPassed: workflow.testsPassed, exitCode: params.exitCode } };
    },
  });

  // --- java_workflow_review_result tool ---
  pi.registerTool({
    name: "java_workflow_review_result",
    label: "Report Review Result",
    description: "Report code review findings.",
    parameters: Type.Object({
      issues: Type.Array(Type.String(), { description: "List of issues found (empty array if no issues)" }),
      summary: Type.Optional(Type.String({ description: "Overall review summary" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!workflow?.active) {
        return { content: [{ type: "text", text: "❌ No active workflow" }], details: {} };
      }

      workflow.reviewIssues = params.issues;

      let message: string;
      if (params.issues.length === 0) {
        message = "✅ Review passed! No issues found.";
      } else {
        message = `📋 Review found ${params.issues.length} issue(s):\n`;
        params.issues.forEach((issue, i) => { message += `\n${i + 1}. ${issue}`; });
      }

      if (params.summary) { message += `\n\n**Summary**: ${params.summary}`; }

      updateStatus(ctx);
      pi.sendUserMessage("Call java_workflow_next to progress.", { deliverAs: "followUp" });

      return { content: [{ type: "text", text: message }], details: { workflow, issues: params.issues, summary: params.summary } };
    },
  });

  // --- java_workflow_complete tool ---
  pi.registerTool({
    name: "java_workflow_complete",
    label: "Complete Workflow",
    description: "Mark the workflow as complete with a summary.",
    parameters: Type.Object({ summary: Type.String({ description: "Summary of what was accomplished" }) }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!workflow?.active) {
        return { content: [{ type: "text", text: "❌ No active workflow" }], details: {} };
      }

      workflow.stage = "done";
      workflow.active = false;
      updateStatus(ctx);

      const message = [
        "🎉 **Workflow Complete!**",
        "",
        params.summary,
        "",
        `**Iterations**: ${workflow.iteration}`,
        `**Tests**: ${workflow.testsPassed ? "✅ All passing" : "⚠️ Some failures"}`,
        `**Review Issues**: ${workflow.reviewIssues.length === 0 ? "✅ None" : workflow.reviewIssues.length}`,
        "",
        "Start another with `/java-workflow [spec]`",
      ].join("\n");

      return { content: [{ type: "text", text: message }], details: { workflow, summary: params.summary } };
    },
  });

  // --- Inject workflow context into system prompt ---
  pi.on("before_agent_start", async (event, ctx) => {
    if (!workflow?.active) return {};

    const guidance = [
      "",
      "---",
      "**🔄 JAVA WORKFLOW ACTIVE**",
      "",
      `**Stage**: ${STAGE_DESCRIPTIONS[workflow.stage]} (${workflow.iteration}/${workflow.maxIterations})`,
      `**Context**: ${workflow.contextCompacted ? "COMPACTED (Fresh review context)" : "Full implementation context"}`,
      "",
      workflow.contextCompacted
        ? "⚠️ You are reviewing with CLEAN context. You do not see the implementation conversation — only the final code files. Review objectively."
        : `**Original Spec**: ${workflow.spec.substring(0, 300)}${workflow.spec.length > 300 ? "..." : ""}`,
      "",
      "Follow the workflow instructions and call the appropriate java_workflow_* tool when done.",
      "---",
    ].join("\n");

    return { systemPrompt: event.systemPrompt + guidance };
  });

  // --- Auto-detect test commands and report results ---
  pi.on("tool_result", async (event, ctx) => {
    if (!workflow?.active || workflow.stage !== "test") return;

    // Auto-detect Maven test commands via bash tool
    if (event.toolName === "bash" && event.input?.command) {
      const cmd = event.input.command.toLowerCase();
      const isTestCommand = cmd.includes("mvn test") || cmd.includes("./mvnw test");

      if (isTestCommand && event.details?.exitCode !== undefined) {
        const exitCode = event.details.exitCode;
        workflow.testsPassed = exitCode === 0;
        updateStatus(ctx);

        ctx.ui.notify(
          `Auto-detected test result: ${exitCode === 0 ? "✅ Passed" : "❌ Failed"} (exit code: ${exitCode})`,
          exitCode === 0 ? "success" : "error"
        );

        // Auto-progress workflow based on result
        pi.sendUserMessage(
          `Tests ${exitCode === 0 ? "passed" : "failed"} with exit code ${exitCode}. Call java_workflow_next to progress.`,
          { deliverAs: "followUp" }
        );
      }
    }

    // Also detect java_test_runner tool results and auto-update workflow state
    if (event.toolName === "java_test_runner" && event.details?.exitCode !== undefined) {
      const exitCode = event.details.exitCode;
      workflow.testsPassed = exitCode === 0;
      updateStatus(ctx);

      ctx.ui.notify(
        `Test result: ${exitCode === 0 ? "✅ Passed" : "❌ Failed"} (exit code: ${exitCode})`,
        exitCode === 0 ? "success" : "error"
      );

      // Auto-progress workflow based on result
      pi.sendUserMessage(
        `Tests ${exitCode === 0 ? "passed" : "failed"} with exit code ${exitCode}. Call java_workflow_next to progress.`,
        { deliverAs: "followUp" }
      );
    }
  });

  // --- Cleanup on shutdown ---
  pi.on("session_shutdown", async () => {
    workflow = null;
  });
}
