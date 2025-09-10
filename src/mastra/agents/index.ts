import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { z } from "zod";
import { Memory } from "@mastra/memory";
import { completePlan, setPlan, updatePlanProgress } from "@/mastra/tools";

// Canvas Agent working memory schema mirrors the front-end AgentState
export const AgentState = z.object({
  items: z.array(z.any()).default([]),
  globalTitle: z.string().default(""),
  globalDescription: z.string().default(""),
  lastAction: z.string().default(""),
  itemsCreated: z.number().int().default(0),
  planSteps: z.array(z.object({
    title: z.string(),
    status: z.enum(["pending", "in_progress", "completed", "blocked", "failed"]),
    note: z.string().optional(),
  })).default([]),
  currentStepIndex: z.number().int().default(-1),
  planStatus: z.string().default(""),
});

export const canvasAgent = new Agent({
  name: "sample_agent",
  tools: { setPlan, updatePlanProgress, completePlan },
  model: openai("gpt-4o"),
  instructions: "You are a helpful assistant managing a canvas of items. Prefer shared state over chat history.",
  memory: new Memory({
    storage: new LibSQLStore({ url: "file::memory:" }),
    options: {
      workingMemory: {
        enabled: true,
        schema: AgentState,
      },
    },
  }),
});
