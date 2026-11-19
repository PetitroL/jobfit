<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  result: { type: Object, required: true },
});

const openKey = ref("");

const total = computed(() => props.result.total);
const grade = computed(() => props.result.grade);
const ringColor = computed(() =>
  total.value >= 70 ? "var(--good)" : total.value >= 55 ? "var(--warn)" : "var(--bad)"
);
const ringStyle = computed(() => ({
  background: `conic-gradient(from -90deg, ${ringColor.value} 0% ${total.value}%, #edebe4 ${total.value}% 100%)`,
}));

function toggle(key) {
  openKey.value = openKey.value === key ? "" : key;
}

function pct(dim) {
  return Math.round((dim.score / dim.full) * 100);
}

const facts = computed(() => {
  const r = props.result;
  const list = [];
  if (r.jd.years?.min) list.push(`要求 ${r.jd.years.min} 年以上`);
  if (r.jd.degree) list.push(`学历 ${r.jd.degree}`);
  if (r.resume.years) list.push(`简历 ${r.resume.years} 年经验`);
  list.push(`JD ${r.meta.jdChars} 字 · 简历 ${r.meta.resumeChars} 字`);
  return list;
});

function oneLine() {
  const r = props.result;
  const weak = [...r.dimensions].sort((a, b) => a.score / a.full - b.score / b.full)[0];
  if (r.total >= 85) return "技术栈与岗位高度重合，可以优先投。";
  if (r.total >= 70) return `整体对得上，「${weak.label}」还有补分空间，改一版再投。`;
  if (r.total >= 55) return `方向对但差距明显，「${weak.label}」是主要短板。`;
  return `硬性条件差距较大，「${weak.label}」是最大障碍。`;
}
</script>

<template>
  <section class="card score-card">
    <div class="ring" :style="ringStyle">
      <div class="ring-inner">
        <div class="ring-score">{{ total }}</div>
        <div class="ring-label">MATCH</div>
      </div>
    </div>

    <div class="score-info">
      <span class="grade-pill" :class="grade.tone">{{ grade.label }}</span>
      <div class="score-title">{{ result.jd.title }}</div>
      <div class="tiny" style="line-height: 1.8">{{ oneLine() }}</div>
      <div class="score-meta" style="margin-top: 8px">
        <span v-for="f in facts" :key="f">{{ f }}</span>
      </div>
    </div>
  </section>

  <section class="card" style="margin-top: 14px">
    <div class="card-head">
      <div class="card-title">五维拆解</div>
      <span class="tiny">点一行看依据</span>
    </div>
    <div class="card-body" style="padding-top: 2px">
      <div v-for="dim in result.dimensions" :key="dim.key">
        <div class="dim-row" @click="toggle(dim.key)">
          <span class="dim-name">{{ dim.label }}</span>
          <span class="dim-bar">
            <span
              class="dim-fill"
              :style="{
                width: pct(dim) + '%',
                background:
                  pct(dim) >= 80 ? 'var(--good)' : pct(dim) >= 50 ? 'var(--brand)' : pct(dim) >= 25 ? 'var(--warn)' : 'var(--bad)',
              }"
            ></span>
          </span>
          <span class="dim-score"><b>{{ dim.score }}</b> / {{ dim.full }}</span>
          <div v-if="openKey === dim.key" class="dim-detail">{{ dim.detail }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
