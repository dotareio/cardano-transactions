<h4 align="center">An open source library for developers to utilize CIP-30 & dcSpark's browser serialization to create reusable transactions on the Cardano Blockchain.</h4>
<p align="center"><a href="https://blockfrost.io/"><img src="https://github.com/dotareio/public/blob/main/blockfrost.svg" width="110"></a><img src="https://img.shields.io/badge/Preview-Up-brightgreen"> <img src="https://img.shields.io/badge/Pre--Production-Up-brightgreen"> <img src="https://img.shields.io/badge/Mainnet-Up-brightgreen">
</p>

##### Table of Contents
[Setup](#setup)<br/>
[How to use](#howtouse)<br/>
[How to contribute](#howtoadd)<br/>
[Transaction List](#txlist)

---
<a name="setup"/><h4>Setup</h4></a>
###### install package
```cmd
npm i @dotare/cardano-transactions
```
###### enable asyncWebAssembly 
```js
// webpack.config.js
experiments: {
    asyncWebAssembly: true,
},
```
*if you don't have access to `webpack.config` due to the framework library:*

###### how to load wasm into create-react-app:
https://stackoverflow.com/a/61722010

###### how to load wasm into Laravel with mix:
https://laravel-mix.com/docs/6.0/quick-webpack-configuration

---
<a name="howtouse"/><h4>How to use</h4></a>
###### import & invoke transaction
```jsx
// app.jsx
import { delegationTx } from "@dotare/cardano-transactions"

<button onClick={() => { delegationTx('5653f2a1aea5318f43a63e0148076348a475d3c89283a8c1eb498fb7', 'eternl', 0) }}>eternl</button>
```
##### Every transaction may have it's own unique parameters to customize the user experience as well as selecting the on-chain network and light wallet.
*Be sure to look at the parameters in the [Transaction List](#txlist)*

---
<a name="howtoadd"><h4>How to contribute</h4><a>
###### *Pull Requests:* 
###### - Add new transactions to the repo in the `./src/transactions/` directory.
###### - Add new utility to the repo in the `./src/utils/` directory.
###### - Update our ```README``` with your transaction and link to the dependent library if you did not add it to `./src/transactions/`.


---
<a name="txlist"><h4>Transaction List</h4></a>
|Tx Name | Params | Description | Source Code | Author | Includes TxFee | Fee |
| --- | --- | --- | --- | --- | --- | --- |
|delegationTx | Pool ID (hex):<br/> string,<br/> WalletName: string,<br/> NetworkId: int | A delegation method | https://github.com/dotareio/cardano-delegation/blob/main/src/delegation.ts<br/> a modified version using this package's helper methods is under ./src/transactions/ | DoubleThirty | No | 0% |
|mintFreeTokenTx | AssetName: string, <br/> Amount: uint,  WalletName: string,<br/> NetworkId: int | An always true minting method | [./src/transactions/mintFreeTokenTx.ts](./src/transactions/mintFreeTokenTx.ts) <br /> Do not make tokens you are serious about with this policy anyone can make the same assetname token.| DoubleThirty | No | 0% |

---
**Ways to support:**

*Post Issues:*
https://github.com/dotareio/cardano-transactions/issues/new/choose
*Templates:* Question, Bug, Feature Request, Security Vuln

*Delegate:*
https://www.dotare.io/stake-pool/

<a href="https://wenlobster.io/"><img src="https://github.com/dotareio/public/blob/main/asset19skal0agalysqpgfx63gswkpzc3hs24h9g9pg0.png" width="50" alt="Royal Pool"></a> <a href="https://ccccoin.io/"><img src="https://github.com/dotareio/public/blob/main/asset1fy52surzfc4ezrxaynfqqrnk4uz3cha25vcelt.png" width="50" alt="CCCC Pool"></a> <a href="https://teddyswap.org/"><img src="https://teddyswap.org/assets/img/services/farming.png" width="50" alt="Teddy FISO Pool"></a>

---
**References:**

*Powered By:* <a href="https://www.dcspark.io/"><img src="https://github.com/dotareio/public/blob/main/dcspark.svg" width="100"></a> & <a href="https://blockfrost.io/"><img src="https://github.com/dotareio/public/blob/main/blockfrost.svg" width="110"></a>
