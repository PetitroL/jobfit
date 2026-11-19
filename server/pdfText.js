/**
 * PDF → 文本。
 *
 * 主路径：调用本机 Python + PyMuPDF（中文 CMap 处理最稳）。
 * 备路径：纯 Node 解析（zlib 解压内容流 + 抓 Tj/TJ），只对「文本型英文 PDF」有效，
 *        中文字体需要 ToUnicode 映射，这里不做，能提取多少算多少。
 * 两条都失败时把原因带回去，前端提示「改成粘贴文本」。
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const PY_SCRIPT = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "scripts", "pdf-text.py");

/** @param {Buffer} buffer @param {string} filename */
export async function pdfToText(buffer, filename = "resume.pdf") {
  const viaPython = await tryPython(buffer, filename);
  if (viaPython.ok) return viaPython;

  const viaNode = tryNode(buffer);
  if (viaNode.ok) return viaNode;

  return {
    ok: false,
    error: `提取失败：${viaPython.error || "未知原因"}；内置解析也没取到文字（可能是扫描件或加密 PDF）。请改用「粘贴文本」。`,
  };
}

async function tryPython(buffer, filename) {
  const dir = await mkdtemp(path.join(tmpdir(), "jobfit-"));
  const file = path.join(dir, filename.replace(/[^\w.-]/g, "_") || "resume.pdf");

  try {
    await writeFile(file, buffer);
    const out = await run("python", [PY_SCRIPT, file]);
    const json = safeJson(out.stdout);

    if (json?.text) {
      const text = normalize(json.text);
      if (text.length >= 20) return { ok: true, text, pages: json.pages || 0, via: "python" };
      return { ok: false, error: "PDF 里只有很少的文字（可能是扫描件）" };
    }
    return { ok: false, error: json?.error || "Python 没有返回文本" };
  } catch (err) {
    return { ok: false, error: `调用 Python 失败：${err.message}` };
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("解析超时（10 秒）"));
    }, 10000);

    child.stdout.on("data", (d) => (stdout += d.toString("utf8")));
    child.stderr.on("data", (d) => (stderr += d.toString("utf8")));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || `退出码 ${code}`));
    });
  });
}

/** 纯 Node 兜底：解压所有 FlateDecode 流，抓文本操作符 */
function tryNode(buffer) {
  try {
    const chunks = [];
    let index = 0;

    while (true) {
      const start = buffer.indexOf("stream", index, "latin1");
      if (start === -1) break;
      const end = buffer.indexOf("endstream", start, "latin1");
      if (end === -1) break;

      let dataStart = start + 6;
      if (buffer[dataStart] === 0x0d) dataStart += 1;
      if (buffer[dataStart] === 0x0a) dataStart += 1;

      const raw = buffer.subarray(dataStart, end);
      try {
        chunks.push(zlib.inflateSync(raw).toString("latin1"));
      } catch {
        chunks.push(raw.toString("latin1"));
      }
      index = end + 9;
    }

    const joined = chunks.join("\n");
    const texts = [];
    const tjRegex = /\(((?:\\.|[^\\()])*)\)\s*Tj/g;
    const tjArrayRegex = /\[((?:[^\][]|\\[\[\]])*)\]\s*TJ/g;

    for (const m of joined.matchAll(tjRegex)) texts.push(unescapePdf(m[1]));
    for (const m of joined.matchAll(tjArrayRegex)) {
      const inner = m[1];
      for (const part of inner.matchAll(/\(((?:\\.|[^\\()])*)\)/g)) texts.push(unescapePdf(part[1]));
    }

    const text = normalize(texts.join(" "));
    if (text.length >= 20) return { ok: true, text, pages: 0, via: "node" };
    return { ok: false, error: "内置解析未取到文字" };
  } catch (err) {
    return { ok: false, error: `内置解析异常：${err.message}` };
  }
}

function unescapePdf(text) {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function normalize(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
