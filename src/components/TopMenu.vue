<template>
  <el-menu
    :default-active="this.$route.path"
    class="el-menu-demo"
    mode="horizontal"
    @select="handleSelect"
    router
  >
    <el-sub-menu index="/exchange">
      <template #title>交易所</template>
      <el-menu-item index="/exchange/okx">OKX</el-menu-item>
    </el-sub-menu>

    <el-sub-menu index="/task">
      <template #title>交互任务</template>
      <el-menu-item index="/task/stark">stark net</el-menu-item>
    </el-sub-menu>

    <el-menu-item index="/fundCollection">资金归集</el-menu-item>
  </el-menu>
</template>

<script>
export default {
  name: "TopMenu",
  data() {
    return {
      isRouterProject: true,
    };
  },
  method: {
    reloadProject() {
      this.isRouterProject = false;
      this.$nextTick(function () {
        this.isRouterProject = true;
      });
    },
  },
  mounted() {
  },
};
</script>
