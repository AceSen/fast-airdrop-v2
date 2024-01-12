<template>
  <el-divider content-position="left">资金归集配置</el-divider>
  <el-row>
    <el-col :span="3">
      <el-button type="primary" @click="collect" :disabled="disabled">资金归集</el-button>
    </el-col>
    <el-col :span="2"><el-text class="mx-1" >间隔时长(秒) :</el-text></el-col>
    <el-col :span="2"><el-input v-model="timeDuration" type="number" placeholder="请输入间隔时长"/></el-col>

    <el-col :span="3" class="padding-left">
      <el-select v-model="chainnetSelected" value-key="chainName" clearable placeholder="选择区块链网络" @change="loadCurrencyList">
        <el-option
          v-for="item in chainnetList"
          :key="item.chainId"
          :label="item.chainName"
          :value="item"
        />
      </el-select>
    </el-col>

    <el-col :span="3" class="padding-left">
      <el-select v-model="coinSelected" value-key="contract" clearable placeholder="请选择币种">
        <el-option
          v-for="item in coinList"
          :key="item.contract"
          :label="item.name"
          :value="item"
        />
      </el-select>
    </el-col>

  </el-row>
  <br/>
  <el-row>
    <el-input
    v-model="inputData"
    :rows="4"
    type="textarea"
    wrap="off"
    placeholder="请严格按照该格式输入数据 : 发送者私钥----发送者地址----接收者地址----金额"
    />
  </el-row>

  <el-divider content-position="left">资金归集日志</el-divider>
  <el-col :span="24">
    <LogText :log="log"></LogText>
  </el-col>
</template>

<script>

import DateUtils from '@/utils/DateUtils';
import NumberUtils from '@/utils/NumberUtils';
import LogText from '@/components/LogText'
import { ethers } from 'ethers'
import { RpcProvider, Account, Contract, cairo, CallData, constants, Provider, ec, stark, hash } from "starknet";

export default {
  // provider放放在最外层, 解决ethers兼容问题
  provider: {},

  components: {
    LogText,
  },
  data() {
    return {
      disabled: false,
      chainnetList:[
        {chainId: "0", chainName: "Starknet"},
        {chainId: 1, chainName: "ETH_ERC20"},
        {chainId: 324, chainName: "ETH_zkSync_Era"},
      ],
      currencyMap: {
        Starknet: [
          {name: "ETH", contract: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", decimals: 10**18},
        ],
        ETH_ERC20: [
          {name: "ETH", contract: "", decimals: 10**18},
        ],
        ETH_zkSync_Era: [
          {name: "ETH", contract: "", decimals: 10**18},
        ]
      },
      coinList:[],
      timeDuration: 1,
      chainnetSelected: {},
      coinSelected: {},
      inputData: "",
      log: "",
    }
  },

  methods: {
    /**
     * 加载币种下拉框
     */
    loadCurrencyList() {
      const chainName = this.chainnetSelected.chainName;
      this.coinList = this.currencyMap[chainName];
      // 初始化provider
      if (chainName === 'Starknet') {
        // this.provider = new Provider({ 
        //       sequencer: {
        //         network: constants.NetworkName.SN_MAIN,
        //         headers: {"Origin": "https://starkscan.co", "Referer": "https://starkscan.co/"}
        //       }
        //     });
        this.provider = new RpcProvider({ nodeUrl: "https://starknet-mainnet.public.blastapi.io/" });
        // this.provider = new SequencerProvider({ baseUrl: constants.BaseUrl.SN_GOERLI });
      } else if (chainName === 'ETH_ERC20') {
        this.provider = ethers.getDefaultProvider()

      } else if (chainName === 'ETH_zkSync_Era') {
        this.provider = new ethers.JsonRpcProvider('https://mainnet.era.zksync.io')
      }
    },

    /**
     * 归集金额
     */
    async collect() {
      if (!this.timeDuration || !this.chainnetSelected || !this.coinSelected ||!this.inputData) {
        alert("请将配置项输入完整")
        return;
      }
      this.disabled = true;
      let rows = this.inputData.split('\n')
      await this.pushLog(`即将在${this.chainnetSelected.chainName}网络对${rows.length}个地址进行归集!!!`)
      for (let [index, row] of rows.entries()) {
        let arr = row.split('----');
        let privateKey = arr[0];
        let sender = arr[1];
        let receiver = arr[2];
        let amount = arr[3];

        await this.pushLog(`第${index + 1}个地址: ${sender} 归集到 ${receiver}, 归集数量: ${amount}`);

        let txHahs = "";
        if (this.chainnetSelected.chainName === 'Starknet') {
          txHahs = await this.starknetCollect(privateKey, sender, receiver, amount);
        } else if (this.chainnetSelected.chainName === 'ETH_ERC20' || 
                   this.chainnetSelected.chainName === 'ETH_zkSync_Era') {

          txHahs = await this.ethCollect(privateKey, sender, receiver, amount)
        }

        await this.queryTxStatus(txHahs);
        if (index == rows.length - 1) {
          break;
        }
        await DateUtils.sleep(this.timeDuration * 1000);
      }

      await this.pushLog('============所有资金归集完成!!!============')

    },

    async ethCollect(privateKey, sender, receiver, amount) {
      let wallet = new ethers.Wallet(privateKey, this.provider);
      // 创建交易请求，参数：to为接收地址，value为ETH数额
      let tx = {
          to: receiver,
          value: ethers.parseEther(amount)
      }
      let txHash = "";
      await wallet.sendTransaction(tx).then(async res => {
        txHash = res.hash;
        await this.pushLog(`地址: ${sender}交易发送成功, 交易hash: ${res.hash}`);
      }).catch(async err => {
        await this.pushLog(`地址: ${sender}交易发送失败, 错误信息: ${err}`);
      })
      return txHash;
    },

    async starknetCollect(privateKey, sender, receiver, amount) {

      let account = new Account(this.provider, sender, privateKey, '1');
      let call = {
        contractAddress: this.coinSelected.contract,
        entrypoint: "transfer",
        calldata: CallData.compile({
          recipient: cairo.felt(receiver),
          amount: cairo.uint256(amount * this.coinSelected.decimals),
        }),
      }
      let nonce = await account.getNonce();
      console.log(nonce)
      let detail = this.getTxDetail(nonce);
      let txHash = "";
      // console.log(call)
      await account.execute(call, null, detail).then(async res => {

        await this.pushLog(`地址: ${sender}交易发送成功, 交易hash: ${res.transaction_hash}`);
        txHash = res.transaction_hash;
      }).catch(async err => {
        console.dir(err)
        await this.pushLog(`地址: ${sender}交易发送失败, 错误信息: ${err}`);
      })

      return txHash;

    },


    /**
     * 查询交易状态
     * @param {*} txHash 
     */
    async queryTxStatus(txHash) {
      await this.pushLog("正在获取交易状态......")
      console.log(txHash)

      if (txHash && txHash != "" && this.chainnetSelected.chainName === 'Starknet') {
        let receipt = null;
        do {
          
          // receipt = await this.provider.getTransactionReceipt(BigInt(txHash));
          receipt = await this.provider.waitForTransaction(BigInt(txHash));
          console.dir(receipt);
          console.log(`状态:${receipt.finality_status};`)
          await DateUtils.sleep(3000);
        } while(receipt.status === 'RECEIVED' || receipt.status === 'NOT_RECEIVED')

        await this.pushLog(`交易hash:${txHash}, 状态:${receipt.status}, 实际gas:${parseInt(receipt.actual_fee, 16)}wei`)

      } else if (txHash && txHash != "" && 
                (this.chainnetSelected.chainName === 'ETH_ERC20' || this.chainnetSelected.chainName === 'ETH_zkSync_Era')) {
        
        await DateUtils.sleep(4500)
        const res = await this.provider.getTransactionReceipt(txHash);
        console.log(res)
        await this.pushLog(`交易hash:${txHash}, gas price:${res.gasPrice * res.gasUsed}wei`)
        
      } else {
        this.pushLog(`交易hash为空`)
      }
    },

    getTxDetail(nonce) {
      return {
        nonce: BigInt(nonce),
        maxFee: 602599728671638n,
        version: 1n,
      };
    },

  /**
   * 记录日志
   * @param {*string} logMsg 
   */
    async pushLog(logMsg) {
      let dateStr = DateUtils.formatDateTime(new Date());
      this.log = "[" + dateStr + "]" + "  :  " + logMsg;
    },
  },
  async mounted() {
  },

}
</script>

<style>
.padding-left {
  padding-left: 20px
}

</style>