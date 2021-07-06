// import
var axios      = require('axios');
var abiDecoder = require('abi-decoder');
var colors     = require("colors");
// consts
const {
    PANCAKE_ROUTER_V1_ABI,
    PANCAKE_ROUTER_V2_ABI,
    PANCAKE_ROUTER_V1_ADDRESS,
    PANCAKE_ROUTER_V2_ADDRESS,
    BLOCK_API_KEY,
    BSCAN_API_KEY
} = require('./config.js');

// In case you are using Node.js
const Web3 = require('web3');
// const provider = new Web3.providers.HttpProvider("https://bsc.getblock.io/testnet/?api_key=" + BLOCK_API_KEY);
const provider = new Web3.providers.WebsocketProvider("wss://bsc.getblock.io/mainnet/?api_key=" + BLOCK_API_KEY);
// Creating web3 instance with given provider
const web3 = new Web3(provider);
// Initializing web3.eth method
var scan_addliquidity = web3.eth.subscribe('newBlockHeaders');
scan_addliquidity.on("error", console.error);
scan_addliquidity.on("data", async function(blockHeader){
    // console.log(blockHeader);
    var block = await web3.eth.getBlock(blockHeader.hash);
    var transactions = block.transactions;
    // console.log(transactions);
    for (var tIndex = 0; tIndex < transactions.length; tIndex++){
        var transactionhash = transactions[tIndex];
        // console.log('tx Hash: ' + transactionhash);
        await getTokenLiquidity(transactionhash);
    }
});
// get add liquidity from transaction hash
async function getTokenLiquidity(transactionhash) {
    var transaction = await web3.eth.getTransaction(transactionhash);
    if (transaction.to == PANCAKE_ROUTER_V1_ADDRESS || transaction.to == PANCAKE_ROUTER_V2_ADDRESS){
        // console.log(transaction);
        let data = parseTx(transaction);
        let method = data[0];
        let params = data[1];
        // console.log(('Pancakeswap_' + (transaction.to == PANCAKE_ROUTER_V1_ADDRESS ? 'V1' : 'V2') + ': ' + method).gray);

        if (method == 'addLiquidity' || method == 'addLiquidityETH'){
            console.log('\nAdd Liquidity ===> '.green);
            console.log(params);
            console.log('\n');
        }
    }
}
// check if exist method in contract
async function hasMethod(contractAddress, methodSignature) {
    const code = await web3.eth.getCode(contractAddress);
    const hash = web3.eth.abi.encodeFunctionSignature(methodSignature);
    return code.indexOf(hash.slice(2, hash.length)) > 0;
}
// parse transaction
function parseTx(transaction) {
    var input = transaction['input'];
    var abi   = (transaction.to == PANCAKE_ROUTER_V1_ADDRESS) ? PANCAKE_ROUTER_V1_ABI : PANCAKE_ROUTER_V2_ABI;
    abiDecoder.addABI(abi);
    if (input == '0x')
        return ['0x', []]
    let decodedData = abiDecoder.decodeMethod(input);
    let method = decodedData['name'];
    let params = decodedData['params'];

    return [method, params]
}