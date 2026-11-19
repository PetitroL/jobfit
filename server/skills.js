/**
 * 技能词典：JD 和简历都按同一套词表扫，才能对得上。
 *
 * 每条技能带：
 *   group  归类（用来把「缺失项」分组讲人话）
 *   weight 权重（3 = 岗位硬门槛，2 = 常见要求，1 = 加分项）
 *   aliases 同义词，命中任意一个就算有
 *
 * 匹配是纯字符串包含，不做分词 —— 中文简历里「Vue3 开发」这种写法很常见，
 * 用边界符号反而会漏。代价是短词容易误命中，所以两字以内的英文缩写一律不收。
 */

export const SKILLS = [
  // 框架与语言
  { id: "vue", name: "Vue", group: "前端框架", weight: 3, aliases: ["vue", "vue2", "vue3", "vue.js"] },
  { id: "react", name: "React", group: "前端框架", weight: 3, aliases: ["react", "react.js"] },
  { id: "typescript", name: "TypeScript", group: "前端框架", weight: 2, aliases: ["typescript", "ts 开发", "ts开发"] },
  { id: "javascript", name: "JavaScript", group: "前端框架", weight: 2, aliases: ["javascript", "es6", "es2015"] },
  { id: "vue", name: "Vue", group: "前端框架", weight: 3, aliases: ["vue"] },
  { id: "nextjs", name: "Next.js", group: "前端框架", weight: 2, aliases: ["next.js", "nextjs"] },
  { id: "node", name: "Node.js", group: "后端与工程", weight: 2, aliases: ["node.js", "nodejs", "node 开发"] },
  { id: "python", name: "Python", group: "后端与工程", weight: 2, aliases: ["python"] },
  { id: "java", name: "Java", group: "后端与工程", weight: 2, aliases: ["java "] },
  { id: "go", name: "Go", group: "后端与工程", weight: 2, aliases: ["golang", " go ", "go 语言", "go语言"] },
  { id: "microservice", name: "微服务 / 分布式", group: "后端与工程", weight: 3, aliases: ["微服务", "分布式", "服务治理", "dubbo", "spring cloud"] },
  { id: "highconcurrency", name: "高并发", group: "后端与工程", weight: 3, aliases: ["高并发", "高可用", "qps", "压测"] },
  { id: "mq", name: "消息队列", group: "后端与工程", weight: 2, aliases: ["消息队列", "kafka", "rabbitmq", "rocketmq", "mq "] },
  { id: "cache", name: "缓存 / Redis", group: "后端与工程", weight: 2, aliases: ["redis", "缓存"] },
  { id: "k8s", name: "Kubernetes / 容器化", group: "后端与工程", weight: 2, aliases: ["kubernetes", "k8s", "容器化", "容器部署"] },
  { id: "sharding", name: "分库分表", group: "后端与工程", weight: 2, aliases: ["分库分表", "分表", "读写分离"] },
  { id: "teamlead", name: "团队管理", group: "业务与协作", weight: 2, aliases: ["带团队", "带过团队", "团队管理", "小组负责", "leader"] },

  // 跨端
  { id: "uniapp", name: "uni-app", group: "跨端与小程序", weight: 2, aliases: ["uni-app", "uniapp"] },
  { id: "miniprogram", name: "小程序", group: "跨端与小程序", weight: 2, aliases: ["小程序"] },
  { id: "flutter", name: "Flutter", group: "跨端与小程序", weight: 1, aliases: ["flutter"] },
  { id: "cocos", name: "Cocos", group: "跨端与小程序", weight: 1, aliases: ["cocos"] },

  // AI 应用
  { id: "llm", name: "大模型 API", group: "AI 应用", weight: 3, aliases: ["大模型", "llm", "gpt", "openai", "deepseek", "通义", "文心", "豆包"] },
  { id: "sse", name: "SSE 流式输出", group: "AI 应用", weight: 3, aliases: ["sse", "流式", "streaming"] },
  { id: "prompt", name: "Prompt 工程", group: "AI 应用", weight: 3, aliases: ["prompt", "提示词"] },
  { id: "rag", name: "RAG / 知识库", group: "AI 应用", weight: 3, aliases: ["rag", "检索增强", "知识库", "向量库", "embedding"] },
  { id: "functioncall", name: "Function Calling", group: "AI 应用", weight: 2, aliases: ["function calling", "工具调用", "tool calling"] },
  { id: "agent", name: "Agent 编排", group: "AI 应用", weight: 2, aliases: ["agent", "智能体", "工作流编排"] },
  { id: "multimodal", name: "多模态输入", group: "AI 应用", weight: 2, aliases: ["多模态", "asr", "tts", "语音识别", "文生图"] },
  { id: "aigc", name: "AIGC 工具链", group: "AI 应用", weight: 2, aliases: ["aigc", "midjourney", "stable diffusion", "即梦", "comfyui"] },
  { id: "finetune", name: "模型微调", group: "AI 应用", weight: 1, aliases: ["微调", "fine-tune", "finetune", "lora"] },

  // 工程化与质量
  { id: "webpack", name: "Webpack", group: "工程化", weight: 2, aliases: ["webpack"] },
  { id: "vite", name: "Vite", group: "工程化", weight: 2, aliases: ["vite"] },
  { id: "componentlib", name: "组件库建设", group: "工程化", weight: 3, aliases: ["组件库", "组件化", "npm 包", "私有库"] },
  { id: "monorepo", name: "Monorepo", group: "工程化", weight: 1, aliases: ["monorepo", "pnpm workspace"] },
  { id: "test", name: "单元测试", group: "工程化", weight: 2, aliases: ["单元测试", "jest", "vitest", "cypress"] },
  { id: "cicd", name: "CI/CD", group: "工程化", weight: 2, aliases: ["ci/cd", "ci cd", "流水线", "jenkins", "github actions"] },
  { id: "docker", name: "Docker", group: "工程化", weight: 1, aliases: ["docker", "容器化"] },
  { id: "performance", name: "性能优化", group: "工程化", weight: 2, aliases: ["性能优化", "虚拟列表", "首屏", "渲染优化", "懒加载"] },

  // 数据与实时
  { id: "websocket", name: "WebSocket", group: "数据与实时", weight: 2, aliases: ["websocket", "长连接"] },
  { id: "echarts", name: "可视化 / ECharts", group: "数据与实时", weight: 2, aliases: ["echarts", "可视化", "数据大屏", "图表"] },
  { id: "sql", name: "SQL / 数据库", group: "数据与实时", weight: 2, aliases: ["mysql", "sql", "数据库", "postgres", "mongodb"] },
  { id: "map", name: "地图 SDK", group: "数据与实时", weight: 1, aliases: ["高德", "地图 sdk", "百度地图", "mapbox"] },

  // 业务与协作
  { id: "lowcode", name: "低代码 / 配置化", group: "业务与协作", weight: 3, aliases: ["低代码", "low-code", "schema 驱动", "配置化"] },
  { id: "saas", name: "B 端 / SaaS 经验", group: "业务与协作", weight: 2, aliases: ["b 端", "b端", "saas", "后台管理", "中后台"] },
  { id: "opensource", name: "开源贡献", group: "业务与协作", weight: 1, aliases: ["开源", "github 项目", "star"] },
  { id: "english", name: "英文文档阅读", group: "业务与协作", weight: 1, aliases: ["英文", "english", "cet-6", "cet6"] },
];

/** 去重：同一个 id 只保留一条（上面对 vue 写重了，这里兜住） */
export const SKILL_LIST = SKILLS.filter(
  (skill, index, arr) => arr.findIndex((s) => s.id === skill.id) === index
);

/** 扫文本，返回命中的技能 id 集合 */
export function detectSkills(text) {
  const lower = String(text || "").toLowerCase();
  const hits = new Set();
  for (const skill of SKILL_LIST) {
    if (skill.aliases.some((alias) => lower.includes(alias))) hits.add(skill.id);
  }
  return hits;
}

/** 按 id 取技能元信息 */
export function skillById(id) {
  return SKILL_LIST.find((s) => s.id === id);
}
