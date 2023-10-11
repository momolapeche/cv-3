<template>
  <div class="home">
    <canvas id="canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { main } from "@/js/index"

export default defineComponent({
  name: 'HomeView',
  components: {
  },
  mounted() {
      main()
  },
});
</script>
