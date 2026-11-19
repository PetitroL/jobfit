/**
 * 简历解析：从纯文本里拿三样东西 —— 年限、学历、技能，外加分段（技能 / 项目 / 经历）。
 * PDF 转文本的事交给 pdfText.js，这里只处理文本。
 */

import { detectSkills } from "./skills.js";

const HEADING_RULES = [
  { key: "summary", test: /(个人优势|自我介绍|个人简介|职业概述|核心竞争力)/ },
  { key: "skills", test: /(专业技能|技能清单|技术栈|技能)/ },
  { key: "projects", test: /(项目经历|项目经验|项目实践|代表项目)/ },
  { key: "experience", test: /(工作经历|工作经验|职业经历)/ },
  { key: "education", test: /(教育经历|教育背景|学历)/ },
];

export function parseResume(rawText) {
  const text = String(rawText || "").replace(/\r\n/g, "\n").trim();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const sections = splitSections(lines);
  const skills = detectSkills(text);
  const years = detectYears(text);
  const degree = detectDegree(text);
  const projects = detectProjects(sections.projects, text);

  return {
    years,
    degree,
    skills: [...skills],
    projects,
    sections,
    text,
    chars: text.length,
    lines: lines.length,
  };
}

function splitSections(lines) {
  const result = { summary: [], skills: [], projects: [], experience: [], education: [], other: [] };
  let current = "other";

  for (const line of lines) {
    const matched = HEADING_RULES.find((rule) => rule.test.test(line) && line.length <= 24);
    if (matched) {
      current = matched.key;
      continue;
    }
    result[current].push(line);
  }
  return result;
}

function detectYears(text) {
  const patterns = [
    /(\d+)\s*年(?:工作)?经验/,
    /(?:工作)?经验\s*[：:]?\s*(\d+)\s*年/,
    /(\d+)\s*年\s*(?:前端|后端|开发|相关)/,
    /(\d+)\s*[+]?\s*years?/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const value = Number(m[1]);
      if (value > 0 && value < 60) return value;
    }
  }
  return null;
}

function detectDegree(text) {
  const orders = ["博士", "硕士", "研究生", "本科", "大专", "专科"];
  return orders.find((d) => text.includes(d)) || "";
}

/**
 * 项目：以「项目名（技术栈）  时间区间」这类行作为开头，往下吃到下一个项目或空段。
 * 拿不到就退化成「项目段整段当一个项目」，够用来算领域相关性。
 */
function detectProjects(projectLines, fullText) {
  const list = [];
  let current = null;

  for (const raw of projectLines) {
    // 简历里标题行常用空格对齐时间，先把连续空格压成一个，否则长度判断会误杀
    const line = String(raw).replace(/\s{2,}/g, " ").trim();
    const looksLikeTitle =
      line.length <= 100 &&
      /(\d{4}[./-]\d{1,2}|至今|项目|平台|系统|助手|工作台|中台|小程序|App)/.test(line) &&
      !/^(•|-|\*)/.test(line);

    if (looksLikeTitle && (!current || current.body.length > 1)) {
      if (current) list.push(current);
      current = { title: line, body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) list.push(current);

  if (!list.length && projectLines.length) {
    list.push({ title: "项目经历", body: [...projectLines] });
  }

  return list
    .map((p) => ({
      title: p.title,
      text: p.body.join(" ").slice(0, 800),
      skills: [...detectSkills(`${p.title} ${p.body.join(" ")}`)],
    }))
    .slice(0, 8);
}
