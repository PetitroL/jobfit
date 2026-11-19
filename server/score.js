/**
 * 打分：五个维度，满分 100。
 *
 * 权重是这么定的 ——
 *   硬技能 40   招聘最先看的就是「会不会」，它必须占大头；
 *   职责覆盖 20 证明你做过同类的事，比单纯堆技能词更可信；
 *   年限 15    门槛型条件，差一两年通常可谈，所以留了缓冲；
 *   项目相关 15 决定面试官有没有兴趣往下问；
 *   学历加分 10 学历是筛选项，加分项（开源、组件库）才是差异化。
 *
 * 每个维度都能说出「为什么是这个分」，UI 上直接展示 detail，不做黑盒。
 */

import { SKILL_LIST } from "./skills.js";
import { parseJd } from "./parseJd.js";
import { parseResume } from "./parseResume.js";

const WEIGHTS = { skill: 40, coverage: 20, experience: 15, project: 15, extra: 10 };

export function analyze({ jdText, resumeText }) {
  const jd = parseJd(jdText);
  const resume = parseResume(resumeText);

  const skill = scoreSkill(jd, resume);
  const coverage = scoreCoverage(jd, resume);
  const experience = scoreExperience(jd, resume);
  const project = scoreProject(jd, resume);
  const extra = scoreExtra(jd, resume);

  const total = Math.round(skill.score + coverage.score + experience.score + project.score + extra.score);

  return {
    total,
    grade: gradeOf(total),
    dimensions: [skill, coverage, experience, project, extra],
    jd,
    resume,
    keywords: buildKeywords(jd, resume),
    meta: {
      jdChars: jdText.length,
      resumeChars: resumeText.length,
      weights: WEIGHTS,
    },
  };
}

// ---------- 1. 硬技能 40 ----------

function scoreSkill(jd, resume) {
  const must = SKILL_LIST.filter((s) => jd.mustSkills.includes(s.id));
  const resumeSkills = new Set(resume.skills);

  if (!must.length) {
    return {
      key: "skill",
      label: "硬技能匹配",
      score: 14,
      full: WEIGHTS.skill,
      detail: "JD 里没识别到明确的技术要求，这一项按中性处理。建议把「任职要求」段贴全。",
      hits: [],
      misses: [],
    };
  }

  const totalWeight = must.reduce((n, s) => n + s.weight, 0);
  const hitWeight = must.filter((s) => resumeSkills.has(s.id)).reduce((n, s) => n + s.weight, 0);
  const ratio = hitWeight / totalWeight;

  // 加分项命中给一点额外分，但不超过 3 分，避免靠"堆加分"把硬技能缺口盖住
  const niceHit = jd.niceSkills.filter((id) => resumeSkills.has(id));
  const bonus = Math.min(3, niceHit.length * 1);

  const score = Math.min(WEIGHTS.skill, ratio * WEIGHTS.skill + bonus);

  return {
    key: "skill",
    label: "硬技能匹配",
    score: round1(score),
    full: WEIGHTS.skill,
    detail: `JD 明确 ${must.length} 项技术，简历命中 ${must.filter((s) => resumeSkills.has(s.id)).length} 项（加权覆盖 ${(ratio * 100).toFixed(0)}%）${
      bonus ? `；加分项命中 ${niceHit.length} 个，额外 +${bonus.toFixed(1)}` : ""
    }。`,
    hits: must.filter((s) => resumeSkills.has(s.id)).map(brief),
    misses: must.filter((s) => !resumeSkills.has(s.id)).map(brief),
  };
}

// ---------- 2. 职责覆盖 20 ----------

function scoreCoverage(jd, resume) {
  const jdBody = [...jd.responsibilities, ...jd.requirements].join(" ");
  if (jdBody.length < 20) {
    return {
      key: "coverage",
      label: "职责覆盖度",
      score: 8,
      full: WEIGHTS.coverage,
      detail: "JD 正文太短，没法判断职责重叠。把「岗位职责」「任职要求」两段贴上会更准。",
      hits: [],
      misses: [],
    };
  }

  const features = topFeatures(jdBody, 60);
  const resumeText = String(resume.text || "").toLowerCase();
  const hits = features.filter((f) => resumeText.includes(f));
  const ratio = features.length ? hits.length / features.length : 0;

  // 校准：覆盖率 70% 才算职责高度重合。放到 55% 会让大部分「沾边」的简历都拿满分，
  // 分数就没有区分度了，等于这个维度白算。
  const score = Math.min(WEIGHTS.coverage, (ratio / 0.7) * WEIGHTS.coverage);

  return {
    key: "coverage",
    label: "职责覆盖度",
    score: round1(score),
    full: WEIGHTS.coverage,
    detail: `从 JD 提炼出 ${features.length} 个特征词，简历覆盖 ${hits.length} 个（${(ratio * 100).toFixed(0)}%）。覆盖到 70% 视为职责高度重合。`,
    hits: hits.slice(0, 18),
    misses: features.filter((f) => !resumeText.includes(f)).slice(0, 18),
  };
}

// ---------- 3. 年限 15 ----------

function scoreExperience(jd, resume) {
  const need = jd.years?.min ?? null;
  const have = resume.years ?? null;

  if (need === null) {
    return {
      key: "experience",
      label: "经验年限",
      score: have ? 13 : 9,
      full: WEIGHTS.experience,
      detail: have ? `JD 没写年限要求，简历 ${have} 年经验，按中性偏上处理。` : "JD 和简历都没提到年限，这一项按中性处理。",
      hits: [],
      misses: [],
    };
  }

  if (have === null) {
    return {
      key: "experience",
      label: "经验年限",
      score: 8,
      full: WEIGHTS.experience,
      detail: `JD 要求 ${need} 年以上，但简历里没写明工作年限 —— 这是硬伤，招聘方会默认你不满足。建议在简历首屏写清"N 年工作经验"。`,
      hits: [`要求 ${need} 年`],
      misses: ["简历未写明年限"],
    };
  }

  const gap = need - have;
  let score;
  let detail;

  if (gap <= 0) {
    score = WEIGHTS.experience;
    detail = `JD 要求 ${need} 年以上，简历 ${have} 年，满足门槛。`;
  } else if (gap <= 1) {
    score = 10;
    detail = `JD 要求 ${need} 年以上，简历 ${have} 年，差 ${gap} 年 —— 一年内的差距可以用项目深度补，值得投。`;
  } else {
    score = Math.max(2, 10 - (gap - 1) * 4);
    detail = `JD 要求 ${need} 年以上，简历 ${have} 年，差 ${gap} 年。除非有特别亮眼的成果，否则容易在初筛被卡。`;
  }

  return {
    key: "experience",
    label: "经验年限",
    score: round1(score),
    full: WEIGHTS.experience,
    detail,
    hits: gap <= 0 ? [`${have} 年 ≥ ${need} 年`] : [],
    misses: gap > 0 ? [`差 ${gap} 年`] : [],
  };
}

// ---------- 4. 项目相关性 15 ----------

function scoreProject(jd, resume) {
  if (!resume.projects?.length) {
    return {
      key: "project",
      label: "项目相关性",
      score: 5,
      full: WEIGHTS.project,
      detail: "简历里没识别到「项目经历」段落。这一块是面试官最先看的，建议单独成段、每段写清技术栈和结果。",
      hits: [],
      misses: [],
    };
  }

  // 用 JD 的核心技能（weight 3）当标尺：项目里出现过几个
  const core = SKILL_LIST.filter((s) => s.weight === 3 && jd.skills.includes(s.id));
  if (!core.length) {
    return {
      key: "project",
      label: "项目相关性",
      score: 8,
      full: WEIGHTS.project,
      detail: `JD 没给出可对照的核心技术，按中性偏低处理。简历有 ${resume.projects.length} 个项目可讲，但和岗位的对应关系需要你自己在简历里说清楚。`,
      hits: resume.projects.map((p) => p.title).slice(0, 4),
      misses: [],
    };
  }

  const hit = core.filter((s) => resume.skills.includes(s.id));
  const ratio = hit.length / core.length;

  // 项目段里额外出现的核心技能，说明不只是"会"，而是"做过"
  const inProjects = new Set(resume.projects.flatMap((p) => p.skills));
  const provedInProjects = core.filter((s) => inProjects.has(s.id));
  const extra = provedInProjects.length * 1.2;

  const score = Math.min(WEIGHTS.project, ratio * WEIGHTS.project * 0.8 + extra);
  return {
    key: "project",
    label: "项目相关性",
    score: round1(score),
    full: WEIGHTS.project,
    detail: `JD 的 ${core.length} 项核心技术里，简历命中 ${hit.length} 项，其中 ${
      provedInProjects.length
    } 项在你写过的项目里出现过（${provedInProjects.map((s) => s.name).join("、") || "无"}）。`,
    hits: provedInProjects.map(brief),
    misses: core.filter((s) => !inProjects.has(s.id)).map(brief),
  };
}

// ---------- 5. 学历与加分 10 ----------

const DEGREE_RANK = { 博士: 5, 硕士: 4, 研究生: 4, 本科: 3, 大专: 2, 专科: 2 };

function scoreExtra(jd, resume) {
  const needDegree = jd.degree;
  const haveDegree = resume.degree;
  const rankNeed = DEGREE_RANK[needDegree] || 0;
  const rankHave = DEGREE_RANK[haveDegree] || 0;

  let degreeScore;
  let degreeDetail;

  if (!needDegree) {
    degreeScore = 5;
    degreeDetail = "JD 未写学历要求";
  } else if (!haveDegree) {
    degreeScore = 2;
    degreeDetail = `JD 要求 ${needDegree}，简历没写学历`;
  } else if (rankHave >= rankNeed) {
    degreeScore = 6;
    degreeDetail = `JD 要求 ${needDegree}，简历 ${haveDegree}，满足`;
  } else {
    degreeScore = 3;
    degreeDetail = `JD 要求 ${needDegree}，简历 ${haveDegree}，差一档`;
  }

  const resumeSkills = new Set(resume.skills);
  const niceHit = jd.niceSkills.filter((id) => resumeSkills.has(id));
  const bonusScore = Math.min(4, niceHit.length * 1.5);

  return {
    key: "extra",
    label: "学历与加分项",
    score: round1(Math.min(WEIGHTS.extra, degreeScore + bonusScore)),
    full: WEIGHTS.extra,
    detail: `${degreeDetail}${niceHit.length ? `；加分项命中 ${niceHit.length} 个` : "；JD 的加分项一个都没命中"}`,
    hits: niceHit.map((id) => SKILL_LIST.find((s) => s.id === id)?.name).filter(Boolean),
    misses: jd.niceSkills.filter((id) => !resumeSkills.has(id)).map((id) => SKILL_LIST.find((s) => s.id === id)?.name).filter(Boolean),
  };
}

// ---------- 工具 ----------

const STOP_CHARS = "的了和与及或在是有能会要并等对为从以上下中个们你我他这那也就还被把让给到后前时很更最不无多";

/** 泛词：几乎每份 JD 都有，拿来当特征词只会虚高覆盖率 */
const GENERIC = new Set([
  "工作", "岗位", "负责", "相关", "要求", "熟悉", "了解", "掌握", "具备", "优先", "以上", "经验",
  "能力", "公司", "团队", "业务", "项目", "开发", "完成", "参与", "能够", "良好", "我们", "职责",
  "任职", "提供", "需求", "产品", "设计", "实现", "支持", "熟悉相关",
]);

/** 抽取中文 2-gram 特征词，按出现频次排序 */
function topFeatures(text, limit) {
  const cleaned = String(text).toLowerCase();
  const grams = new Map();

  const chunks = cleaned.split(/[^\u4e00-\u9fa5a-z0-9]+/).filter(Boolean);
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length - 1; i += 1) {
      const gram = chunk.slice(i, i + 2);
      if (!/^[\u4e00-\u9fa5]{2}$/.test(gram)) continue; // 只取纯中文 2 字
      if (STOP_CHARS.includes(gram[0]) || STOP_CHARS.includes(gram[1])) continue;
      if (GENERIC.has(gram)) continue;
      grams.set(gram, (grams.get(gram) || 0) + 1);
    }
  }

  return [...grams.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([gram]) => gram);
}

function brief(skill) {
  return { id: skill.id, name: skill.name, group: skill.group, weight: skill.weight };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function gradeOf(total) {
  if (total >= 85) return { key: "high", label: "高度匹配", tone: "good" };
  if (total >= 70) return { key: "good", label: "匹配度良好", tone: "good" };
  if (total >= 55) return { key: "ok", label: "可以投，但要补强", tone: "warn" };
  return { key: "low", label: "不建议盲投", tone: "bad" };
}

/** 给 UI 用的关键词命中 / 缺失 */
function buildKeywords(jd, resume) {
  const resumeText = String(resume.text || "").toLowerCase();
  const must = SKILL_LIST.filter((s) => jd.mustSkills.includes(s.id));
  const resumeSkills = new Set(resume.skills);

  return {
    hit: must.filter((s) => resumeSkills.has(s.id)).map((s) => s.name),
    miss: must.filter((s) => !resumeSkills.has(s.id)).map((s) => s.name),
    extras: SKILL_LIST.filter((s) => resumeSkills.has(s.id) && !jd.skills.includes(s.id))
      .map((s) => s.name)
      .slice(0, 12),
  };
}
