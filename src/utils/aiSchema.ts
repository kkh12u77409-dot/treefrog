import { z } from 'zod';
export const aiResultSchema = z.object({
  projectName: z.string().min(1).max(100), summary: z.string().max(12000),
  treeText: z.string().min(1).max(100000), batchCode: z.string().max(200000),
});
