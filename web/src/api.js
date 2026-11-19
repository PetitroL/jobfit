/** 接口封装：dev 由 vite 代理 /api → 5192 */

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    ...options,
  });

  let data = null;
  const type = res.headers.get("content-type") || "";
  if (type.includes("json")) data = await res.json();

  if (!res.ok) throw new Error(data?.error || `请求失败（${res.status}）`);
  return data;
}

export const api = {
  health: () => request("/api/health"),

  sample: () => request("/api/sample"),

  analyze: (jdText, resumeText) =>
    request("/api/analyze", { method: "POST", body: JSON.stringify({ jdText, resumeText }) }),

  parsePdf: (filename, pdfBase64) =>
    request("/api/resume/pdf", { method: "POST", body: JSON.stringify({ filename, pdfBase64 }) }),

  history: () => request("/api/history"),

  historyItem: (id) => request(`/api/history/${id}`),

  removeHistory: (id) => request(`/api/history/${id}`, { method: "DELETE" }),
};

/** 文件 → base64（去掉 data: 前缀） */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
