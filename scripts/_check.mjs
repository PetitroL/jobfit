import { analyze } from "../server/score.js";
import { buildAdvice } from "../server/advice.js";
import { SAMPLE_JD, SAMPLE_RESUME } from "../server/samples.js";
import { readFileSync } from "node:fs";

function show(name, jd, resume) {
  const r = analyze({ jdText: jd, resumeText: resume });
  console.log("\n=== " + name + " ===");
  console.log("总分", r.total, r.grade.label);
  r.dimensions.forEach(d => console.log(` ${d.label}: ${d.score}/${d.full} — ${d.detail}`));
  console.log("命中", r.keywords.hit.join("/"));
  console.log("缺失", r.keywords.miss.join("/"));
  const adv = buildAdvice(r);
  console.log("建议", adv.items.length, "条 |", adv.items.map(i=>i.title).join(" ｜ "));
  console.log("---- 可复制 ----\n" + adv.copyText);
}

const realResume = readFileSync("../resume-preview.txt", "utf8");
show("示例 JD × 示例简历", SAMPLE_JD, SAMPLE_RESUME);
show("示例 JD × 真实简历(罗尉)", SAMPLE_JD, realResume);
