import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import express from "express";
import cors from "cors";
import { analyze } from "./score.js";
import { buildAdvice } from "./advice.js";
import { pdfToText } from "./pdfText.js";
import { AnalysisStore } from "./store.js";
import { SAMPLE_JD, SAMPLE_RESUME } from "./samples.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, "web", "dist");
const PORT = Number(process.env.PORT) || 5192;

const app = express();
const store = new AnalysisStore();

app.use(cors());
app.use(express.json({ limit: "16mb" })); // PDF 走 base64，留足余量

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    analyses: store.items.length,
    pdf: "python+fallback",
    ts: Date.now(),
  });
});

app.get("/api/sample", (req, res) => {
  res.json({ jdText: SAMPLE_JD, resumeText: SAMPLE_RESUME });
});

/** PDF → 文本：前端上传 base64，拿回可编辑的文本，再走分析 */
app.post("/api/resume/pdf", async (req, res) => {
  const { filename = "resume.pdf", pdfBase64 } = req.body || {};
  if (!pdfBase64) return res.status(400).json({ error: "缺少 PDF 数据" });

  try {
    const buffer = Buffer.from(String(pdfBase64).replace(/^data:.*,/, ""), "base64");
    if (buffer.length > 12 * 1024 * 1024) return res.status(413).json({ error: "PDF 太大（上限 12MB）" });
    if (!/\.pdf$/i.test(filename) && buffer.slice(0, 4).toString("latin1") !== "%PDF") {
      return res.status(400).json({ error: "这不是 PDF 文件" });
    }

    const result = await pdfToText(buffer, filename);
    if (!result.ok) return res.status(422).json({ error: result.error });

    res.json({
      text: result.text,
      pages: result.pages,
      chars: result.text.length,
      via: result.via,
    });
  } catch (err) {
    res.status(500).json({ error: `解析失败：${err.message}` });
  }
});

/** 核心接口：JD + 简历 → 分数 + 五维拆解 + 逐条建议 */
app.post("/api/analyze", (req, res) => {
  const { jdText, resumeText } = req.body || {};

  if (!String(jdText || "").trim()) return res.status(400).json({ error: "请先粘贴岗位描述（JD）" });
  if (!String(resumeText || "").trim()) return res.status(400).json({ error: "请提供简历内容（PDF 或粘贴文本）" });
  if (String(jdText).length > 20000) return res.status(400).json({ error: "JD 文本过长（上限 2 万字）" });
  if (String(resumeText).length > 20000) return res.status(400).json({ error: "简历文本过长（上限 2 万字）" });

  try {
    const result = analyze({ jdText, resumeText });
    const advice = buildAdvice(result);
    const item = store.add({ jdText, resumeText, result, advice });

    res.json({
      id: item.id,
      createdAt: item.createdAt,
      result,
      advice,
    });
  } catch (err) {
    res.status(500).json({ error: `分析失败：${err.message}` });
  }
});

app.get("/api/history", (req, res) => {
  res.json({ items: store.list() });
});

app.get("/api/history/:id", (req, res) => {
  const item = store.get(req.params.id);
  if (!item) return res.status(404).json({ error: "记录不存在" });
  res.json({ id: item.id, createdAt: item.createdAt, result: item.result, advice: item.advice });
});

app.delete("/api/history/:id", (req, res) => {
  const ok = store.remove(req.params.id);
  res.status(ok ? 200 : 404).json({ ok });
});

if (existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: "1h" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(DIST, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.type("html").send(
      `<pre style="font:14px/1.8 ui-monospace;padding:24px">JobFit 服务端已启动（:${PORT}）
前端还没构建：
  npm run build   # 构建后访问 http://localhost:${PORT}
  npm run dev     # 开发模式，前端在 http://localhost:5193
</pre>`
    );
  });
}

app.listen(PORT, () => {
  console.log(`[jobfit] http://localhost:${PORT}`);
});
