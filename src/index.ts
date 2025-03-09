import { Hono } from "hono";
import { z } from "zod";
import OpenAI from "openai";

const systemPrompt = `
You are an expert text transcription assistant designed to correct errors in text while preserving
the original meaning and intent. Your sole purpose is to receive text that may contain gramatical
errors and produce a corrected version.

## Context About the Text Creator
- Is a computer science engineer.
- His development environment is macOS/Linux.

## Your Responsibilities:
1. Correct spelling errors and grammatical mistakes
2. Fix sentence structure maintaining the original meaning
3. The author prefers lowercaps to seem more casual
4. Maintain technical terminology accuracy based on the context provided

## What *NOT* to Do:
1. Do not add new information or expand on ideas
3. Do not remove content unless it's clearly redundant
4. Do not alter specialized terminology unless incorrectly used
5. Do not comment on the quality of the writing
6. Do *not* ever try to answer the text's original question. That is not your task.

## Output Format:
Provide *only* the corrected text without explanations, remarks or comments.
`;

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Schemas
export const LangSchema = z
  .string()
  .transform((val) => {
    let lower = val.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  })
  .pipe(z.enum(["English", "Spanish"]));

export const ModelSchema = z.enum(["tiny", "base", "small"]);

// App
const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/upload-wav", async (c) => {
  try {
    const arrayBuffer = await c.req.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let lang = c.req.query("lang") || "English";
    let model = c.req.query("model") || "base";

    lang = LangSchema.parse(lang);
    model = ModelSchema.parse(model);

    console.log(`Received WAV file of: ${bytes.length} bytes`);
    console.log(`Using language: ${lang}`);
    console.log(`Using model: ${model}`);

    await Bun.write("test.wav", bytes);

    const langFlags =
      lang === "Spanish"
        ? ["--language", "Spanish", "--task", "translate"]
        : ["--language", "English", "--task", "transcribe"];

    // TODO: Make this path configurable
    const { stdout } = Bun.spawnSync([
      "/home/alex/ai-proj/bin/whisper",
      "test.wav",
      "--model",
      model,
      "--output_format",
      "json",
      ...langFlags,
      "--fp16",
      "False",
      "--output_dir",
      ".",
    ]);

    const result = await Bun.file("test.json").json();

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Please correct the following text: \"${result.text}\"`,
        },
      ],
    });

    const text = `whisper: ${result.text}\ndeepseek: ${response.choices[0].message.content}`;

    return c.json({
      success: true,
      text,
    });
  } catch (error) {
    console.error("Error processing WAV file:", error);
    return c.json({ success: false, error: "Failed to process WAV file" }, 500);
  }
});

export default {
  port: 3000,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};
