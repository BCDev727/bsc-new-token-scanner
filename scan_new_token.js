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
var scan_newtoken = web3.eth.subscribe('newBlockHeaders');
scan_newtoken.on("error", console.error);
scan_newtoken.on("data", async function(blockHeader){
    // console.log(blockHeader);
    var block = await web3.eth.getBlock(blockHeader.hash);
    var transactions = block.transactions;
    // console.log(transactions);
    for (var tIndex = 0; tIndex < transactions.length; tIndex++){
        var transactionhash = transactions[tIndex];
        // console.log('tx Hash: ' + transactionhash);
        await getTokenDetail(transactionhash);
    }
});
// get token details from transaction hash
async function getTokenDetail(transactionhash) {
    var transaction = await web3.eth.getTransactionReceipt(transactionhash);
    var contractAddress = transaction.contractAddress;
    if (contractAddress != null){ // if contract creation transaction
        console.log(('Contract Address: ' + contractAddress).gray);
        // if (hasMethod(contractAddress, 'name()') && hasMethod(contractAddress, 'symbol()') && hasMethod(contractAddress, 'decimals()')){
            var reqUrl = 'https://api.bscscan.com/api?module=contract&action=getabi&address='+ contractAddress +'&apikey='+ BSCAN_API_KEY;
            var response = await axios.get(reqUrl);
            if (response.data.status == 1){
                var tokenABI = JSON.parse(response.data.result);
                var tokenCon = await new web3.eth.Contract(tokenABI, contractAddress);
                // if (await tokenCon.methods.name() != null && await tokenCon.methods.symbol() != null){
                if (tokenCon.methods.hasOwnProperty('name()') && tokenCon.methods.hasOwnProperty('symbol()')){
                    var name   = await tokenCon.methods.name().call();
                    var symbol = await tokenCon.methods.symbol().call();
                    console.log(('\nNew Token ===> Name: '+name+', Symbol: '+symbol+'\n').green);
                }
            }
        // }
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