<script setup>
defineProps({
  keywords: { type: Object, required: true },
});
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div class="card-title">关键词对照</div>
      <span class="tiny">绿=简历有，红=JD 要求但没出现</span>
    </div>
    <div class="card-body">
      <div class="kw-group" v-if="keywords.hit.length">
        <div class="kw-label">已命中（{{ keywords.hit.length }}）</div>
        <div class="chips">
          <span v-for="k in keywords.hit" :key="k" class="chip hit">{{ k }}</span>
        </div>
      </div>

      <div class="kw-group" v-if="keywords.miss.length">
        <div class="kw-label">缺失（{{ keywords.miss.length }}）— 优先补这些</div>
        <div class="chips">
          <span v-for="k in keywords.miss" :key="k" class="chip miss">{{ k }}</span>
        </div>
      </div>

      <div class="kw-group" v-if="keywords.extras.length">
        <div class="kw-label">简历里有、JD 没要求的（可作差异化）</div>
        <div class="chips">
          <span v-for="k in keywords.extras" :key="k" class="chip extra">{{ k }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
