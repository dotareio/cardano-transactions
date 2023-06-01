
import { Cardano } from "@dotare/cardano-delegation";
import { Buffer } from "buffer";
import { newTxBuild, connectWallet, signTx, getLatestBlock, getFeeParams, getExUnitEval } from "../utils";

/**
 * example of a mintFreeToken transaction using dcspark serialization with some helper methods under the hood.
 * PolicyID is from Plutus Pioneer Program Iteration 4 Week 5
 * 
 * @param assetName 
 * @param amount 
 * @param walletName
 * @param networkId 
 * @returns 
 */
export async function mintFreeTokenTx(assetName: string, amount: number, walletName: string, networkId: number = 1) {
  const CardanoWasm = await Cardano(); // load the serialization lib
  try {
    const txBuilder = await newTxBuild(networkId, CardanoWasm); // add protocal params

    const Wallet = await connectWallet(walletName); // connect to browser wallet
    const usedAddresses: string[] = await Wallet.getUsedAddresses();
    const paymentAddress = CardanoWasm.BaseAddress.from_address(
      CardanoWasm.Address.from_bytes(Buffer.from(usedAddresses[0], "hex"))
    )
      .to_address()
      .to_bech32();
    const utxos = await Wallet.getUtxos()
    let utxoCollateral;

    utxos.forEach(utx => {
      const utxo = CardanoWasm.TransactionUnspentOutput.from_bytes(Buffer.from(utx, 'hex'))
      const lovelace = utxo.output().to_js_value().amount.coin
      if (3000000 <= lovelace && lovelace <= 6000000) utxoCollateral = utxo; 
      txBuilder.add_utxo(
        CardanoWasm.SingleInputBuilder.new(
          utxo.input(), utxo.output()
        ).payment_key()
      )
    });

    const collaterals = await Wallet.experimental?.getCollateral();
    const collateral = collaterals?.length >= 1 ? 
      CardanoWasm.TransactionUnspentOutput.from_bytes(Buffer.from(collaterals[0], "hex"))
      : utxoCollateral;
    if (!collateral) throw new Error(`No collateral set. Please set collateral in your ${walletName} wallet.`);
    
    txBuilder.add_collateral(
      CardanoWasm.SingleInputBuilder.new(
        collateral.input(), collateral.output()
      ).payment_key()
    )

    const plutusScriptWitness = CardanoWasm.PlutusScriptWitness.from_script(
      CardanoWasm.PlutusScript.from_v2(
        CardanoWasm.PlutusV2Script.from_bytes(
          Buffer.from("5830582e010000323222320053333573466e1cd55ce9baa0024800080148c98c8014cd5ce249035054310000500349848005", 'hex')
        )
      )
    )

    txBuilder.add_mint(
      CardanoWasm.SingleMintBuilder.new(
        CardanoWasm.MintAssets.new_from_entry(
          CardanoWasm.AssetName.new(Buffer.from(assetName)),
          CardanoWasm.Int.new(CardanoWasm.BigNum.from_str(amount.toString()))
        )
      )
        .plutus_script(
          CardanoWasm.PartialPlutusWitness.new(
            plutusScriptWitness,
            CardanoWasm.PlutusData.new_constr_plutus_data(
              CardanoWasm.ConstrPlutusData.new(
                CardanoWasm.BigNum.zero(),
                CardanoWasm.PlutusList.new()
              )
            )
          ),
          CardanoWasm.Ed25519KeyHashes.new()
        )
    )
    
    const latestSlot = await getLatestBlock(networkId).then((x) => x.slot);
    txBuilder.set_ttl(CardanoWasm.BigNum.from_str((latestSlot + 500).toString()
    ));
    
    const {
      cost_models
    } = await getFeeParams(networkId);
    
    const JsonCostModel = {
      language: "PlutusV2",
      op_costs: Object.values(cost_models.PlutusV2).map(e => e.toString())
    }
    const costModel = CardanoWasm.CostModel.from_json(JSON.stringify(JsonCostModel));
    const Costmdls = CardanoWasm.Costmdls.new()
    Costmdls.insert(costModel)
    
    txBuilder.select_utxos();
    const redeemerTxBuilder = txBuilder.build_for_evaluation(0, CardanoWasm.Address.from_bech32(paymentAddress))
    const draftTx = redeemerTxBuilder.draft_tx();
    
    const evalResults = await getExUnitEval(draftTx, networkId)
    const evalExUnits = evalResults.result.EvaluationResult['mint:0']
    const exUnits = CardanoWasm.ExUnits.new(
      CardanoWasm.BigNum.from_str(evalExUnits.memory.toString()),
      CardanoWasm.BigNum.from_str(evalExUnits.steps.toString())
    )

    redeemerTxBuilder.set_exunits(
      CardanoWasm.RedeemerWitnessKey.new(
        CardanoWasm.RedeemerTag.new_mint(),
        CardanoWasm.BigNum.zero()
      ),
      exUnits
    )
    const Redeemers = redeemerTxBuilder.build()

    const Languages = CardanoWasm.Languages.new()

    Languages.add(CardanoWasm.Language.new_plutus_v2())

    const scriptDataHash = CardanoWasm.hash_script_data(
      Redeemers,
      Costmdls,
      undefined
    )

    const signedTxBuilder = txBuilder.build(0, CardanoWasm.Address.from_bech32(paymentAddress));
    const draftTxBody = draftTx.body();

    draftTxBody.set_script_data_hash(scriptDataHash);

    const witnessSet = signedTxBuilder.witness_set()
    witnessSet.add_redeemers(
      Redeemers
    )

    const builtwitnessset = witnessSet.build()
    const transaction = CardanoWasm.Transaction.new(
      draftTxBody,
      builtwitnessset
    );

    const witness = await Wallet.signTx(
      Buffer.from(transaction.to_bytes(), "hex").toString("hex"),
      false
    );

    const signedTx = CardanoWasm.Transaction.new(
      transaction.body(),
      CardanoWasm.TransactionWitnessSet.from_bytes(Buffer.from(witness, "hex")),
      undefined
    );

    const scripts = CardanoWasm.PlutusV2Scripts.new()
    scripts.add(
      CardanoWasm.PlutusV2Script.from_bytes(
        Buffer.from("5830582e010000323222320053333573466e1cd55ce9baa0024800080148c98c8014cd5ce249035054310000500349848005", 'hex')
      )
    )
    const signedWitnessSet = signedTx.witness_set()
    signedWitnessSet.set_redeemers(Redeemers);
    signedWitnessSet.set_plutus_v2_scripts(
      scripts
    );

    const signedTxFinal = CardanoWasm.Transaction.new(
      signedTx.body(),
      signedWitnessSet
    )

    const txHash = await Wallet.submitTx(
      Buffer.from(signedTxFinal.to_bytes()).toString("hex")
    );

    console.log(txHash);
    if (window.confirm(`Your Transaction Hash is: ${txHash}. \nIf you click "OK" a new tab will open to CardanoScan to see your transaction. (It may take several minutes to populate.) \nCancel will stay at website.`)) {
      const prefix = networkId === 1 ? "" : networkId === 0 ? "preview." : "preprod.";
      var newTab = window.open(`https://${prefix}cardanoscan.io/transaction/${txHash}`, '_blank');
      newTab.location.href = `https://${prefix}cardanoscan.io/transaction/${txHash}`;
    };
    return ([txHash, paymentAddress]);
  } catch (error) {
    switch (error.message) {
      case "Cannot read properties of null (reading 'location')":
        alert('New tab was blocked from opening, look for pop-up blocked notification to see link.');
        break;
      default:
        if (!error.name) alert(`could not mint due to: ${error.info}`)
        else {
          alert(`could not mint due to: ${error}`)
        }
    }
  }
};