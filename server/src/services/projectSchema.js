import { z } from 'zod';

export const generatedProjectSchema = z.object({
  summary: z.string(),
  architecture: z.array(z.string()).default([]),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string()
    })
  ).min(1),
  setupInstructions: z.array(z.string()).default([]),
  runInstructions: z.array(z.string()).default([]),
  testInstructions: z.array(z.string()).default([])
});