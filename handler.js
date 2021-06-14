import {buildResponse, failure} from "./response-lib";
import Web3 from "web3";
import eggABI from "./abi/eggToken.json";
import kuyABI from "./abi/kuycoin.json";
import kubABI from "./abi/kkub.json";
import KuyFactoryABI from "./abi/KuyFactory.json";
import FoodCourtFactoryABI from "./abi/FoodCourtFactoryABI.json";
import erc20 from "./abi/erc20.json";
import {Interface} from "@ethersproject/abi";
import BigNumber from "bignumber.js";
import MultiCallAbi from "./abi/Multicall.json";
import {ContractAddresses} from "./configs/ContractAddresses";
import EthDater from "./configs/ethereum-block-by-date";


const fetch = require("node-fetch");
const web3 = new Web3(process.env.Provider);
const KUBAddress = "0x1faeCD43b3e82933E139eb4ceB2AF2d091B8B2aD";
const contract = new web3.eth.Contract(eggABI, process.env.KuyAddress);
const KuyCOIN = new web3.eth.Contract(kuyABI, process.env.KuyAddress);
const KKUB = new web3.eth.Contract(kubABI, KUBAddress);
const KuyFactory = new web3.eth.Contract(KuyFactoryABI, process.env.KuyFactory);
const FoodCourtFactory = new web3.eth.Contract(FoodCourtFactoryABI, "0xeC9c39E283a7956b3EE22816648824b9DF783283");
const multi = new web3.eth.Contract(MultiCallAbi, ContractAddresses.multiCall);
const dater  = new EthDater(web3);

async function multicall(abi, calls) {
    const itf = new Interface(abi)
    const callData = calls.map((call) => [call.address.toLowerCase(), itf.encodeFunctionData(call.name, call.params)])
    const {returnData} = await multi.methods.aggregate(callData).call()
    const res = returnData.map((call, i) => itf.decodeFunctionResult(calls[i].name, call))

    return res
}
async function getPriceCurrent(address) {
    return await this.getPriceWrapper(
        await this.getToken(address)
    );
}

async function getPriceByBlock(address, block) {
    return await this.getPriceWrapper(
        await this.getToken(address),
        block
    );
}

async function getPriceByDate(address, date) {
    const { block } = await this.dater.getDate(date);
    return await this.getPriceWrapper(
        await this.getToken(address),
        block
    );
}

async function getPriceTrend(address) {
    const token = await this.getToken(address);
    return Object.assign( {}, ...await Promise.all(
        Object.entries(await this.getTrendBlocks()).map(async i => {
            return { [i[0]]: await this.getPriceWrapper(token, i[1]) };
        })
    ));
}

async function getPriceWrapper(token, block = 'latest') {
    try {
        return await this.getPrice(token, block);
    } catch(e) {
        return false;
    }
}

async function getToken(address) {
    const token = { address: address };
    const tokenContract = new this.web3.eth.Contract(erc20, address);
    // token.exchange = await this.KuyFactory.methods.getExchange(address).call();
    token.decimals = await tokenContract.methods.decimals().call();
    return token;
}

async function getTrendBlocks() {
    if (Object.keys(this.trendBlocks).length == 0) await this.createTrendBlocks();
    return this.trendBlocks;
}

async function createTrendBlocks() {
    const dates = [
        { period: '1h', timestamp: new Date().setHours(new Date().getHours() - 1) },
        { period: '12h', timestamp: new Date().setHours(new Date().getHours() - 12) },
        { period: '1d', timestamp: new Date().setDate(new Date().getDate() - 1) },
        { period: '7d', timestamp: new Date().setDate(new Date().getDate() - 7) },
        { period: '1m', timestamp: new Date().setMonth(new Date().getMonth() - 1) },
        { period: '3m', timestamp: new Date().setMonth(new Date().getMonth() - 3) },
        { period: '6m', timestamp: new Date().setMonth(new Date().getMonth() - 6) }
    ];

    return await Promise.all(
        dates.map(async date => ({ block: this.trendBlocks[date.period] } = await this.dater.getDate(date.timestamp)))
    );
}

async function getPrice(token, block) {
    const tokenContract = new this.web3.eth.Contract(erc20, token.address);

    const calculations = {
        amount: BigNumber(1),
        full: BigNumber(1000),
        comission: BigNumber(997)
    };

    const reserveETH = BigNumber(
        await this.web3.eth.getBalance(token.exchange, block)
    ).shiftedBy(-18);

    const reserveToken = BigNumber(
        await tokenContract.methods.balanceOf(token.exchange).call(block)
    ).shiftedBy(
        BigNumber(token.decimals).negated().toNumber()
    );

    const sell = reserveToken.times(calculations.comission).div(
        reserveETH.times(calculations.full).plus(calculations.amount.times(calculations.comission))
    );

    const buy = reserveToken.times(calculations.full).div(
        reserveETH.minus(calculations.amount).times(calculations.comission)
    );

    return {
        sell: {
            eth: sell.toNumber(),
            token: calculations.amount.div(sell).toNumber()
        },
        buy: {
            eth: buy.toNumber(),
            token: calculations.amount.div(buy).toNumber()
        }
    };
}

export async function getTotalSupply() {
    try {
        const totalSupply = await contract.methods.totalSupply().call();
        const burnt = await contract.methods.balanceOf(process.env.BurnAddress).call();
        const circ = new BigNumber(totalSupply).minus(new BigNumber(burnt));
        return success(circ.shiftedBy(-18).toNumber().toString());
    } catch (e) {
        return failure(e);
    }
}

export async function getCirculatingSupply() {
    try {
        const totalSupply = await contract.methods.totalSupply().call();
        const burnt = await contract.methods.balanceOf(process.env.BurnAddress).call();
        const circ = new BigNumber(totalSupply).minus(new BigNumber(burnt));
        return success(circ.shiftedBy(-18).toNumber().toString());
    } catch (e) {
        return failure(e);
    }
}

export async function getKuyPrice() {
    try {
        var kubprice = "";
        fetch('https://api.bitkub.com/api/market/ticker?sym=THB_KUB')
        .then(response => response.json())
        .then(data => kubprice = data.THB_KUB.last);
        console.log(kubprice);
         //https://api.bitkub.com/api/market/ticker?sym=THB_KUB {"THB_KUB":{"id":92,"last":22.95,"lowestAsk":22.95,"highestBid":22.87,"percentChange":-3.37,"baseVolume":2077140.80915174,"quoteVolume":48221940.5,"isFrozen":0,"high24hr":23.98,"low24hr":22.61,"change":-0.8,"prevClose":22.95,"prevOpen":23.75}}
        const KuyLP = "0x414F20D35Ade4f8ead9eF26F2a982AFb6b4f3EE5";
        const kuy = new BigNumber(await KuyCOIN.methods.balanceOf(KuyLP).call()).shiftedBy(-9);
        const kub = new BigNumber(await KKUB.methods.balanceOf(KuyLP).call()).shiftedBy(-18);
        const kuyperkub = new BigNumber(new BigNumber(kuy).dividedBy(new BigNumber(kub))).shiftedBy(0);
        const kuyperbath = new BigNumber(kuyperkub).dividedBy(kubprice);
        const price = (1 / kuyperbath);
        return success(new BigNumber(price).toNumber().toString()); 
    } catch (e) {
        return failure(e);
    }
}
// module.exports.setGroupId = function(event, context, callback) {
//     const groupId = event.pathParameters.groupId;
export async function getPrice(event) {
    try {
        const _address = event.pathParameters._address;
        var kubprice = "";
        fetch('https://api.bitkub.com/api/market/ticker?sym=THB_KUB')
        .then(response => response.json())
        .then(data => kubprice = data.THB_KUB.last);
        console.log(kubprice);
         //https://api.bitkub.com/api/market/ticker?sym=THB_KUB {"THB_KUB":{"id":92,"last":22.95,"lowestAsk":22.95,"highestBid":22.87,"percentChange":-3.37,"baseVolume":2077140.80915174,"quoteVolume":48221940.5,"isFrozen":0,"high24hr":23.98,"low24hr":22.61,"change":-0.8,"prevClose":22.95,"prevOpen":23.75}}
        const getPair =  KuyFactory.methods.getPair(_address,KUBAddress).call();
        const lpAddress = getPair;
        const calls = [
            // Balance of token in the LP contract
            {
                address: _address,
                name: 'balanceOf',
                params: [lpAddress],
            },
            // Balance of quote token on LP contract
            {
                address: KUBAddress,
                name: 'balanceOf',
                params: [lpAddress],
            },
            // Total supply of LP tokens
            {
                address: lpAddress,
                name: 'totalSupply',
            },
            // Token decimals
            {
                address: _address,
                name: 'decimals',
            },
            // Quote token decimals
            {
                address: KUBAddress,
                name: 'decimals',
            },
            // token name 
            {
                address: _address,
                name: 'name',
            },
        ]

        const [
            tokenBalanceLP,
            KUBTokenBalanceLP,
            lpTotalSupply,
            tokenDecimals,
            quoteTokenDecimals,
            name
        ] = await multicall(erc20, calls)

         const TokenA = new BigNumber(tokenBalanceLP).shiftedBy(-tokenDecimals);
         const TokenB = new BigNumber(KUBTokenBalanceLP).shiftedBy(-quoteTokenDecimals);
         const TokenPerkub = new BigNumber(new BigNumber(TokenA).dividedBy(new BigNumber(TokenB))).shiftedBy(0);
         const kuyperbath = new BigNumber(TokenPerkub).dividedBy(kubprice);
         const price = (1 / kuyperbath);
        return success(price.toString()); 
    } catch (e) {
        return failure(e);
    }
}


export async function getPriceF00DCourt(event) {
    try {
        const _address = event.pathParameters._address;
        var kubprice = "";
        fetch('https://api.bitkub.com/api/market/ticker?sym=THB_KUB')
        .then(response => response.json())
        .then(data => kubprice = data.THB_KUB.last);
        console.log(kubprice);
         //https://api.bitkub.com/api/market/ticker?sym=THB_KUB {"THB_KUB":{"id":92,"last":22.95,"lowestAsk":22.95,"highestBid":22.87,"percentChange":-3.37,"baseVolume":2077140.80915174,"quoteVolume":48221940.5,"isFrozen":0,"high24hr":23.98,"low24hr":22.61,"change":-0.8,"prevClose":22.95,"prevOpen":23.75}}
        const getPair = await  FoodCourtFactory.methods.getPair(_address,"0xDa91a1aee4d7829c118cD6218CDA2cB2C56dd010").call();
        const lpAddress = getPair;
        const calls = [
            // Balance of token in the LP contract
            {
                address: _address,
                name: 'balanceOf',
                params: [lpAddress],
            },
            // Balance of quote token on LP contract
            {
                address: "0xDa91a1aee4d7829c118cD6218CDA2cB2C56dd010",
                name: 'balanceOf',
                params: [lpAddress],
            },
            // Total supply of LP tokens
            {
                address: lpAddress,
                name: 'totalSupply',
            },
            // Token decimals
            {
                address: _address,
                name: 'decimals',
            },
            // Quote token decimals
            {
                address: "0xDa91a1aee4d7829c118cD6218CDA2cB2C56dd010",
                name: 'decimals',
            },
            // token name 
            {
                address: _address,
                name: 'name',
            },
        ]

        const [
            tokenBalanceLP,
            KUBTokenBalanceLP,
            lpTotalSupply,
            tokenDecimals,
            quoteTokenDecimals,
            name
        ] = await multicall(erc20, calls)

         const TokenA = new BigNumber(tokenBalanceLP).shiftedBy(-tokenDecimals);
         const TokenB = new BigNumber(KUBTokenBalanceLP).shiftedBy(-quoteTokenDecimals);
         const TokenPerkub = new BigNumber(new BigNumber(TokenA).dividedBy(new BigNumber(TokenB))).shiftedBy(0);
         const tokenperbath = new BigNumber(TokenPerkub).dividedBy(kubprice);
         const price = (1 / tokenperbath);
        return success(price.toString()); 
    } catch (e) {
        return failure(e);
    }
}
export async function getAllPair() {
    try {
        var result = [];
        var allPairsLength = await KuyFactory.methods.allPairsLength().call();
        
        for (var i = 0; i < allPairsLength; i++) {
             result[i] =  await KuyFactory.methods.allPairs(i).call();
             const lpAddress = result[i];
             const calls = [
                // Balance of token in the LP contract
                {
                    address: _address,
                    name: 'balanceOf',
                    params: [lpAddress],
                },
                // Balance of quote token on LP contract
                {
                    address: KUBAddress,
                    name: 'balanceOf',
                    params: [lpAddress],
                },
                // Total supply of LP tokens
                {
                    address: lpAddress,
                    name: 'totalSupply',
                },
                // Token decimals
                {
                    address: _address,
                    name: 'decimals',
                },
                // Quote token decimals
                {
                    address: KUBAddress,
                    name: 'decimals',
                },
                // token name 
                {
                    address: _address,
                    name: 'name',
                },
            ]
    
            const [
                tokenBalanceLP,
                KUBTokenBalanceLP,
                lpTotalSupply,
                tokenDecimals,
                quoteTokenDecimals,
                name
            ] = await multicall(erc20, calls)
          }
          

        return success( result.toString()); 
    } catch (e) {
        return failure(e);
    }
}



function success(body){
    return buildResponse(200, body, {"Cache-Control": "max-age=500"});
}