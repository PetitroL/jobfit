<script setup>
import { ref } from "vue";

const props = defineProps({
  advice: { type: Object, required: true },
  jobTitle: { type: String, default: "" },
});

const emit = defineEmits(["toast"]);

const copied = ref("");

const LEVEL_TEXT = { high: "优先", mid: "建议", low: "可选", info: "优势" };

async function copy(text, key) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // 老浏览器/非 https 时的兜底
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  copied.value = key;
  emit("toast", "已复制，可以直接粘到简历或聊天窗");
  setTimeout(() => {
    if (copied.value === key) copied.value = "";
  }, 1800);
}
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div class="card-title accent">逐条建议</div>
      <span class="tiny">{{ advice.items.length }} 条 · 每条可单独复制</span>
    </div>
    <div class="card-body">
      <div v-for="(item, i) in advice.items" :key="i" class="advice-item" :class="item.level">
        <div class="advice-title">
          <span class="advice-tag" :class="item.level">{{ LEVEL_TEXT[item.level] || "提示" }}</span>
          {{ item.title }}
        </div>
        <div class="advice-body">{{ item.body }}</div>
        <div class="advice-action">{{ item.action }}</div>
        <div class="advice-foot">
          <button class="btn sm" @click="copy(item.copy, 'item-' + i)">
            {{ copied === "item-" + i ? "已复制 ✓" : "复制这条改法" }}
          </button>
        </div>
      </div>
    </div>
  </section>

  <section class="card" style="margin-top: 14px">
    <div class="card-head">
      <div class="card-title">可直接发送的匹配说明</div>
      <button class="btn sm" @click="copy(advice.copyText, 'all')">
        {{ copied === "all" ? "已复制 ✓" : "复制全文" }}
      </button>
    </div>
    <div class="card-body">
      <div class="copy-box">{{ advice.copyText }}</div>
      <div class="tiny" style="margin-top: 8px">
        投递时可以直接放在打招呼消息或邮件正文的第一段；如果要贴简历里，删掉「待补」那一行。
      </div>
    </div>
  </section>
</template>
