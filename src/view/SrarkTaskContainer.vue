<template>
    <el-tabs v-model="activeName" class="demo-tabs" @tab-click="handleClick">
      <el-tab-pane label="swap 交互" name="interactSwap">
        <StarkSwapTask/>
      </el-tab-pane>
      <el-tab-pane label="nft 交互" name="interactNft">
        <StarkNftTask/>
      </el-tab-pane>
      <el-tab-pane label="折扣域名交互" name="discountStarkid">
        <StarkidDiscount/>
      </el-tab-pane>
      
    </el-tabs>
  </template>
  
  <script>
  
  import StarkSwapTask from './task/StarkSwapTask'
  import StarkNftTask from './task/StarkNftTask'
  import StarkidDiscount from './task/StarkidDiscount'
  
  export default {
    name: "SrarkTaskContainer",
    components: {
      StarkSwapTask,
      StarkNftTask,
      StarkidDiscount,
    },
    data() {
      return {
        activeName: "interactSwap"
      }
    }
  }
  
  </script>
  
  <style>
    .demo-tabs > .el-tabs__content {
      padding: 3px;
      color: #6b778c;
      font-size: 32px;
      font-weight: 600;
    }
  </style>
  