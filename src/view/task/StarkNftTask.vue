<template>
  <el-divider content-position="left">dapp 配置</el-divider>
  <el-row>
    <el-col :span="24">
      <el-checkbox-group v-model="checkedDappList">
        <el-checkbox
          v-for="dapp in dappList"
          :key="dapp"
          :label="dapp"
          border
          >{{ dapp }}</el-checkbox
        >
      </el-checkbox-group>
    </el-col>
  </el-row>

  <el-divider content-position="left">任务配置</el-divider>
  <el-row>
    <el-col :span="2"><el-text class="mx-1">任务执行次数:</el-text></el-col>
    <el-col :span="2">
      <el-input v-model="times" type="number" placeholder="执行次数" />
    </el-col>
    <el-col :span="2"><el-text class="mx-1">任务间隔时间(秒):</el-text></el-col>
    <el-col :span="3">
      <el-input
        v-model="taskDurationTime"
        type="number"
        placeholder="任务间隔时间"
      />
    </el-col>
    <el-col :span="3"><el-text class="mx-1">DAPP间隔时间(秒):</el-text></el-col>
    <el-col :span="3">
      <el-input
        v-model="dappDurationTime"
        type="number"
        placeholder="DAPP间隔时间"
      />
    </el-col>
    <el-col :span="3"><el-text class="mx-1">地址交互间隔(秒):</el-text></el-col>
    <el-col :span="3">
      <el-input
        v-model="addressDurationTime"
        type="number"
        placeholder="地址交互间隔"
      />
    </el-col>

    <el-col :span="2">
      <el-button type="primary" @click="dataTx" :disabled="disabled"
        >开始交互</el-button
      >
    </el-col>
  </el-row>

  <el-divider content-position="left" border-style="solid"
    >交互账户配置</el-divider
  >
  <el-col :span="24">
    <el-input
      v-model="inputData"
      :rows="6"
      type="textarea"
      wrap="off"
      placeholder="私钥----地址"
    />
  </el-col>

  <el-divider content-position="left" border-style="solid">交互日志</el-divider>
  <el-col :span="24">
    <LogText :log="log"></LogText>
  </el-col>
</template>

<script>

import {
  RpcProvider,
  Account,
  Contract,
  cairo,
  CallData,
  constants,
  Provider,
  ec,
  stark,
  hash,
} from "starknet";

import DateUtils from "@/utils/DateUtils";
import NumberUtils from "@/utils/NumberUtils";
import LogText from "@/components/LogText";
import ArrayUtils from '@/utils/ArrayUtils'

export default {
  name: "StarkTask",
  components: {
    LogText,
  },
  data() {
    return {
      provider: new Provider({
        sequencer: {
          network: constants.NetworkName.SN_MAIN,
          headers: {
            Origin: "https://starkscan.co",
            Referer: "https://starkscan.co/",
          },
        },
      }),
      inputData: "",
      checkedDappList: [],
      dappList: ["starknet id", "stark verse"],
      times: 1,
      taskDurationTime: 160,
      dappDurationTime: 60,
      addressDurationTime: 180,
      account: {},
      log: "",
      disabled: false,
      argentXproxyClassHash: "0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918",
      argentXaccountClassHash: "0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2",
      selector: {
        "0x060582df2cd4ad2c988b11fdede5c43f56a432e895df255ccd1af129160044b8": "publicMint",
        "0x05dbdedc203e92749e2e746e2d40a768d966bd243df04a6b712e222bc040a9af": "mint",
      },
      starknetIdAddr: "0x05dbdedc203e92749e2e746e2d40a768d966bd243df04a6b712e222bc040a9af",
      starkVerseAddr: "0x060582df2cd4ad2c988b11fdede5c43f56a432e895df255ccd1af129160044b8",
    };
  },

  methods: {
    /**
     * 记录日志
     * @param {*string} logMsg
     */
    async pushLog(logMsg) {
      let dateStr = DateUtils.formatDateTime(new Date());
      this.log = "[" + dateStr + "]" + "  :  " + logMsg;
    },
    /**
     * 进行数据交互
     */
    async dataTx() {
      if (
        !this.checkedDappList ||
        !this.times ||
        !this.taskDurationTime ||
        !this.dappDurationTime ||
        !this.inputData
      ) {
        alert("请输入配置");
        return;
      }
      if (this.checkedDappList.length < 1) {
        alert("请勾选交互的dapp");
        return;
      }
      this.disabled = true;
      await this.pushLog(
        `即将与${this.checkedDappList.length}个合约进行交互......`
      );

      for (let i = 0; i < this.times; i++) {
        await this.handleAddressTx();
        if (i === this.times - 1) {
          break;
        }
        await DateUtils.sleep(this.taskDurationTime * 1000);
      }
      await this.pushLog(`============所有任务交互完成============`);
    },

    /**
     * 处理地址交互
     */
    async handleAddressTx() {
      const rows = this.inputData.split("\n");

      console.log(rows);
      let idx = 0;
      for (const row of rows) {
        // 单地址开始交互
        const arr = row.split("----");
        let secret = arr[0];
        let address = arr[1];
        await this.handleDappTx(secret, address);
        if (idx === rows.length - 1) {
          break;
        }
        ++idx;
        await DateUtils.sleep(this.addressDurationTime * 1000);
      }
    },

    /**
     * 处理dapp交互
     * @param {*string} secret
     * @param {*string} address
     * @param {*number} amount
     */
    async handleDappTx(secret, address) {
      let dapps = [...this.checkedDappList];
      // 打乱交互dapp任务顺序
      dapps = ArrayUtils.shuffleArray(dapps);

      while (dapps.length > 0) {
        let dapp = dapps.shift();

        try {
          await this.doDappTx(secret, address, dapp);
        } catch (err) {
          await this.pushLog(
            `地址: ${address}, 交互合约: ${dapp}, 发生异常, 8秒后进行下一个dapp交互`
          );
          console.log(err);
          await DateUtils.sleep(8 * 1000);
          continue;
        }
        if (dapps.length === 0) {
          break;
        }
        await DateUtils.sleep(this.dappDurationTime * 1000);
      }
    },

    /**
     * 执行单dapp交互
     * @param {*string} secret
     * @param {*string} address
     * @param {*number} amount
     * @param {*string} dapp
     */
    async doDappTx(secret, address, dapp) {
      // 激活账户
      await this.deployAccount(secret, address);

      let txHash = "";
      if (dapp === "starknet id") {
        txHash = await this.starknetIdMint(secret, address);
      } else if (dapp === "stark verse") {
        txHash = await this.starkverseMint(secret, address);
      }
      console.log(txHash);
      await this.queryTxStatus(txHash);
    },

    /**
     * starknet id 铸造nft
     * @param {*} secret 
     * @param {*} address 
     * @param {*} amount 
     * @param {*} swapEth 
     */
    async starknetIdMint(secret, address) {
      this.account = new Account(this.provider, address, secret, '1');

      await this.pushLog(`地址: ${address}, 开始构建Call`);
      let nftCall = this.getMintCall(this.starknetIdAddr, address);
      await this.pushLog(`地址: ${address}, 构建call完成`);

      console.log(nftCall)

      let nonce = await this.account.getNonce();
      await this.pushLog(`地址: ${address}, 获取到Nonce:${parseInt(nonce)}`);
      let detail = this.getTxDetail(nonce);

      await this.pushLog(`地址: ${address}, 开始合约交互......`);

      let txHash = "";
      await this.account.execute([nftCall], null, detail).then(res => {
        txHash = res.transaction_hash;
        this.pushLog(`地址: ${address}, starknet id nft 铸造成功; 交易hash:${res.transaction_hash}`);
      }).catch(err => {
        this.pushLog(`地址: ${address}, starknet id nft 铸造失败; 错误信息: ${err}`);
      })
      return txHash;
    },

    async starkverseMint(secret, address) {
      this.account = new Account(this.provider, address, secret, '1');

      await this.pushLog(`地址: ${address}, 开始构建Call`);
      let nftCall = this.getMintCall(this.starkVerseAddr, address);
      await this.pushLog(`地址: ${address}, 构建call完成`);

      console.log(nftCall);

      let nonce = await this.account.getNonce();
      await this.pushLog(`地址: ${address}, 获取到Nonce:${parseInt(nonce)}`);
      let detail = this.getTxDetail(nonce);

      await this.pushLog(`地址: ${address}, 开始合约交互......`);
      let txHash = "";
      await this.account.execute([nftCall], null, detail).then(res => {
        txHash = res.transaction_hash;
        this.pushLog(`地址: ${address}, starkverse nft 铸造成功; 交易hash:${res.transaction_hash}`);
      }).catch(err => {
        this.pushLog(`地址: ${address}, starkverse nft 铸造失败; 错误信息: ${err}`);
      })
      return txHash;
    },

    getTxDetail(nonce) {
      return {
        nonce: BigInt(nonce),
        maxFee: 562599728671638n,
        version: 1n,
      };
    },

    /**
     * 获取call
     * @param {*} contractAddr 
     * @param {*} address 
     */
    getMintCall(contractAddr, address) {
      let call = {
        contractAddress: contractAddr,
        entrypoint: this.selector[contractAddr],
        calldata: null,
      }
      
      if (contractAddr === this.starknetIdAddr) {
        call.calldata = CallData.compile({
          starknet_id: cairo.felt(NumberUtils.getRandomNum12())
        })
      } else if (contractAddr === this.starkVerseAddr) {
        call.calldata = CallData.compile({
          to: cairo.felt(address)
        })
      }
      return call;
    },

    /**
     * 查询交易状态
     * @param {*} txHash
     */
    async queryTxStatus(txHash) {
      await this.pushLog("正在获取交易状态......");
      if (txHash != "") {
        let receipt = null;
        do {
          receipt = await this.provider.getTransactionReceipt(BigInt(txHash));
          console.log(`状态:${receipt.status};`);
          await DateUtils.sleep(3000);
        } while (
          receipt.status === "RECEIVED" ||
          receipt.status === "NOT_RECEIVED"
        );

        await this.pushLog(`交易hash:${txHash}, 状态:${receipt.status}, 实际gas:${parseInt(receipt.actual_fee, 16)}wei`);
      } else {
        this.pushLog(`交易hash为空`);
      }
    },
    /**
     * 部署新账户
     * @param {*} secret 
     * @param {*} address 
     */
    async deployAccount(secret, address) {
      this.account = new Account(this.provider, address, secret, '1');
      const nonce = await this.account.getNonce();
      if (parseInt(nonce) === 0) {
        // 新账户, 需要激活;
        await this.pushLog(`地址:${address}, 需要部署; 正在部署中......`);
        const publicKey = ec.starkCurve.getStarkKey(secret);

        const AXproxyConstructorCallData = CallData.compile({
            implementation: this.argentXaccountClassHash,
            selector: hash.getSelectorFromName("initialize"),
            calldata: CallData.compile({ signer: publicKey, guardian: "0" }),
        });

        const deployAccountPayload = {
          classHash: this.argentXproxyClassHash,
          constructorCalldata: AXproxyConstructorCallData,
          contractAddress: address,
          addressSalt: publicKey
        };
        const { transaction_hash: AXdAth, contract_address: AXcontractFinalAdress } = await this.account.deployAccount(deployAccountPayload);
        await this.pushLog(`地址:${AXcontractFinalAdress}, 交易hash: ${AXdAth}. 部署完成`);
        await this.queryTxStatus(AXdAth);
      }

    },
  },
};
</script>

<style></style>
