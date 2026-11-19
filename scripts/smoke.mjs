/**
 * 冒烟测试：跑一遍真实 HTTP 接口，确认服务端读得动、算得对、错误码正确。
 * 用法：先 npm start（另开一个窗口），再 npm run smoke
 */

const BASE = process.env.SMOKE_BASE || "http://localhost:5192";

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(name + (extra ? `：${extra}` : ""));
    console.log(`  ✗ ${name}${extra ? " — " + extra : ""}`);
  }
}

async function req(path, options = {}) {
  const res = await fetch(BASE + path, options);
  const type = res.headers.get("content-type") || "";
  const body = type.includes("json") ? await res.json() : await res.text();
  return { status: res.status, body, type };
}

const post = (path, payload) =>
  req(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

async function main() {
  console.log(`\nJobFit 冒烟测试 → ${BASE}\n`);

  console.log("服务与示例");
  const health = await req("/api/health");
  ok("GET /api/health 返回 200", health.status === 200, String(health.status));
  ok("health.ok 为 true", health.body?.ok === true);
  ok("health 标注 PDF 能力", String(health.body?.pdf || "").includes("python"));

  const sample = await req("/api/sample");
  ok("GET /api/sample 返回 JD 与简历", Boolean(sample.body?.jdText && sample.body?.resumeText));
  ok("示例 JD 含岗位职责", String(sample.body.jdText).includes("岗位职责"));

  console.log("\n核心分析");
  const an = await post("/api/analyze", { jdText: sample.body.jdText, resumeText: sample.body.resumeText });
  ok("POST /api/analyze 返回 200", an.status === 200, String(an.status));
  ok("返回分析 id", typeof an.body?.id === "string" && an.body.id.startsWith("fit-"));
  ok("总分在 0-100 内", an.body?.result?.total >= 0 && an.body?.result?.total <= 100, String(an.body?.result?.total));
  ok("强匹配样本应 ≥85 分", an.body?.result?.total >= 85, String(an.body?.result?.total));
  ok("维度恰好 5 个", an.body?.result?.dimensions?.length === 5);
  ok(
    "五维满分合计 100",
    an.body.result.dimensions.reduce((s, d) => s + d.full, 0) === 100,
    String(an.body.result.dimensions.reduce((s, d) => s + d.full, 0))
  );
  ok("每维带扣分说明", an.body.result.dimensions.every((d) => typeof d.detail === "string" && d.detail.length > 4));
  ok("等级含文案与色调", Boolean(an.body?.result?.grade?.label && an.body?.result?.grade?.tone));
  ok("关键词三组齐全", ["hit", "miss", "extras"].every((k) => Array.isArray(an.body.result.keywords[k])));
  ok("给出逐条建议 ≥1 条", an.body?.advice?.items?.length >= 1, String(an.body?.advice?.items?.length));
  ok("每条建议都有可复制文本", an.body.advice.items.every((i) => typeof i.copy === "string" && i.copy.length > 10));
  ok("匹配说明可整体复制", typeof an.body?.advice?.copyText === "string" && an.body.advice.copyText.includes("匹配度"));
  ok("识别出岗位标题", typeof an.body?.result?.jd?.title === "string" && an.body.result.jd.title.length > 0);

  console.log("\n参数校验");
  const noJd = await post("/api/analyze", { resumeText: "随便一段" });
  ok("缺 JD 返回 400", noJd.status === 400, String(noJd.status));
  const noResume = await post("/api/analyze", { jdText: "招前端" });
  ok("缺简历返回 400", noResume.status === 400, String(noResume.status));
  ok("错误信息是中文提示", String(noResume.body?.error || "").length > 0);
  const tooLong = await post("/api/analyze", { jdText: "x".repeat(20001), resumeText: "y" });
  ok("超长 JD 被拦下", tooLong.status === 400, String(tooLong.status));

  console.log("\n历史记录");
  const hist = await req("/api/history");
  ok("GET /api/history 返回列表", Array.isArray(hist.body?.items));
  ok("刚分析的那条在列表里", hist.body.items.some((i) => i.id === an.body.id));
  ok("列表项只带摘要字段", !("result" in (hist.body.items[0] || {})));
  const one = await req(`/api/history/${an.body.id}`);
  ok("能按 id 取回详情", one.status === 200 && Boolean(one.body?.result), String(one.status));
  ok("详情里的分数与首次一致", one.body?.result?.total === an.body.result.total);
  const del = await req(`/api/history/${an.body.id}`, { method: "DELETE" });
  ok("DELETE 删除成功", del.status === 200 && del.body?.ok === true, String(del.status));
  const gone = await req(`/api/history/${an.body.id}`);
  ok("删除后取回 404", gone.status === 404, String(gone.status));
  const miss404 = await req("/api/history/fit-nope");
  ok("不存在的 id 返回 404", miss404.status === 404);

  console.log("\nPDF 解析");
  const noData = await post("/api/resume/pdf", { filename: "a.pdf" });
  ok("缺 PDF 数据返回 400", noData.status === 400, String(noData.status));
  const wrongType = await post("/api/resume/pdf", { filename: "a.txt", pdfBase64: Buffer.from("hello").toString("base64") });
  ok("非 PDF 被拒绝", wrongType.status === 400, String(wrongType.status));
  const brokenPdf = await post("/api/resume/pdf", {
    filename: "broken.pdf",
    pdfBase64: Buffer.from("%PDF-1.4 坏文件但后缀对").toString("base64"),
  });
  ok("损坏 PDF 返回 422 而不是崩", [422, 200].includes(brokenPdf.status), String(brokenPdf.status));
  if (brokenPdf.status === 422) {
    ok("解析失败给出改用手动粘贴的提示", String(brokenPdf.body?.error || "").includes("粘贴"));
  }

  console.log("\n页面");
  const page = await req("/");
  ok("首页可访问", page.status === 200, String(page.status));
  ok("首页是 HTML", page.type.includes("html"));

  console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
  if (fail) {
    console.log("\n失败项：");
    failures.forEach((f) => console.log("  - " + f));
    process.exit(1);
  }
  console.log("全部通过。\n");
}

main().catch((err) => {
  console.error("\n冒烟测试中断：" + err.message);
  console.error("确认服务已启动（npm start，端口 " + BASE + "）。\n");
  process.exit(1);
});
