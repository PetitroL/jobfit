/**
 * JD 解析：把一段招聘描述拆成「要什么」。
 *
 * 不做 NLP，只做三件确定性的事：
 *   1. 按小标题切段（职责 / 要求 / 加分），技能归属到段，才能区分硬门槛和加分；
 *   2. 正则提年限、学历；
 *   3. 用技能词典扫一遍。
 */

import { detectSkills, SKILL_LIST } from "./skills.js";

const SECTION_RULES = [
  { key: "responsibilities", test: /(岗位职责|工作职责|职位描述|工作内容|你将负责|你要做|主要职责)/ },
  { key: "requirements", test: /(任职要求|岗位要求|任职资格|职位要求|我们希望你|我们希望|能力要求|硬性要求)/ },
  { key: "bonus", test: /(加分项|优先考虑|优先录用|bonus|plus|以下条件优先)/ },
  { key: "about", test: /(关于我们|团队介绍|公司介绍|福利|待遇)/ },
];

export function parseJd(rawText) {
  const text = String(rawText || "").replace(/\r\n/g, "\n").trim();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const sections = splitSections(lines);
  const allText = text;

  const skills = detectSkills(allText);

  // 技能归属：在「加分」段出现的算加分项，其余算硬要求
  const bonusText = sections.bonus.join(" ");
  const bonusSkills = detectSkills(bonusText);
  const mustSkills = [...skills].filter((id) => !bonusSkills.has(id));
  const niceSkills = [...bonusSkills];

  const years = detectYears(text);
  const degree = detectDegree(text);
  const title = detectTitle(lines);

  return {
    title,
    years,
    degree,
    skills: [...skills],
    mustSkills,
    niceSkills,
    responsibilities: sections.responsibilities,
    requirements: sections.requirements,
    bonus: sections.bonus,
    chars: text.length,
  };
}

/** 按小标题把正文切成块；没有小标题就全部当要求段处理 */
function splitSections(lines) {
  const result = { responsibilities: [], requirements: [], bonus: [], about: [] };
  let current = null;

  for (const line of lines) {
    const matched = SECTION_RULES.find((rule) => rule.test.test(line) && line.length <= 30);
    if (matched) {
      current = matched.key;
      continue;
    }
    if (!current) continue;
    result[current].push(line);
  }

  // 一句小标题都没识别出来，退化成整篇当要求
  if (!Object.values(result).some((list) => list.length)) {
    result.requirements = lines;
  }

  return result;
}

function detectYears(text) {
  // 3-5 年 / 3 年以上 / 三年以上
  const range = text.match(/(\d+)\s*[-~至到]\s*(\d+)\s*年/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };

  const minOnly = text.match(/(\d+)\s*年(?:以上|及以上|或以上)/);
  if (minOnly) return { min: Number(minOnly[1]), max: null };

  const cnRange = text.match(/([一二三四五六七八九])\s*[-~至到]\s*([一二三四五六七八九])\s*年/);
  if (cnRange) return { min: cnValue(cnRange[1]), max: cnValue(cnRange[2]) };

  const cnOnly = text.match(/([一二三四五六七八九十]+)\s*年(?:以上|及以上)/);
  if (cnOnly) return { min: cnValue(cnOnly[1]), max: null };

  const loose = text.match(/(\d+)\s*年(?:相关|工作)?经验/);
  if (loose) return { min: Number(loose[1]), max: null };

  return null;
}

function detectDegree(text) {
  const orders = ["博士", "硕士", "研究生", "本科", "大专", "专科"];
  return orders.find((d) => text.includes(d)) || "";
}

function detectTitle(lines) {
  // 取前 3 行里最像岗位名的一行：短、含岗位/工程师字样
  const candidates = lines.slice(0, 4).filter(
    (l) => l.length <= 30 && /(工程师|开发|前端|后端|架构|专家|负责人|经理|主管|实习生)/.test(l)
  );
  return candidates[0]?.replace(/^(职位名称|岗位名称|职位)[：:]\s*/, "") || lines[0]?.slice(0, 30) || "未命名岗位";
}

function cnValue(text) {
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (text === "十") return 10;
  if (text.length === 2 && text[0] === "十") return 10 + (map[text[1]] || 0);
  return map[text] || Number(text) || 0;
}

/** 把技能 id 列表转成可展示对象（带名称、分组、权重） */
export function describeSkills(ids) {
  return ids
    .map((id) => SKILL_LIST.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => ({ id: s.id, name: s.name, group: s.group, weight: s.weight }));
}
