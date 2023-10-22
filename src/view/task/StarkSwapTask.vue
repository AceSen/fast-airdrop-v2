<template>
  <el-divider content-position="left">dapp 配置</el-divider>
  <el-row>
    <el-col :span="24">
      <el-checkbox-group v-model="checkedDappList" >
        <el-checkbox v-for="dapp in dappList" :key="dapp" :label="dapp" border>{{dapp}}</el-checkbox>
      </el-checkbox-group>
    </el-col>
  </el-row>

  <el-divider content-position="left">任务配置</el-divider>
  <el-row>
    <el-col :span="2"><el-text class="mx-1">任务执行次数:</el-text></el-col>
    <el-col :span="2">
      <el-input v-model="times" type="number" placeholder="执行次数"/>
    </el-col>
    <el-col :span="2"><el-text class="mx-1">任务间隔时间(秒):</el-text></el-col>
    <el-col :span="3">
      <el-input v-model="taskDurationTime" type="number" placeholder="任务间隔时间"/>
    </el-col>
    <el-col :span="3"><el-text class="mx-1">DAPP间隔时间(秒):</el-text></el-col>
    <el-col :span="3">
      <el-input v-model="dappDurationTime" type="number" placeholder="DAPP间隔时间"/>
    </el-col>
    <el-col :span="3"><el-text class="mx-1">地址交互间隔(秒):</el-text></el-col>
    <el-col :span="3">
      <el-input v-model="addressDurationTime" type="number" placeholder="地址交互间隔"/>
    </el-col>

    <el-col :span="2">
      <el-button type="primary" @click="dataTx" :disabled="disabled">开始交互</el-button>
    </el-col>
  </el-row>
  
  <el-divider content-position="left" border-style="solid">交互账户配置</el-divider>
    <el-col :span="24">
      <el-input
        v-model="inputData"
        :rows="6"
        type="textarea"
        wrap="off"
        placeholder="私钥----地址----ETH金额(单位为eht)"
      />
    </el-col>

    <el-divider content-position="left" border-style="solid">交互日志</el-divider>
    <el-col :span="24">
      <LogText :log="log"></LogText>
    </el-col>
</template>

<script>

import { RpcProvider, Account, Contract, cairo, CallData, constants, Provider, ec, stark, hash } from "starknet";
import DateUtils from '@/utils/DateUtils'
import NumberUtils from '@/utils/NumberUtils'
import ArrayUtils from '@/utils/ArrayUtils'
import LogText from '@/components/LogText'
import starkJsonFile from '@/json/stark.json'

export default {
    name: 'StarkSwapTask',
    components: {
      LogText
    },
    data() {
        return {
            provider: new Provider({ 
              sequencer: {
                network: constants.NetworkName.SN_MAIN,
                headers: {"Origin": "https://starkscan.co", "Referer": "https://starkscan.co/"}
              }
            }),
            starkJson: starkJsonFile,
            inputData:"",
            checkedDappList:[],
            dappList:['10K Swap', 'jedi Swap', 'my Swap', 'sith Swap', 'avnu Swap'],
            times: 1,
            taskDurationTime: 160,
            dappDurationTime: 60,
            addressDurationTime: 180,
            account: {},
            log: "",
            disabled: false,
            argentXproxyClassHash: "0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918",
            argentXaccountClassHash : "0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2",
            selector: {
              '0x07a6f98c03379b9513ca84cca1373ff452a7462a3b61598f0af5bb27ad7f76d1': "swapExactTokensForTokens",
              '0x041fd22b238fa21cfcf5dd45a8548974d8263b3a531a60388411c5e230f97023': "swap_exact_tokens_for_tokens",
              '0x010884171baf1914edc28d7afb619b40a4051cfae78a094a55d230f19e944a28': "swap",
              '0x028c858a586fa12123a1ccb337a0a3b369281f91ea00544d0c086524b759f627': "swapExactTokensForTokensSupportingFeeOnTransferTokens",
              '0x04270219d365d6b017231b52e92b3fb5d7c8378b05e9abc97724537a80e93b0f': "multi_route_swap",
            },
            l0KSwapAddr: "0x07a6f98c03379b9513ca84cca1373ff452a7462a3b61598f0af5bb27ad7f76d1",
            jediSwapAddr: "0x041fd22b238fa21cfcf5dd45a8548974d8263b3a531a60388411c5e230f97023",
            mySwapAddr: "0x010884171baf1914edc28d7afb619b40a4051cfae78a094a55d230f19e944a28",
            sithSwapAddr: "0x028c858a586fa12123a1ccb337a0a3b369281f91ea00544d0c086524b759f627",
            avnuSwapAddr: "0x04270219d365d6b017231b52e92b3fb5d7c8378b05e9abc97724537a80e93b0f",
        }
    },
    methods: {
      /**
       * 获取交易详情参数
       * @param {*交易序列号} nonce 
       */
      getTxDetail(nonce) {
        return {
          nonce: BigInt(nonce),
          maxFee: 562599728671638n,
          version: 0n,
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

      /**
       * 进行数据交互
       */
      async dataTx() {
        
        if (!this.checkedDappList || !this.times || !this.taskDurationTime || !this.dappDurationTime || !this.inputData) {
          alert("请输入配置");
          return;
        }
        if (this.checkedDappList.length < 1) {
          alert("请勾选交互的dapp");
          return;
        }
        this.disabled = true;
        await this.pushLog(`即将与${this.checkedDappList.length}个合约进行交互......`)

        for(let i = 0; i < this.times; i++) {
          
          await this.handleAddressTx();
          if (i === this.times - 1) {
            break;
          }
          await DateUtils.sleep(this.taskDurationTime * 1000);
        }
        await this.pushLog(`============所有任务交互完成============`)
      },

      /**
       * 处理地址交互
       */
      async handleAddressTx () {

        const rows = this.inputData.split('\n');

        console.log(rows);
        let idx = 0;
        for (const row of rows) {
          // 单地址开始交互
          const arr = row.split('----');
          let secret = arr[0];
          let address = arr[1];
          let amount = arr[2];
          await this.handleDappTx(secret, address, amount);
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
      async handleDappTx(secret, address, amount) {
        console.log(secret, amount)
        let dapps = [...this.checkedDappList];
        // 打乱交互dapp任务顺序
        dapps = ArrayUtils.shuffleArray(dapps);
        
        while (dapps.length > 0) {
          let dapp = dapps.shift();
          let swapEth = dapps.length === 0;
          try {
            await this.doDappTx(secret, address, amount, dapp, swapEth);
          } catch(err) {
            await this.pushLog(`地址: ${address}, 交互合约: ${dapp}, 发生异常, 8秒后进行下一个dapp交互`);
            console.log(err)
            await DateUtils.sleep(8 * 1000); 
            continue;
          }
          if (swapEth) {
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
      async doDappTx(secret, address, amount, dapp, swapEth) {
        
        // 激活账户
        await this.deployAccount(secret, address);

        // 金额浮动10%
        amount = (amount * NumberUtils.floatRate(0.2)).toFixed(4);
        console.log("金额:" + amount)
        
        let txHash = "";
        if (dapp === '10K Swap') {
          txHash = await this.l0KSwap(secret, address, amount, swapEth);
        } else if (dapp === 'jedi Swap') {
          txHash = await this.jediSwap(secret, address, amount, swapEth);
        } else if (dapp === 'my Swap') {
          txHash = await this.mySwap(secret, address, amount, swapEth);
        } else if (dapp === 'sith Swap') {
          txHash = await this.sithSwap(secret, address, amount, swapEth);
        } else if (dapp === 'avnu Swap') {
          txHash = await this.avnuSwap(secret, address, amount, swapEth);
        }
        console.log(txHash)
        await this.queryTxStatus(txHash);
        
      },

      /**
       * 查询交易状态
       * @param {*} txHash 
       */
      async queryTxStatus(txHash) {
        await this.pushLog("正在获取交易状态......")
        if (txHash != "") {
          let receipt = null;
          do {
            receipt = await this.provider.getTransactionReceipt(BigInt(txHash));
            console.log(`状态:${receipt.status};`)
            await DateUtils.sleep(3000);
          } while(receipt.status === 'RECEIVED' || receipt.status === 'NOT_RECEIVED')

          await this.pushLog(`交易hash:${txHash}, 状态:${receipt.status}, 实际gas:${parseInt(receipt.actual_fee, 16)}wei`)

        } else {
          this.pushLog(`交易hash为空`)
        }
      },

      /**
       * 10k swap
       * @param {*string} secret 
       * @param {*string} address 
       * @param {*numbner} amount 
       */
      async l0KSwap(secret, address, amount, swapCoin2Eth) {
        this.account = new Account(this.provider, address, secret, '1');
        let interactType = swapCoin2Eth ? 'USDC -> ETH' : 'ETH -> USDC';

        console.log(`地址: ${address}, 正在进行10K Swap交互; 交互方式: ${interactType}; 交互金额: ${amount}`)
        await this.pushLog(`地址: ${address}, 正在进行10K Swap交互; 交互方式: ${interactType}; 交互金额: ${amount}`);


        await this.pushLog(`地址: ${address}, 开始构建Call`);
        let approveCall = await this.getApproveCall(this.starkJson.tenK.address, address, swapCoin2Eth, amount);
        let swapCall = await this.getSwapCall(this.starkJson.tenK.address, address, swapCoin2Eth, amount);
        await this.pushLog(`地址: ${address}, 构建call完成`);

        console.log(approveCall)
        console.log(swapCall)

        let nonce = await this.account.getNonce();
        await this.pushLog(`地址: ${address}, 获取到Nonce:${parseInt(nonce)}`);

        await this.pushLog(`地址: ${address}, 开始合约交互......`);
        let detail = this.getTxDetail(nonce);
        let multiCall = this.account.execute([approveCall, swapCall], null, detail);

        let txHash = ""
        await multiCall.then(res => {
          console.log(res);
          this.pushLog(`地址: ${address}, 10K Swap 交互成功; 交易hash:${res.transaction_hash}`);
          txHash = res.transaction_hash;
          console.log(res.transaction_hash)
          console.log(txHash)

        }).catch(err => {
          this.pushLog(`地址: ${address}, 10K Swap 交互失败; 错误信息: ${err}`);
        })
        console.log(txHash);
        return txHash;
      },
      
      /**
       * jedi Swap
       * @param {*} secret 
       * @param {*} address 
       * @param {*} amount 
       * @param {*} swapCoin2Eth 
       */
      async jediSwap(secret, address, amount, swapCoin2Eth) {
        this.account = new Account(this.provider, address, secret, '1');
        let interactType = swapCoin2Eth ? 'USDC -> ETH' : 'ETH -> USDC';

        await this.pushLog(`地址: ${address}, 正在进行jedi Swap交互; 交互方式: ${interactType}; 交互金额: ${amount}`);

        await this.pushLog(`地址: ${address}, 开始构建Call`);
        let approveCall = await this.getApproveCall(this.starkJson.jedi.address, address, swapCoin2Eth, amount);
        let swapCall = await this.getSwapCall(this.starkJson.jedi.address, address, swapCoin2Eth, amount);
        await this.pushLog(`地址: ${address}, 构建call完成`);

        console.log(approveCall)
        console.log(swapCall)

        let nonce = await this.account.getNonce();
        await this.pushLog(`地址: ${address}, 获取到Nonce:${parseInt(nonce)}`);

        await this.pushLog(`地址: ${address}, 开始合约交互......`);
        
        let detail = this.getTxDetail(nonce);
        let multiCall = this.account.execute([approveCall, swapCall], null, detail);

        let txHash = ""
        await multiCall.then(res => {
          console.log(res);
          txHash = res.transaction_hash;
          this.pushLog(`地址: ${address}, jedi Swap 交互成功; 交易hash:${res.transaction_hash}`);
        }).catch(err => {
          console.log(err);
          this.pushLog(`地址: ${address}, jedi Swap 交互失败; 错误信息: ${err}`);
        })
        console.log(txHash);
        return txHash
      },
      
      /**
       * my swap
       * @param {*} secret 
       * @param {*} address 
       * @param {*} amount 
       * @param {*} swapCoin2Eth 
       */
      async mySwap(secret, address, amount, swapCoin2Eth) {
        this.account = new Account(this.provider, address, secret, '1');
        let interactType = swapCoin2Eth ? 'USDC -> ETH' : 'ETH -> USDC';

        await this.pushLog(`地址: ${address}, 正在进行my Swap交互; 交互方式: ${interactType}; 交互金额: ${amount}`);

        await this.pushLog(`地址: ${address}, 开始构建Call`);
        let approveCall = await this.getApproveCall(this.starkJson.mySwap.address, address, swapCoin2Eth, amount);
        let swapCall = await this.getSwapCall(this.starkJson.mySwap.address, address, swapCoin2Eth, amount);
        await this.pushLog(`地址: ${address}, 构建call完成`);

        console.log(approveCall)
        console.log(swapCall)

        let nonce = await this.account.getNonce();
        await this.pushLog(`地址: ${address}, 获取到Nonce:${parseInt(nonce)}`);

        await this.pushLog(`地址: ${address}, 开始合约交互......`);
        
        let detail = this.getTxDetail(nonce);
        let multiCall = this.account.execute([approveCall, swapCall], null, detail);

        let txHash = ""
        await multiCall.then(res => {
          console.log(res);
          txHash = res.transaction_hash;
          this.pushLog(`地址: ${address}, my Swap 交互成功; 交易hash:${res.transaction_hash}`);
        }).catch(err => {
          console.log(err);
          this.pushLog(`地址: ${address}, my Swap 交互失败; 错误信息: ${err}`);
        })
        console.log(txHash);
        return txHash;
      },

      /**
       * sith Swap
       * @param {*} secret 
       * @param {*} address 
       * @param {*} amount 
       * @param {*} swapCoin2Eth 
       */
      async sithSwap(secret, address, amount, swapCoin2Eth) {
        this.account = new Account(this.provider, address, secret, '1');
        let interactType = swapCoin2Eth ? 'USDC -> ETH' : 'ETH -> USDC';

        await this.pushLog(`地址: ${address}, 正在进行sith Swap交互; 交互方式: ${interactType}; 交互金额: ${amount}`);

        await this.pushLog(`地址: ${address}, 开始构建Call`);
        let approveCall = await this.getApproveCall(this.starkJson.sithSwap.address, address, swapCoin2Eth, amount);
        let swapCall = await this.getSwapCall(this.starkJson.sithSwap.address, address, swapCoin2Eth, amount);
        await this.pushLog(`地址: ${address}, 构建call完成`);

        console.log(approveCall)
        console.log(swapCall)

        let nonce = await this.account.getNonce();
        await this.pushLog(`地址: ${address}, 获取到Nonce:${parseInt(nonce)}`);

        await this.pushLog(`地址: ${address}, 开始合约交互......`);
        let detail = this.getTxDetail(nonce);
        let multiCall = this.account.execute([approveCall, swapCall], null, detail);

        let txHash = ""
        await multiCall.then(res => {
          console.log(res);
          txHash = res.transaction_hash;
          this.pushLog(`地址: ${address}, sith Swap 交互成功; 交易hash:${res.transaction_hash}`);
        }).catch(err => {
          this.pushLog(`地址: ${address}, sith Swap 交互失败; 错误信息: ${err}`);
        })
        console.log(txHash);
        return txHash;
      },

      /**
       * avnu Swap
       * @param {*} secret 
       * @param {*} address 
       * @param {*} amount 
       * @param {*} swapCoin2Eth 
       */
       async avnuSwap(secret, address, amount, swapCoin2Eth) {
        this.account = new Account(this.provider, address, secret, '1');
        let interactType = swapCoin2Eth ? 'USDC -> ETH' : 'ETH -> USDC';

        await this.pushLog(`地址: ${address}, 正在进行avnu Swap交互; 交互方式: ${interactType}; 交互金额: ${amount}`);

        await this.pushLog(`地址: ${address}, 开始构建Call`);
        let approveCall = await this.getApproveCall(this.starkJson.avnuSwap.address, address, swapCoin2Eth, amount);
        let swapCall = await this.getSwapCall(this.starkJson.avnuSwap.address, address, swapCoin2Eth, amount);
        await this.pushLog(`地址: ${address}, 构建call完成`);

        console.log(approveCall)
        console.log(swapCall)

        let nonce = await this.account.getNonce();
        await this.pushLog(`地址: ${address}, 获取到Nonce: ${parseInt(nonce)}`);

        await this.pushLog(`地址: ${address}, 开始合约交互......`);
        let detail = this.getTxDetail(nonce);
        let multiCall = this.account.execute([approveCall, swapCall], null, detail);

        let txHash = ""
        await multiCall.then(res => {
          console.log(txHash);
          txHash = res.transaction_hash;
          this.pushLog(`地址: ${address}, avnu Swap 交互成功; 交易hash:${res.transaction_hash}`);
        }).catch(err => {
          this.pushLog(`地址: ${address}, avnu Swap 交互失败; 错误信息: ${err}`);
        })
        console.log(txHash);
        return txHash;
      },

      /**
       * 获取输出数量
       * @param {*} amount 
       * @param {*} swapCoin2Eth 
       * @param {*} withSlippage 
       */
      async getAmountOut(amount, swapCoin2Eth, withSlippage) {
        let tokenArr = swapCoin2Eth ? 
          [cairo.felt(this.starkJson.usdcToken.address),cairo.felt(this.starkJson.ethToken.address)] :
          [cairo.felt(this.starkJson.ethToken.address),cairo.felt(this.starkJson.usdcToken.address)];

        const call = {
          contractAddress: this.starkJson.jedi.address,
            entrypoint: "get_amounts_out",
            calldata: CallData.compile({
              amountIn: cairo.uint256(amount),
              path: tokenArr,
            }),
        }
        try {
          const res = await this.provider.callContract(call, null);
          let amountOut = res.result[3];
          amountOut = withSlippage ? BigInt(amountOut) * 990n / 1000n : BigInt(amountOut);

          console.log("最小获得金额" + amountOut);
          return amountOut;
        } catch(err) {
          console.log(err);
          DateUtils.sleep(3000)
          await this.getAmountOut(amount, swapCoin2Eth, withSlippage);
        }
      },

      /**
       * 构造approve Call
       * @param {*} spender 
       * @param {*} address 
       * @param {*} swapCoin2Eth 
       * @param {*} amount 
       */
      async getApproveCall(spender, address, swapCoin2Eth, amount) {

        let amountIn = swapCoin2Eth ?
        await this.getUsdcBalance(address) :
        BigInt(Math.floor(amount * Math.pow(10, 18)));

        let tokenAddr = swapCoin2Eth ? this.starkJson.usdcToken.address : this.starkJson.ethToken.address;

        return {
                contractAddress: tokenAddr,
                entrypoint: "approve",
                calldata: CallData.compile({
                  spender: spender,
                  amount: cairo.uint256(amountIn),
                }),
              };
      },

      /**
       * 获取call参数
       * @param {*} contractAddr 
       * @param {*} address 
       * @param {*} swapCoin2Eth 
       * @param {*} amount 
       */
      async getSwapCall(contractAddr, address, swapCoin2Eth, amount) {
        let bigAmount = Math.floor(amount * Math.pow(10, 18));
        console.log("decimal金额:" + bigAmount)
        let balance = await this.getUsdcBalance(address);
        
        let outMin = swapCoin2Eth ? 
        await this.getAmountOut(balance, swapCoin2Eth, true): 
        await this.getAmountOut(bigAmount, swapCoin2Eth, true);

        let amountIn = swapCoin2Eth ?
        balance :
        bigAmount;

        console.log("amountIn:" + amountIn)

        let call = {
          contractAddress: contractAddr,
          entrypoint: this.selector[contractAddr],
          calldata: null
        }
        
        if (this.mySwapAddr === contractAddr) {
          // mySwap
          let tokenAddr = swapCoin2Eth ? this.starkJson.usdcToken.address : this.starkJson.ethToken.address;
          call.calldata = CallData.compile({
            pool_id: cairo.felt("1"),
            token_from_addr: cairo.felt(tokenAddr),
            amount_from: cairo.uint256(amountIn),
            amount_to_min: cairo.uint256(outMin),
          });
        } else if (this.sithSwapAddr === contractAddr) {
          // sith Swap
          let fromAddr = swapCoin2Eth ? this.starkJson.usdcToken.address : this.starkJson.ethToken.address;
          let toAddr = swapCoin2Eth ? this.starkJson.ethToken.address : this.starkJson.usdcToken.address;

          let routes = [
            {
              from_address: cairo.felt(fromAddr), 
              to_address: cairo.felt(toAddr), 
              stable: cairo.felt("0")
            }
          ]
          
          const timestamp =  Math.floor((Date.now() + 3600000) / 1000);
          call.calldata = CallData.compile({
            amount_in: cairo.uint256(amountIn),
            amount_out_min: cairo.uint256(outMin),
            routes: routes,
            to: address,
            deadline: cairo.felt(timestamp),
          });

        } else if (this.avnuSwapAddr === contractAddr) {
          // avnu swap
          
          let fromAddr = swapCoin2Eth ? this.starkJson.usdcToken.address : this.starkJson.ethToken.address;
          let toAddr = swapCoin2Eth ? this.starkJson.ethToken.address : this.starkJson.usdcToken.address;

          let routes = [
            {
              token_from: cairo.felt(fromAddr), 
              token_to: cairo.felt(toAddr), 
              exchange_address: cairo.felt("0x041fd22b238fa21cfcf5dd45a8548974d8263b3a531a60388411c5e230f97023"), // jedi的合约
              percent: cairo.felt("0x64")
            }
          ];

          let tokenToAmount = swapCoin2Eth ? 
            await this.getAmountOut(await this.getUsdcBalance(address), swapCoin2Eth, false) :
            await this.getAmountOut(bigAmount, swapCoin2Eth, false);

          call.calldata = CallData.compile({
            token_from_address: cairo.felt(fromAddr),
            token_from_amount: cairo.uint256(amountIn),
            token_to_address: cairo.felt(toAddr),
            token_to_amount: cairo.uint256(tokenToAmount),
            token_to_min_amount: cairo.uint256(outMin),
            beneficiary: address,
            integrator_fee_amount_bps: cairo.felt('0'),
            integrator_fee_recipient: cairo.felt('0'),
            routes: routes,
          });
        } else {
          // l0K   jedi
          let tokenArr = swapCoin2Eth ? 
          [cairo.felt(this.starkJson.usdcToken.address),cairo.felt(this.starkJson.ethToken.address)] :
          [cairo.felt(this.starkJson.ethToken.address),cairo.felt(this.starkJson.usdcToken.address)];

          const timestamp =  Math.floor(Date.now() + 172800000 / 1000);

          call.calldata = CallData.compile({
            amountIn: cairo.uint256(amountIn),
            amountOutMin: cairo.uint256(outMin),
            path: tokenArr,
            to: address,
            deadline: cairo.felt(timestamp),
          });
        }
        return call;
      },

      /**
       * 部署新账户
       * @param {*} secret 
       * @param {*} address 
       */
      async deployAccount(secret, address) {
        this.account = new Account(this.provider, address, secret);
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

      async getUsdcBalance(address) {
        let usdcContract = new Contract(this.starkJson.usdcToken.abi, this.starkJson.usdcToken.address, this.provider)
        let call = await usdcContract.balanceOf(address);
        return call.balance;
      },

      /**
       * 获取USDC单价
       */
      async getCoinPrice() {

        const tenKContract = new Contract(this.starkJson.l0KEthUsdc.abi, this.starkJson.l0KEthUsdc.address, this.provider);
        let price = null;
        await tenKContract.getReserves().then(res => {
          // 1USDC = 多少eth
          price = ((res.reserve0  * 1000000n / res.reserve1) * 987n) / 1000n
   
        })
        console.log("单价:" + price);
        return price;
      },

      async getCoinPriceV2() {

        const tenKContract = new Contract(this.starkJson.l0KEthUsdc.abi, this.starkJson.l0KEthUsdc.address, this.provider);
        let price = null;
        let isFailed = false;
        do {
          await tenKContract.getReserves().then(res => {
            // 1 单位USDC = 多少eth
            price = res.reserve0 / res.reserve1;
            isFailed = false;
          }).catch(err => {
            console.log(err);
            isFailed = true;
          });
        } while(isFailed);
        
        console.log("1单位USDC单价:" + price);
        return price;
      },

    },
    mounted() {
    },

}
</script>

