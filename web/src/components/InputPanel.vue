<script setup>
import { ref } from "vue";
import { api, fileToBase64 } from "../api.js";

const props = defineProps({
  jdText: { type: String, default: "" },
  resumeText: { type: String, default: "" },
  busy: { type: Boolean, default: false },
  history: { type: Array, default: () => [] },
});

const emit = defineEmits([
  "update:jdText",
  "update:resumeText",
  "analyze",
  "sample",
  "toast",
  "open-history",
  "remove-history",
]);

const mode = ref("paste"); // paste | pdf
const parsing = ref(false);
const dragging = ref(false);
const pdfInfo = ref("");
const fileInput = ref(null);

function onFile(files) {
  const file = files?.[0];
  if (!file) return;
  if (!/\.pdf$/i.test(file.name)) {
    emit("toast", "这里只收 PDF；换成文本可以切到「粘贴文本」");
    return;
  }
  parsePdf(file);
}

async function parsePdf(file) {
  parsing.value = true;
  pdfInfo.value = "";
  try {
    const base64 = await fileToBase64(file);
    const res = await api.parsePdf(file.name, base64);
    emit("update:resumeText", res.text);
    pdfInfo.value = `已从《${file.name}》提取 ${res.pages} 页、${res.chars} 字${
      res.via === "node" ? "（内置解析）" : ""
    }，可以直接在上面编辑`;
    emit("toast", "PDF 已转成文本，检查一下有没有串行再开始分析");
  } catch (err) {
    pdfInfo.value = "";
    emit("toast", err.message);
  } finally {
    parsing.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

function clock(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
</script>

<template>
  <div class="left">
    <!-- JD -->
    <section class="card">
      <div class="card-head">
        <div class="card-title">岗位描述（JD）</div>
        <span class="tiny">必填</span>
      </div>
      <div class="card-body">
        <textarea
          class="field jd-textarea"
          :value="jdText"
          placeholder="把招聘网站的 JD 整段粘进来，包括「岗位职责」和「任职要求」。内容越全，分数越准。"
          @input="emit('update:jdText', $event.target.value)"
        ></textarea>
        <div class="counter">
          <span>{{ jdText.trim() ? "已识别到文本" : "还没粘贴内容" }}</span>
          <span>{{ jdText.length }} 字</span>
        </div>
      </div>
    </section>

    <!-- 简历 -->
    <section class="card">
      <div class="card-head">
        <div class="card-title">简历</div>
        <span class="tiny">PDF 或文本</span>
      </div>
      <div class="card-body">
        <div class="tabs">
          <button class="tab" :class="{ on: mode === 'paste' }" @click="mode = 'paste'">粘贴文本</button>
          <button class="tab" :class="{ on: mode === 'pdf' }" @click="mode = 'pdf'">上传 PDF</button>
        </div>

        <div v-if="mode === 'pdf'" style="margin-bottom: 10px">
          <div
            class="drop"
            :class="{ dragging }"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="dragging = false; onFile($event.dataTransfer.files)"
          >
            <div class="drop-title">{{ parsing ? "正在提取文字…" : dragging ? "松手就解析" : "拖入 PDF 简历" }}</div>
            <div class="drop-sub">本地解析，文件不上传外网</div>
            <button class="btn" :disabled="parsing" @click="fileInput.click()">选择 PDF 文件</button>
          </div>
          <div v-if="pdfInfo" class="banner" style="margin-top: 10px">{{ pdfInfo }}</div>
          <input
            ref="fileInput"
            type="file"
            accept=".pdf,application/pdf"
            hidden
            @change="onFile($event.target.files)"
          />
        </div>

        <textarea
          class="field resume-textarea"
          :value="resumeText"
          placeholder="粘贴简历全文：个人优势、专业技能、项目经历、教育经历。从 PDF 提取后会填到这里，可以先改错字。"
          @input="emit('update:resumeText', $event.target.value)"
        ></textarea>
        <div class="counter">
          <span>{{ mode === "pdf" ? "提取结果可直接编辑" : "文本越具体越准" }}</span>
          <span>{{ resumeText.length }} 字</span>
        </div>
      </div>
    </section>

    <button class="btn primary analyze-btn" :disabled="busy" @click="emit('analyze')">
      {{ busy ? "分析中…" : "开始分析" }}
    </button>

    <div style="display: flex; gap: 8px">
      <button class="btn" style="flex: 1" :disabled="busy" @click="emit('sample')">填入示例 JD + 简历</button>
    </div>

    <!-- 历史 -->
    <section class="card" v-if="history.length">
      <div class="card-head">
        <div class="card-title">最近分析</div>
        <span class="tiny">{{ history.length }} 条</span>
      </div>
      <div class="card-body" style="padding-top: 4px">
        <div
          v-for="item in history"
          :key="item.id"
          class="hist-item"
          @click="emit('open-history', item.id)"
        >
          <span class="hist-score" :style="{ color: item.total >= 70 ? 'var(--good)' : item.total >= 55 ? 'var(--warn)' : 'var(--bad)' }">
            {{ item.total }}
          </span>
          <span class="hist-title">{{ item.jobTitle }}</span>
          <span class="tiny">{{ clock(item.createdAt) }}</span>
          <button class="hist-del" title="删除" @click.stop="emit('remove-history', item.id)">✕</button>
        </div>
      </div>
    </section>
  </div>
</template>
