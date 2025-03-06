import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/upload-wav", async (c) => {
  try {
    const arrayBuffer = await c.req.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const language = c.req.query("language") || "English";

    console.log(`Received WAV file of: ${bytes.length} bytes`);
    console.log(`Using language: ${language}`);

    await Bun.write("test.wav", bytes);

    const langFlags =
      language === "Spanish"
        ? ["--language", "Spanish", "--task", "translate"]
        : ["--language", "English", "--task", "transcribe"];

    const { stdout } = Bun.spawnSync([
      "whisper",
      "test.wav",
      "--model",
      "base",
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

export default app;
