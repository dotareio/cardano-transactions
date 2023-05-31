import { getFeeParams, getStakeActivity, getLatestBlock } from "@dotare/cardano-delegation";
import { Buffer } from "buffer";
import { WalletApi } from "../types/global";


/**
 * automatically adds the protocal params for the TransactionBuilder
 * 
 * @param network 
 * @returns TransactionBuilderConfigBuilder
 */
export async function newTxBuild(network: string | number, CardanoWasm: any) {
  const {
    min_fee_a, min_fee_b, key_deposit, pool_deposit, max_tx_size, max_val_size, price_mem, price_step, coins_per_utxo_word, collateral_percent, max_collateral_inputs, cost_models
  } = await getFeeParams(network);
  const JsonCostModel = {
    language: "PlutusV2",
    op_costs: Object.values(cost_models.PlutusV2).map(e => e.toString())
  }
  const costModel = CardanoWasm.CostModel.from_json(JSON.stringify(JsonCostModel));
  const costmdls = CardanoWasm.Costmdls.new()
  costmdls.insert(costModel)

  const txBuilderConfig = CardanoWasm.TransactionBuilderConfigBuilder.new()
    .coins_per_utxo_byte(CardanoWasm.BigNum.from_str(coins_per_utxo_word))
    .fee_algo(
      CardanoWasm.LinearFee.new(
        CardanoWasm.BigNum.from_str(min_fee_a.toString()),
        CardanoWasm.BigNum.from_str(min_fee_b.toString())
      )
    )
    .key_deposit(CardanoWasm.BigNum.from_str(key_deposit))
    .pool_deposit(CardanoWasm.BigNum.from_str(pool_deposit))
    .max_tx_size(Number(max_tx_size))
    .max_value_size(Number(max_val_size))
    .ex_unit_prices(CardanoWasm.ExUnitPrices.new(CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str((price_mem * 10000).toString()), CardanoWasm.BigNum.from_str('10000')), CardanoWasm.UnitInterval.new(CardanoWasm.BigNum.from_str((price_step * 10000000).toString()), CardanoWasm.BigNum.from_str('10000000'))))
    .prefer_pure_change(true)
    .collateral_percentage(Number(collateral_percent))
    .max_collateral_inputs(max_collateral_inputs)
    .costmdls(costmdls)
    .build();

  const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderConfig);
  return txBuilder;
}

/**
 * Connect to a cip-30 wallet via browser extension
 * 
 * @param walletName 
 * @returns WalletApi
 */
export async function connectWallet(walletName: string) {
  if (!window.cardano?.[walletName]) {
    throw new Error(
      "Unable to connect to selected Wallet please make sure that you have the Wallet's browser extension."
    );
  }
  const Wallet = await window.cardano[walletName].enable();
  if (await window.cardano[walletName].isEnabled()) return Wallet;
}


/**
 * Sign Tx using cip-30 wallet
 * 
 * @param txBuilder 
 * @param CardanoWasm 
 * @param address 
 * @param Wallet 
 * @returns 
 */
export async function signTx(txBuilder: any, CardanoWasm: any, address: any, Wallet: WalletApi) {
  const signedTxBuilder = txBuilder.build(0, CardanoWasm.Address.from_bech32(address));

  const transaction = CardanoWasm.Transaction.new(
    signedTxBuilder.body(),
    CardanoWasm.TransactionWitnessSet.new()
  );

  const witness = await Wallet.signTx(
    Buffer.from(transaction.to_bytes(), "hex").toString("hex"),
    false
  );

  const signedTx = CardanoWasm.Transaction.new(
    signedTxBuilder.body(),
    CardanoWasm.TransactionWitnessSet.from_bytes(Buffer.from(witness, "hex")),
    undefined
  );
  return signedTx;
}

export async function getExUnitEval(draftTx, network: string | number) {
  const ExunitEval = await fetch(`https://api.dotare.io/getExUnitEval/${network}`,
    {
      mode: "cors",
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: Buffer.from(draftTx.to_bytes()).toString("hex")
    }
  );
  console.log("exuniteval: ", Buffer.from(draftTx.to_bytes()).toString("hex"));
  
  return ExunitEval.json();
}


export { getFeeParams, getStakeActivity, getLatestBlock } 