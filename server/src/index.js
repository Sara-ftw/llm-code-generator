import { parseGeneratedProject } from './services/jsonParser.js';
import { generatedProjectSchema } from './services/projectSchema.js';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { getOllamaModels, generateCodeWithOllama } from './providers/ollamaProvider.js';
import { buildCodeGenerationPrompt, buildProjectFixPrompt } from './services/promptBuilder.js';
import { analyzeGeneratedProject } from './services/projectAnalyzer.js';

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

const generationSchema = z.object({
  description: z.string()
    .trim()
    .min(5, 'Please describe the project in at least 5 characters.'),
  language: z.string().min(1),
  framework: z.string().min(1),
  includeTests: z.boolean().default(true),
  includeReadme: z.boolean().default(true)
});

const warningSchema = z.object({
  type: z.string(),
  severity: z.string(),
  title: z.string(),
  explanation: z.string(),
  suggestion: z.string(),
  technicalDetail: z.string()
});

const fixSchema = z.object({
  project: generatedProjectSchema,
  warnings: z.array(warningSchema)
});

const downloadSchema = z.object({
  project: generatedProjectSchema
});

app.get('/api/health', async (request, response) => {
  try {
    const models = await getOllamaModels();

    response.json({
      status: 'ok',
      ollama: 'reachable',
      models
    });
  } catch (error) {
    response.status(503).json({
      status: 'degraded',
      ollama: 'unreachable',
      message: error.message
    });
  }
});

app.post('/api/generate', async (request, response) => {
  const parsed = generationSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: 'Invalid request',
      details: parsed.error.flatten()
    });
    return;
  }

  try {
    const prompt = buildCodeGenerationPrompt(parsed.data);
    const rawResult = await generateCodeWithOllama(prompt);
    const parsedProject = parseGeneratedProject(rawResult);
    const validatedProject = generatedProjectSchema.parse(parsedProject);
    const warnings = analyzeGeneratedProject(validatedProject);

    response.json({
      provider: 'ollama',
      model: process.env.OLLAMA_MODEL,
      project: validatedProject,
      warnings
    });

  } catch (error) {
  response.status(502).json({
    error: 'Generation failed',
    message: error.message,
    advice: 'The model may have returned invalid JSON. Try again or simplify the request.'
  });
}
});

app.post('/api/fix', async (request, response) => {
  const parsed = fixSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: 'Invalid fix request',
      details: parsed.error.flatten()
    });
    return;
  }

  try {
    const prompt = buildProjectFixPrompt(parsed.data.project, parsed.data.warnings);
    const rawResult = await generateCodeWithOllama(prompt);
    const parsedProject = parseGeneratedProject(rawResult);
    const validatedProject = generatedProjectSchema.parse(parsedProject);
    const warnings = analyzeGeneratedProject(validatedProject);

    response.json({
      provider: 'ollama',
      model: process.env.OLLAMA_MODEL,
      project: validatedProject,
      warnings
    });
  } catch (error) {
    response.status(502).json({
      error: 'Fix failed',
      message: error.message,
      advice: 'The model may have returned invalid JSON. Try again or simplify the generated project.'
    });
  }
});

app.post('/api/download', async (request, response) => {
  const parsed = downloadSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: 'Invalid download request',
      details: parsed.error.flatten()
    });
    return;
  }

  const project = parsed.data.project;
  const archive = new ZipArchive({
    zlib: { level: 9 }
  });

  response.attachment('generated-project.zip');

  archive.on('error', (error) => {
    response.status(500).json({
      error: 'ZIP creation failed',
      message: error.message
    });
  });

  archive.pipe(response);

  for (const file of project.files) {
    archive.append(file.content, {
      name: file.path
    });
  }

  await archive.finalize();
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});