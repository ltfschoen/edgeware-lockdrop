const fs = require('fs');
const jswallet = require("ethereumjs-wallet");
const Promise = require('bluebird');

const ETH_JSON_PASSWORD = process.env.ETH_JSON_PASSWORD;
const ETH_JSON_VERSION = process.env.ETH_JSON_VERSION;

const advanceTimeAndBlock = async (time) => {
    await advanceTime(time);
    await advanceBlock();

    return getCurrentBlock();
};

const advanceTime = (time, web3) => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [time],
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err); }
            else {
              if (!err) {
                web3.currentProvider.send({
                  jsonrpc: '2.0', 
                  method: 'evm_mine', 
                  params: [], 
                  id: new Date().getSeconds()
                }, (e, res) => {
                  if (e) reject(e);
                  else resolve(res);
                });
              }
            }
        });
    });
};

const advanceBlock = (web3) => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err); }
            web3.eth.getBlock('latest', function (err, res) {
              if (err) reject(err);
              resolve(res.hash);
            });
        });
    });
};

function getCurrentBlock(web3) {
  return new Promise((resolve, reject) => {
    web3.eth.getBlock('latest', function (err, res) {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

async function getCurrentTimestamp(web3) {
  const block = await getCurrentBlock(web3);
  return block.timestamp;
}


const getBalance = (account, web3) => {
  return new Promise((resolve, reject) => {
    web3.eth.getBalance(account, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
};

const getPrivateKeyFromEnvVar = () => {
  return (process.env.ETH_PRIVATE_KEY.indexOf('0x') === -1)
  ? process.env.ETH_PRIVATE_KEY
  : process.env.ETH_PRIVATE_KEY.slice(2);
};

const getPrivateKeyFromEncryptedJson = () => {
  if (ETH_JSON_VERSION) {
    if (!ETH_JSON_PASSWORD) {
      throw new Error('Please add the password to decrypt your encrypted JSON keystore file to a .env file in the project directory');
    }
    const json = JSON.parse(fs.readFileSync('keystore.json', 'utf8'));
    let wallet;
    if (ETH_JSON_VERSION.toLowerCase() === 'ethsale') {
      wallet = jswallet.fromEthSale(json, ETH_JSON_PASSWORD);
    } else if (ETH_JSON_VERSION.toLowerCase() === 'v1') {
      wallet = jswallet.fromV1(json, ETH_JSON_PASSWORD);
    } else if (ETH_JSON_VERSION.toLowerCase() === 'v3') {
      wallet = jswallet.fromV3(json, ETH_JSON_PASSWORD);
    } else {
      throw new Error('Please add a valid encrypted JSON keystore file version under key ETH_JSON_VERSION to a .env file in the project directory');
    }

    // Warning: Only use console.log in the example
    // console.log("Private key " + wallet.getPrivateKey().toString("hex"));
    return wallet.getPrivateKey().toString("hex");
  }
}

const getTxReceipt = async (txHash, web3) => {
  return await web3.eth.getTransactionReceipt(txHash);
}

async function assertRevert(promise, invariants = () => {}) {
  try {
    await promise;
    assert.fail('Expected revert not received');
  } catch (error) {
    const revertFound = error.message.search('revert') >= 0 || error.message.search('invalid opcode');
    assert(revertFound, `Expected 'revert', got ${error} instead`);
    invariants.call()
  }
}

module.exports = {
  advanceTimeAndBlock,
  advanceTime,
  advanceBlock,
  assertRevert,
  getBalance,
  getCurrentBlock,
  getCurrentTimestamp,
  getPrivateKeyFromEnvVar,
  getPrivateKeyFromEncryptedJson,
  getTxReceipt,
};
