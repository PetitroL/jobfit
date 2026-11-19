<script setup>
import { onMounted, ref } from "vue";
import { api } from "./api.js";
import InputPanel from "./components/InputPanel.vue";
import ScorePanel from "./components/ScorePanel.vue";
import KeywordPanel from "./components/KeywordPanel.vue";
import AdvicePanel from "./components/AdvicePanel.vue";

const jdText = ref("");
const resumeText = ref("");
const busy = ref(false);
const current = ref(null); // { id, createdAt, result, advice }
const history = ref([]);
const toastText = ref("");
const errorText = ref("");

let toastTimer = null;

function toast(msg) {
  toastText.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastText.value = ""), 2200);
}

async function analyze() {
  errorText.value = "";
  if (!jdText.value.trim()) return toast("先把岗位 JD 粘进来");
  if (!resumeText.value.trim()) return toast("还要提供简历内容");

  busy.value = true;
  try {
    const data = await api.analyze(jdText.value, resumeText.value);
    current.value = data;
    await loadHistory();
    toast(`分析完成：${data.result.total} 分`);
  } catch (err) {
    errorText.value = err.message;
    toast(err.message);
  } finally {
    busy.value = false;
  }
}

async function fillSample() {
  try {
    const s = await api.sample();
    jdText.value = s.jdText;
    resumeText.value = s.resumeText;
    toast("已填入示例，直接点「开始分析」就能看到效果");
  } catch (err) {
    toast(err.message);
  }
}

async function loadHistory() {
  try {
    const res = await api.history();
    history.value = res.items;
  } catch {
    /* 历史失败不影响主流程 */
  }
}

async function openHistory(id) {
  try {
    const item = await api.historyItem(id);
    current.value = item;
    jdText.value = item.jdPreview || jdText.value;
    resumeText.value = item.resumePreview || resumeText.value;
  } catch (err) {
    toast(err.message);
  }
}

async function removeHistory(id) {
  try {
    await api.removeHistory(id);
    if (current.value?.id === id) current.value = null;
    await loadHistory();
  } catch (err) {
    toast(err.message);
  }
}

onMounted(async () => {
  await loadHistory();

  // 分享链接： #demo 直接跑示例； #record=<id> 打开某次分析
  const hash = location.hash.slice(1);
  if (hash === "demo") {
    await fillSample();
    await analyze();
  } else if (hash.startsWith("record=")) {
    await openHistory(hash.slice(7));
  }
});
</script>

<template>
  <header class="topbar">
    <div class="logo">JF</div>
    <div>
      <div class="brand-title">JobFit</div>
      <div class="brand-sub">JD × 简历匹配分析 · 说清楚差在哪、怎么改</div>
    </div>
    <div class="topbar-spacer"></div>
    <div class="topbar-actions">
      <button class="ghost-btn" :disabled="busy" @click="fillSample">示例</button>
      <button class="ghost-btn" :disabled="busy" @click="analyze">重新分析</button>
    </div>
  </header>

  <main class="layout">
    <InputPanel
      :jd-text="jdText"
      :resume-text="resumeText"
      :busy="busy"
      :history="history"
      @update:jd-text="jdText = $event"
      @update:resume-text="resumeText = $event"
      @analyze="analyze"
      @sample="fillSample"
      @toast="toast"
      @open-history="openHistory"
      @remove-history="removeHistory"
    />

    <div class="right">
      <div v-if="errorText" class="banner error" style="margin-bottom: 14px">{{ errorText }}</div>

      <template v-if="current">
        <ScorePanel :result="current.result" />
        <KeywordPanel :keywords="current.result.keywords" style="margin-top: 14px" />
        <AdvicePanel
          :advice="current.advice"
          :job-title="current.result.jd.title"
          style="margin-top: 14px"
          @toast="toast"
        />
      </template>

      <div v-else class="empty">
        <div class="empty-title">左边贴 JD，右边出结论</div>
        <div class="empty-sub">
          粘贴岗位描述与简历后点「开始分析」，会得到 0-100 的匹配分、五个维度的扣分原因，
          以及每条都能直接复制到简历里的改法。没有现成材料可以先用示例跑一遍。
        </div>
        <div class="empty-steps">
          <div class="step"><b>01</b>粘 JD</div>
          <div class="step"><b>02</b>放简历（PDF 或文本）</div>
          <div class="step"><b>03</b>看分 + 抄改法</div>
        </div>
        <button class="btn primary" style="margin-top: 14px" @click="fillSample">用示例试一下</button>
      </div>
    </div>

    <div v-if="toastText" class="toast">{{ toastText }}</div>
  </main>
</template>
