import { Hono } from "hono";
import { z } from "zod";

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

    return c.json({
      success: true,
      text: result.text,
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
