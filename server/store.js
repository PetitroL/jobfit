/**
 * 分析记录：内存里保留最近 20 条，方便对比不同 JD 的匹配度。
 * 只存 JD/简历的前 1200 字摘要，避免撑爆内存，也避免把完整简历长期留着。
 */

export class AnalysisStore {
  constructor({ limit = 20 } = {}) {
    this.limit = limit;
    this.items = [];
  }

  add({ jdText, resumeText, result, advice }) {
    const item = {
      id: `fit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      createdAt: Date.now(),
      jobTitle: result.jd.title,
      total: result.total,
      grade: result.grade,
      jdPreview: String(jdText).slice(0, 300),
      resumePreview: String(resumeText).slice(0, 300),
      result,
      advice,
    };
    this.items.unshift(item);
    if (this.items.length > this.limit) this.items.length = this.limit;
    return item;
  }

  list() {
    return this.items.map((i) => ({
      id: i.id,
      createdAt: i.createdAt,
      jobTitle: i.jobTitle,
      total: i.total,
      grade: i.grade,
    }));
  }

  get(id) {
    return this.items.find((i) => i.id === id) || null;
  }

  remove(id) {
    const before = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    return this.items.length !== before;
  }

  clear() {
    this.items = [];
  }
}
