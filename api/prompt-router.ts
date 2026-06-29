import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

// In-memory prompts data - loaded from public/datasets/prompts.json
// This data is static and read-only
let promptsData: Array<{
  id: number;
  text: string;
  difficulty: number;
  category: string;
  constraints: string[];
  duration: number;
}> | null = null;

async function loadPrompts() {
  if (promptsData) return promptsData;
  try {
    const data = await import("../public/datasets/prompts.json", {
      assert: { type: "json" },
    });
    promptsData = data.default;
    return promptsData;
  } catch {
    // Fallback: return empty array
    promptsData = [];
    return promptsData;
  }
}

export const promptRouter = createRouter({
  get: publicQuery
    .input(z.object({ levelId: z.number().int().min(1) }))
    .query(async ({ input }) => {
      const prompts = await loadPrompts();
      const prompt = prompts[(input.levelId - 1) % prompts.length];
      if (!prompt) return null;
      return {
        ...prompt,
        levelId: input.levelId,
      };
    }),

  list: publicQuery
    .input(
      z
        .object({
          difficulty: z.number().int().min(1).max(5).optional(),
          category: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const prompts = await loadPrompts();
      let filtered = prompts;

      if (input?.difficulty) {
        filtered = filtered.filter((p) => p.difficulty === input.difficulty);
      }
      if (input?.category) {
        filtered = filtered.filter((p) => p.category === input.category);
      }

      return filtered.slice(0, input?.limit ?? 20);
    }),

  random: publicQuery
    .input(
      z
        .object({
          minLevel: z.number().int().min(1).default(1),
          maxLevel: z.number().int().min(1).default(100),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const prompts = await loadPrompts();
      const minD = Math.max(1, Math.floor((input?.minLevel ?? 1) / 20) + 1);
      const maxD = Math.min(5, Math.floor((input?.maxLevel ?? 100) / 20) + 1);

      const filtered = prompts.filter(
        (p) => p.difficulty >= minD && p.difficulty <= maxD
      );
      if (filtered.length === 0) return prompts[0] || null;

      return filtered[Math.floor(Math.random() * filtered.length)];
    }),
});
