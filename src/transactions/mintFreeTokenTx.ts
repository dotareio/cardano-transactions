import { Cardano } from "@dotare/cardano-delegation";
import { Buffer } from "buffer";
import { newTxBuild, connectWallet, signTx, getLatestBlock, getFeeParams } from "../utils";

/**
 * example of a delegation transaction using dcspark serialization with some helper methods under the hood
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

    const utxo = CardanoWasm.TransactionUnspentOutput.from_bytes(Buffer.from(utxos[0], 'hex'))

    txBuilder.add_input(
      CardanoWasm.SingleInputBuilder.new(
        utxo.input(), utxo.output()
      ).payment_key()
    )

    const plutusScriptWitness = CardanoWasm.PlutusScriptWitness.from_script(
      CardanoWasm.PlutusScript.from_v2(
        CardanoWasm.PlutusV2Script.from_bytes(
          Buffer.from("5830582e010000323222320053333573466e1cd55ce9baa0024800080148c98c8014cd5ce249035054310000500349848005", 'hex')
        )
      )
    )

    console.log(plutusScriptWitness.hash().to_hex())

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
                CardanoWasm.BigNum.zero(), CardanoWasm.PlutusList.new()
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
      price_mem,
      price_step
    } = await getFeeParams(networkId);

    const exUnits = CardanoWasm.ExUnits.new(
      CardanoWasm.BigNum.from_str((price_mem * 10000).toString()), 
      CardanoWasm.BigNum.from_str((price_step * 10000000).toString())
    )

    const TxRedeemerBuilder = txBuilder.build_for_evaluation(0, CardanoWasm.Address.from_bech32(paymentAddress))

    console.log(TxRedeemerBuilder);

    TxRedeemerBuilder.set_exunits(
      CardanoWasm.RedeemerWitnessKey.new(
        CardanoWasm.RedeemerTag.new_mint(),
        CardanoWasm.BigNum.zero()
      ),
      exUnits
    )

    const transaction = await TxRedeemerBuilder.draft_tx()

    const witness = await Wallet.signTx(
      Buffer.from(transaction.to_bytes(), "hex").toString("hex"),
      false
    );

    const transactionWitnessSet = CardanoWasm.TransactionWitnessSet.from_bytes(Buffer.from(witness, 'hex'))

    transactionWitnessSet.set_plutus_data(
      CardanoWasm.PlutusList.new()
    )

    const signedTx = CardanoWasm.Transaction.new(
      transaction.body(),
      transactionWitnessSet,
      undefined
    );

    const txHash = await Wallet.submitTx(
      Buffer.from(signedTx.to_bytes()).toString("hex")
    );

    console.log(txHash);

    if (window.confirm(`Your Transaction Hash is: ${txHash}. \nIf you click "OK" a new tab will open to CardanoScan to see your transaction. (It may take several minutes to populate.) \nCancel will stay at website.`)) {
      const prefix = networkId === 1 ? "" : networkId === 0 ? "preview." : "preprod.";
      var newTab = window.open(`https://${prefix}cardanoscan.io/transaction/${txHash}`, '_blank');
      newTab.location.href = `https://${prefix}cardanoscan.io/transaction/${txHash}`;
    };
    return ([txHash, paymentAddress]);
  } catch (error) {
    console.log(error);
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