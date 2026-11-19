/**
 * 逐条建议：把「哪里不够」翻译成「下一版简历怎么改」。
 *
 * 原则：
 *   - 不编造经历。写「如果做过，这样写；没做过，这样做」两条路，让用户自己选；
 *   - 每条建议都能单独复制，粘到笔记里就能照着改；
 *   - 按影响排序，缺硬门槛技能排最前。
 */

export function buildAdvice(result) {
  const { jd, resume, dimensions, total, grade } = result;
  const items = [];

  const skillDim = dimensions.find((d) => d.key === "skill");
  const coverDim = dimensions.find((d) => d.key === "coverage");
  const expDim = dimensions.find((d) => d.key === "experience");
  const projDim = dimensions.find((d) => d.key === "project");
  const extraDim = dimensions.find((d) => d.key === "extra");

  // 1) 缺硬门槛技能
  for (const miss of skillDim.misses.sort((a, b) => b.weight - a.weight)) {
    items.push({
      level: miss.weight >= 3 ? "high" : "mid",
      title: `补「${miss.name}」这一项`,
      body:
        miss.weight >= 3
          ? `JD 把它当成硬门槛，而简历里完全没出现。HR 用关键词筛简历时，这一条会直接减分。`
          : `JD 提到 ${miss.name}，简历没写。不是硬门槛，但同类候选人大概率会写，属于性价比高的补分项。`,
      action: `如果确实做过：在相关项目里加一句「用 ${miss.name} 做了什么、结果是什么（带数字）」。
如果没做过：花 1-2 天做一个能跑的最小例子，放进个人项目——面试时能说清原理就够了。`,
      copy: `【补充 ${miss.name}】在本项目描述里增加：使用 ${miss.name} 完成 <具体功能>，<量化结果，如耗时下降 40% / 覆盖 3 个业务线>。`,
    });
  }

  // 2) 年限
  if (expDim.score < expDim.full) {
    items.push({
      level: "high",
      title: "年限这块要么写清、要么用产出补",
      body: expDim.detail,
      action: resume.years
        ? "年限差得不多的话，把「用几年」换成「做成过什么」：挑 2 个能代表能力上限的项目放最前面，让筛选者先看到结果。"
        : "先在简历首屏补一行「N 年工作经验」——招聘方默认按写的年限筛，不写等于放弃。",
      copy: `【首屏信息】${resume.years ? `${resume.years} 年前端开发经验` : "<N> 年开发经验"}，主导过 <项目>，擅长 <能力>。`,
    });
  }

  // 3) 职责覆盖
  if (coverDim.score < coverDim.full * 0.75 && coverDim.misses.length) {
    const topMiss = coverDim.misses.slice(0, 6);
    items.push({
      level: "mid",
      title: "JD 反复提到的事，简历里没有对应描述",
      body: `这些词在 JD 里出现频率高，但简历正文里找不到：${topMiss.join("、")}。不代表你没做过，更可能是没写出来。`,
      action: "对着 JD 的职责段，一条一条问自己「我做过类似的事吗」。做过就换成 JD 的说法写进项目，没做过就别硬编。",
      copy: `【对齐 JD 措辞】把项目描述里的「<你的说法>」改成 JD 的「${topMiss[0]}」等表述，保持事实不变。`,
    });
  }

  // 4) 项目相关性
  if (projDim.score < projDim.full * 0.7) {
    items.push({
      level: "mid",
      title: "项目段落没证明「你做过 JD 要的事」",
      body: projDim.detail,
      action: "每个项目按「场景 → 我做了什么 → 技术方案 → 结果」四句话写，结果一定要有数字。别写「参与了 XX 系统开发」这种看不出贡献的句子。",
      copy: `【项目模板】<项目名>（<技术栈>）：解决 <业务问题>，我负责 <具体模块>，用 <技术方案> 实现 <效果>，<指标> 从 <X> 提升到 <Y>。`,
    });
  }

  // 5) 学历 / 加分项
  if (extraDim.score < extraDim.full * 0.7) {
    const missNice = extraDim.misses.filter(Boolean);
    items.push({
      level: "low",
      title: missNice.length ? "加分项可以低成本补一两个" : "学历这关卡在筛选规则上",
      body: extraDim.detail,
      action: missNice.length
        ? `JD 的加分项里，${missNice.slice(0, 3).join("、")} 是最容易在两周内做出成果的。挑一个做成公开可看的东西（仓库 / 文章 / demo）。`
        : "学历通常过不去系统筛选，优先找内推或直接联系用人主管，把作品集放在最前面。",
      copy: missNice.length
        ? `【加分项】近期完成了 <成果>（${missNice.slice(0, 2).join(" / ")} 相关），可提供链接：<url>。`
        : `【投递策略】走内推/直联，邮件正文直接放 2 个最相关项目的链接和结果。`,
    });
  }

  // 6) 优势怎么讲（永远给一条）
  const hitTop = skillDim.hits.filter((h) => h.weight >= 2).slice(0, 4);
  if (hitTop.length) {
    items.push({
      level: "info",
      title: "面试/打招呼时先说这几项",
      body: `你已经命中了 JD 的 ${hitTop.map((h) => h.name).join("、")}，这些是最容易被追问、也最容易讲出细节的地方。`,
      action: "每个命中项准备一个 30 秒的具体例子（做了什么、怎么做的、结果如何），别只说「熟悉」。",
      copy: `我在 ${hitTop[0]?.name} 上有 <N> 年实践，最近在 <项目> 里用 ${hitTop
        .slice(0, 2)
        .map((h) => h.name)
        .join(" + ")} 完成了 <功能>，<量化结果>。`,
    });
  }

  return {
    items,
    copyText: buildCopyText({ jd, resume, dimensions, total, grade }),
  };
}

/** 一段可以直接粘进聊天窗 / 邮件的岗位匹配说明 */
function buildCopyText({ jd, resume, dimensions, total, grade }) {
  const skillDim = dimensions.find((d) => d.key === "skill");
  const hit = skillDim.hits.map((h) => h.name).slice(0, 6);
  const miss = skillDim.misses.map((h) => h.name).slice(0, 4);
  const project = resume.projects?.[0]?.title || "";

  const lines = [
    `【岗位匹配】${jd.title} ｜ 匹配度 ${total}/100（${grade.label}）`,
    hit.length ? `命中：${hit.join("、")}` : "命中：暂无明显匹配项",
    miss.length ? `待补：${miss.join("、")}` : "待补：无硬性缺口",
    resume.years ? `经验：${resume.years} 年${resume.degree ? ` ｜ 学历：${resume.degree}` : ""}` : "",
    project ? `代表作：${project}` : "",
    "",
    `一句话：${oneLiner(total, hit, miss)}`,
  ];

  return lines.filter((l) => l !== "").join("\n");
}

function oneLiner(total, hit, miss) {
  if (total >= 85) return `技术栈与岗位高度重合${hit.length ? `（${hit.slice(0, 3).join("、")}）` : ""}，建议优先投递并争取内推。`;
  if (total >= 70) return `核心能力基本对得上，${miss.length ? `补一下 ${miss[0]} 的表达` : "把项目结果写实"}就能明显提高通过率。`;
  if (total >= 55) return `方向是对的，但${miss.length ? ` ${miss.slice(0, 2).join("、")} ` : "关键能力"}是明显缺口，先补再投更稳。`;
  return `这个岗位的硬要求和当前经历差得比较多，除非有内推，否则性价比不高。`;
}
