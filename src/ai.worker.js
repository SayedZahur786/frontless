import { pipeline, env } from "@huggingface/transformers";
env.allowLocalModels = false;
let extractor;
self.onmessage = async ({ data }) => {
  try {
    self.postMessage({
      type: "progress",
      message: extractor
        ? "Matching your request to the policy..."
        : "Downloading the small AI model. First run can take a minute.",
    });
    extractor ||= await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      {
        dtype: "q8",
        device: "wasm",
        progress_callback: (p) => {
          if (p.status === "progress" && p.progress)
            self.postMessage({
              type: "progress",
              message: `Loading AI model: ${Math.round(p.progress)}%`,
            });
        },
      },
    );
    const output = await extractor(
      [data.text, ...data.clauses.map((c) => c.text)],
      { pooling: "mean", normalize: true },
    );
    const vectors = output.tolist();
    const scored = data.clauses
      .map((c, i) => ({
        id: c.id,
        label: c.label,
        text: c.text,
        score: vectors[0].reduce((n, v, j) => n + v * vectors[i + 1][j], 0),
      }))
      .sort((a, b) => b.score - a.score);
    self.postMessage({
      type: "result",
      scored,
      model: "Xenova/all-MiniLM-L6-v2",
    });
  } catch (e) {
    self.postMessage({
      type: "error",
      message:
        "The local AI model could not load. Check your connection and retry. No AI result has been produced.",
      detail: e.message,
    });
  }
};
