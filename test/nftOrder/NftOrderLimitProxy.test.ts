/* eslint-disable node/no-missing-import */
// eslint-disable-next-line strict
import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { solidity } from 'ethereum-waffle';
// eslint-disable-next-line node/no-missing-import
import { help } from '../../scripts/help';

import { App, HowToCall, KeepNetWork } from '../app';

import {
  EvaSafes,
  // eslint-disable-next-line node/no-missing-import
} from '../../typechain/index';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, BigNumberish } from 'ethers';

chai.use(solidity);

type OrderInfo = {
  owner: string;
  assetToken: string;
  amount: BigNumberish;
  price: BigNumberish;
  expireTime: BigNumberish;
  tokenId: BigNumberish;
  salt: BigNumberish;
};

describe('NFT Limit Order', function () {
  let signers: SignerWithAddress[];
  let me: SignerWithAddress;
  let meSafes: EvaSafes;
  let app: App;

  before(async function () {
    signers = await ethers.getSigners();
    me = signers[0];

    const ownerO = await ethers.getSigners();
    console.log(`deployer owner 2: ${ownerO[0].address}`);
    app = new App();
    await app.deploy();

    // 初始化钱包
    meSafes = (await app.createOrLoadWalletSeafes(me.address)).connect(me);
  });

  describe('create order by walletSafes', function () {
    const amount = 10000;
    const bob = '0x00F113faB82626dca0eE04b126629B4577F3d5E2';
    const order: OrderInfo = {
      owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      assetToken: '0xed5af388653567af2f388e6224dc7c4b3241c544',
      amount: 1,
      price: 1,
      expireTime: Math.ceil(new Date().getTime() / 1000) + 60 * 60 * 24,
      tokenId: 5964,
      salt: 1649944095,
    };
    let orderId: string;
    let flowId: number;

    let keeper: SignerWithAddress;

    before(async function () {
      keeper = signers[4];

      // create order
      const gasFund = 1e18;
      const callData = await help.encodeFunctionData('NftLimitOrderFlowProxy', 'create', [
        app.controler.address,
        app.nftLimitOrderFlowProxy.address,
        1,
        200000,
        order,
      ]);
      flowId = (await app.controler.getFlowMetaSize()).toNumber();

      const _value = ethers.BigNumber.from(order.amount).mul(ethers.BigNumber.from(order.price));
      meSafes.proxy(app.nftLimitOrderFlowProxy.address, HowToCall.Delegate, callData, {
        value: help.toFullNum(gasFund + _value.toNumber()),
      });

      orderId = await app.nftLimitOrderFlowProxy.hashOrder(order);

      // set keeper
      await app.config.addKeeper(keeper.address, KeepNetWork.Evabase);
    });

    it('should be execute ok when check pass', async function () {
      const orderFlowInfo = await app.controler.getFlowMetas(flowId);
      await app.config.addKeeper(app.evaBaseServerBot.address, KeepNetWork.Evabase);
      const _price = '100000000000000000';
      const _openseaPrice = BigNumber.from('90000000000000000');
      const flows = [1];
      // const order: OrderInfo = {
      //   owner: '0x389F62E4d0AbfA2D23a55cE4dfE9FcAB9277D0ee',
      //   assetToken: '0x9af3444aacb49006a19ecdd70da21490cf5ca394',
      //   amount: '1',
      //   price: _price,
      //   expireTime: 1652605145,
      //   tokenId: 1,
      //   salt: 1651741145,
      // };
      // 1. byteOpenseas[i] = abi.encode(address target, bytes  input, uint256 value)
      const opeaseaAddress = '0xdd54d660178b28f6033a953b0e55073cfa7e3744';
      const opeasea =
        // eslint-disable-next-line max-len
        '0xab834bab000000000000000000000000dd54d660178b28f6033a953b0e55073cfa7e37440000000000000000000000005457377bcfd8b8a441017ee19076b72abd3f5eca000000000000000000000000e4633285c38571878fe2155046505e45a6deaedb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000045b594792a5cdc008d0de1c1d69faa3d16b3ddc100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000dd54d660178b28f6033a953b0e55073cfa7e3744000000000000000000000000e4633285c38571878fe2155046505e45a6deaedb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000005b3256965e7c3cf26e11fcaf296dfc8807c0107300000000000000000000000045b594792a5cdc008d0de1c1d69faa3d16b3ddc10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000fa000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000013fbe85edc900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006273991d000000000000000000000000000000000000000000000000000000000000000027d790f3c18b02b6531b24f29ec95fde8c0fce3c980e6299c269c4226368e05000000000000000000000000000000000000000000000000000000000000000fa000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000013fbe85edc90000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000625ffee1000000000000000000000000000000000000000000000000000000006325c012ccef1be4e8e51bbbed9004fbc1ae940cd421dc6054b06d822d612bb1c95ed9a20000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000006a000000000000000000000000000000000000000000000000000000000000007c000000000000000000000000000000000000000000000000000000000000008e00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000b200000000000000000000000000000000000000000000000000000000000000b20000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000001c5ce9487629096f3cd7cfd1a4de7604364c6ac169163dd33f7285edbafefe54ad6fda1e2201aeae805dc2d018683cbfef8265ebfa7f5cc7834679aa88776bac1a5ce9487629096f3cd7cfd1a4de7604364c6ac169163dd33f7285edbafefe54ad6fda1e2201aeae805dc2d018683cbfef8265ebfa7f5cc7834679aa88776bac1a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e4fb16a5950000000000000000000000000000000000000000000000000000000000000000000000000000000000000000389f62e4d0abfa2d23a55ce4dfe9fcab9277d0ee0000000000000000000000009af3444aacb49006a19ecdd70da21490cf5ca3940000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e4fb16a595000000000000000000000000e4633285c38571878fe2155046505e45a6deaedb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000009af3444aacb49006a19ecdd70da21490cf5ca3940000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e400000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e4000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
      const myOpenseaData = ethers.utils.AbiCoder.prototype.encode(
        ['address', 'bytes', 'uint256'],
        [opeaseaAddress, opeasea, _openseaPrice],
      );

      console.log(`p1 : ${myOpenseaData}`);

      // p2 byteOne =abi.encode(Order order, bytes signature, bytes[] byteOpenseas)
      const signature =
        // eslint-disable-next-line max-len
        '0x41d3984ca7c677b431c8a59b3cedd5d86b18577596e115f94dd3540a82b8c31144882546c928f813457753ea43a9f3f1daf9c26ddfb5f9f836328d2e2f2b63981c';
      // const arr = [myOpenseaData];
      const arr = [myOpenseaData];
      const p2 = ethers.utils.AbiCoder.prototype.encode(
        ['address', 'address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes', 'bytes[]'],
        [
          order.owner,
          order.assetToken,
          order.amount,
          order.price,
          order.expireTime,
          order.tokenId,
          order.salt,
          signature,
          arr,
        ],
      );
      console.log(`p2 : ${p2}`);

      // p3 byteArr[i]= abi.encode(bytes byteOne,uint value)value 为所需ETH总数量

      // const p3 = ethers.utils.AbiCoder.prototype.encode(['bytes', 'uint256'], [p2, _openseaPrice]);
      // const p3 = [p3Bfore];

      // console.log(`p3 : ${p3}`);

      // p4 performData=abi.encode(uint[] ids,bytes[] byteArr)

      const data = [p2];

      const p4 = ethers.utils.AbiCoder.prototype.encode(['uint256[]', 'bytes[]'], [flows, data]);
      console.log(`p4 : ${p4}`);
      // 注册
      const tx = await app.evaBaseServerBot.performUpkeep(p4);
      console.log('p5: ');
      await expect(tx).to.emit(app.controler, 'FlowExecuteFailed');
      // const callData = await help.encodeFunctionData('EvaBaseServerBot', 'performUpkeep', [p4]);
      // console.log('callData :', callData);

      // const tx = await app.controler.connect(keeper).execFlow(keeper.address, flowId, executeData);

      // await expect(tx).to.not.emit(app.controler, 'FlowExecuteFailed');
      // await expect(tx).to.emit(app.controler, 'FlowExecuteSuccess');
      // await expect(tx).to.emit(app.nftLimitOrderFlowProxy, 'OrderExecuted');
    });
  });
});
