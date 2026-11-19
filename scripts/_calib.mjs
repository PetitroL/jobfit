import { analyze } from "../server/score.js";
import { SAMPLE_JD, SAMPLE_RESUME } from "../server/samples.js";
import { readFileSync } from "node:fs";

const weakResume = `王小明 ｜ 2 年前端开发经验 ｜ 大专

个人优势
两年做过一些企业管理后台页面，负责切图和改样式。

专业技能
HTML、CSS、JavaScript 基础，会一点 jQuery，Vue2 用过。

工作经历
2023.07 - 至今  某外包公司  前端开发

项目经历
某公司官网改版（HTML + CSS）
• 根据设计稿完成 6 个页面的静态还原，兼容 IE11。
• 用 jQuery 实现轮播图与表单校验。

教育经历
2020.09 - 2023.06  某职业学院  计算机应用  大专`;

const backendJd = `职位名称：资深后端架构师（Go / 微服务）

岗位职责：
1. 负责核心交易系统的微服务架构设计与治理；
2. 主导高并发场景下的性能优化与稳定性建设；
3. 设计并落地分布式事务、消息队列、缓存方案；
4. 带领 5 人以上小组完成季度交付。

任职要求：
1. 8 年以上后端开发经验，硕士及以上学历；
2. 精通 Go 或 Java，熟悉 Kubernetes 与容器化部署；
3. 有大规模分布式系统、MySQL 分库分表、Redis 集群实战经验；
4. 熟悉 CI/CD 流水线建设与单元测试体系。

加分项：
1. 有开源中间件贡献；
2. 有金融行业背景。`;

function show(name, jd, resume) {
  const r = analyze({ jdText: jd, resumeText: resume });
  console.log("\n=== " + name + " ===");
  console.log("总分", r.total, r.grade.label);
  r.dimensions.forEach(d => console.log(` ${d.label}: ${d.score}/${d.full}`));
  console.log("缺失技能", r.keywords.miss.join("/") || "无");
}

const realResume = readFileSync("../resume-preview.txt", "utf8");
show("AI前端JD × 示例简历", SAMPLE_JD, SAMPLE_RESUME);
show("AI前端JD × 真实简历", SAMPLE_JD, realResume);
show("AI前端JD × 弱简历", SAMPLE_JD, weakResume);
show("后端架构JD × 弱简历", backendJd, weakResume);
show("后端架构JD × 真实简历", backendJd, realResume);
