import { Cardano } from "@dotare/cardano-delegation";
import { Buffer } from "buffer";
import {
  newTxBuild,
  connectWallet,
  signTx,
  getLatestBlock,
  getFeeParams,
  getExUnitEval,
} from "../utils";

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
export async function mintSignedTokenTx(
  assetName: string,
  amount: number,
  walletName: string,
  networkId: number = 1
) {
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
    const utxos = await Wallet.getUtxos();
    let utxoCollateral;

    utxos.forEach((utx) => {
      const utxo = CardanoWasm.TransactionUnspentOutput.from_bytes(
        Buffer.from(utx, "hex")
      );
      const lovelace = utxo.output().to_js_value().amount.coin;
      if (3000000 <= lovelace && lovelace <= 6000000) utxoCollateral = utxo;
      txBuilder.add_utxo(
        CardanoWasm.SingleInputBuilder.new(
          utxo.input(),
          utxo.output()
        ).payment_key()
      );
    });

    const collaterals = await Wallet.experimental?.getCollateral();
    const collateral =
      collaterals?.length >= 1
        ? CardanoWasm.TransactionUnspentOutput.from_bytes(
            Buffer.from(collaterals[0], "hex")
          )
        : utxoCollateral;
    if (!collateral)
      throw new Error(
        `No collateral set. Please set collateral in your ${walletName} wallet.`
      );

    txBuilder.add_collateral(
      CardanoWasm.SingleInputBuilder.new(
        collateral.input(),
        collateral.output()
      ).payment_key()
    );

    const plutusScriptWitness = CardanoWasm.PlutusScriptWitness.from_script(
      CardanoWasm.PlutusScript.from_v2(
        CardanoWasm.PlutusV2Script.from_bytes(
          Buffer.from(
            "59081a590817010000323232332232323232323232323233223233223232323232322223232533532323253353235001222222222222533533355301612001321233001225335002210031001002501f25335333573466e3c0440040b00ac4d408400454080010840b040a8d40048800840784cd5ce249116d697373696e67207369676e61747572650001d3333573466e1cd55cea80224000466442466002006004646464646464646464646464646666ae68cdc39aab9d500c480008cccccccccccc88888888888848cccccccccccc00403403002c02802402001c01801401000c008cd4060064d5d0a80619a80c00c9aba1500b33501801a35742a014666aa038eb9406cd5d0a804999aa80e3ae501b35742a01066a03004a6ae85401cccd54070099d69aba150063232323333573466e1cd55cea801240004664424660020060046464646666ae68cdc39aab9d5002480008cc8848cc00400c008cd40c1d69aba150023031357426ae8940088c98c80cccd5ce01b01a81889aab9e5001137540026ae854008c8c8c8cccd5cd19b8735573aa004900011991091980080180119a8183ad35742a00460626ae84d5d1280111931901999ab9c036035031135573ca00226ea8004d5d09aba2500223263202f33573806406205a26aae7940044dd50009aba1500533501875c6ae854010ccd540700888004d5d0a801999aa80e3ae200135742a00460486ae84d5d1280111931901599ab9c02e02d029135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d55cf280089baa00135742a00860286ae84d5d1280211931900e99ab9c02001f01b3333573466e1cd55ce9baa0054800080788c98c8070cd5ce00f80f00d1bae005101c13263201a3357389201035054350001c135573ca00226ea8004c8004d5406088448894cd40044d400c88004884ccd401488008c010008ccd54c01c4800401401000448c88c008dd6000990009aa80c111999aab9f0012500a233500930043574200460066ae880080608c8c8cccd5cd19b8735573aa004900011991091980080180118071aba150023005357426ae8940088c98c8058cd5ce00c80c00a09aab9e5001137540024646464646666ae68cdc39aab9d5004480008cccc888848cccc00401401000c008c8c8c8cccd5cd19b8735573aa0049000119910919800801801180b9aba1500233500f016357426ae8940088c98c806ccd5ce00f00e80c89aab9e5001137540026ae854010ccd54021d728039aba150033232323333573466e1d4005200423212223002004357426aae79400c8cccd5cd19b875002480088c84888c004010dd71aba135573ca00846666ae68cdc3a801a400042444006464c6403a66ae7008007c06c0680644d55cea80089baa00135742a00466a016eb8d5d09aba2500223263201733573803403202a26ae8940044d5d1280089aab9e500113754002266aa002eb9d6889119118011bab00132001355015223233335573e0044a010466a00e66442466002006004600c6aae754008c014d55cf280118021aba200301613574200222440042442446600200800624464646666ae68cdc3a800a400046a00e600a6ae84d55cf280191999ab9a3370ea00490011280391931900919ab9c01501401000f135573aa00226ea800448488c00800c44880048c8c8cccd5cd19b875001480188c848888c010014c01cd5d09aab9e500323333573466e1d400920042321222230020053009357426aae7940108cccd5cd19b875003480088c848888c004014c01cd5d09aab9e500523333573466e1d40112000232122223003005375c6ae84d55cf280311931900819ab9c01301200e00d00c00b135573aa00226ea80048c8c8cccd5cd19b8735573aa004900011991091980080180118029aba15002375a6ae84d5d1280111931900619ab9c00f00e00a135573ca00226ea80048c8cccd5cd19b8735573aa002900011bae357426aae7940088c98c8028cd5ce00680600409baa001232323232323333573466e1d4005200c21222222200323333573466e1d4009200a21222222200423333573466e1d400d2008233221222222233001009008375c6ae854014dd69aba135744a00a46666ae68cdc3a8022400c4664424444444660040120106eb8d5d0a8039bae357426ae89401c8cccd5cd19b875005480108cc8848888888cc018024020c030d5d0a8049bae357426ae8940248cccd5cd19b875006480088c848888888c01c020c034d5d09aab9e500b23333573466e1d401d2000232122222223005008300e357426aae7940308c98c804ccd5ce00b00a80880800780700680600589aab9d5004135573ca00626aae7940084d55cf280089baa0012323232323333573466e1d400520022333222122333001005004003375a6ae854010dd69aba15003375a6ae84d5d1280191999ab9a3370ea0049000119091180100198041aba135573ca00c464c6401866ae7003c0380280244d55cea80189aba25001135573ca00226ea80048c8c8cccd5cd19b875001480088c8488c00400cdd71aba135573ca00646666ae68cdc3a8012400046424460040066eb8d5d09aab9e500423263200933573801801600e00c26aae7540044dd500089119191999ab9a3370ea00290021091100091999ab9a3370ea00490011190911180180218031aba135573ca00846666ae68cdc3a801a400042444004464c6401466ae7003403002001c0184d55cea80089baa0012323333573466e1d40052002200623333573466e1d40092000200623263200633573801201000800626aae74dd5000a4c2440042440022400292010350543100112323001001223300330020020011",
            "hex"
          )
        )
      )
    );
    console.log(plutusScriptWitness.hash().to_hex());

    const reqSigners = CardanoWasm.Ed25519KeyHashes.new();
    reqSigners.add(
      CardanoWasm.Ed25519KeyHash.from_hex(usedAddresses[0].slice(2, 58))
    );

    const params = CardanoWasm.PlutusList.new();
    params.add(
      CardanoWasm.PlutusData.new_bytes(
        Buffer.from(reqSigners.to_bytes(), "hex").toString("hex")
      )
    );

    const partial = CardanoWasm.PartialPlutusWitness.new(
      plutusScriptWitness,
      CardanoWasm.PlutusData.new_constr_plutus_data(
        CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.zero(), params)
      )
    );

    console.log(partial.script().hash().to_hex());
    const scriptasd = partial.script();
    const newscriptasd = CardanoWasm.PartialPlutusWitness.new(
      scriptasd,
      CardanoWasm.PlutusData.new_constr_plutus_data(
        CardanoWasm.ConstrPlutusData.new(CardanoWasm.BigNum.zero(), params)
      )
    );

    console.log(newscriptasd.script().hash().to_hex());


    txBuilder.add_mint(
      CardanoWasm.SingleMintBuilder.new(
        CardanoWasm.MintAssets.new_from_entry(
          CardanoWasm.AssetName.new(Buffer.from(assetName)),
          CardanoWasm.Int.new(CardanoWasm.BigNum.from_str(amount.toString()))
        )
      ).plutus_script(
        partial,
        reqSigners
      )
    );

    const latestSlot = await getLatestBlock(networkId).then((x) => x.slot);
    txBuilder.set_ttl(
      CardanoWasm.BigNum.from_str((latestSlot + 500).toString())
    );

    const { cost_models } = await getFeeParams(networkId);

    const JsonCostModel = {
      language: "PlutusV2",
      op_costs: Object.values(cost_models.PlutusV2).map((e) => e.toString()),
    };
    const costModel = CardanoWasm.CostModel.from_json(
      JSON.stringify(JsonCostModel)
    );
    const Costmdls = CardanoWasm.Costmdls.new();
    Costmdls.insert(costModel);

    txBuilder.select_utxos();
    const redeemerTxBuilder = txBuilder.build_for_evaluation(
      0,
      CardanoWasm.Address.from_bech32(paymentAddress)
    );
    const draftTx = redeemerTxBuilder.draft_tx();
    console.log("draftTx: ", draftTx.to_js_value());
    const evalResults = await getExUnitEval(draftTx, networkId);
    const evalExUnits = evalResults.result.EvaluationResult["mint:0"];
    const exUnits = CardanoWasm.ExUnits.new(
      CardanoWasm.BigNum.from_str(evalExUnits.memory.toString()),
      CardanoWasm.BigNum.from_str(evalExUnits.steps.toString())
    );

    redeemerTxBuilder.set_exunits(
      CardanoWasm.RedeemerWitnessKey.new(
        CardanoWasm.RedeemerTag.new_mint(),
        CardanoWasm.BigNum.zero()
      ),
      exUnits
    );
    const Redeemers = redeemerTxBuilder.build();

    const Languages = CardanoWasm.Languages.new();

    Languages.add(CardanoWasm.Language.new_plutus_v2());

    console.log(txBuilder.get_mint().to_js_value());
    const scriptDataHash = CardanoWasm.hash_script_data(
      Redeemers,
      Costmdls,
      undefined
    );

    const signedTxBuilder = txBuilder.build(
      0,
      CardanoWasm.Address.from_bech32(paymentAddress)
    );
    const draftTxBody = draftTx.body();

    console.log("signedTxBuilder.body: ", signedTxBuilder.body().to_js_value());
    draftTxBody.set_script_data_hash(scriptDataHash);

    const witnessSet = signedTxBuilder.witness_set();
    witnessSet.add_redeemers(Redeemers);

    const builtwitnessset = witnessSet.build();
    const transaction = CardanoWasm.Transaction.new(
      draftTxBody,
      builtwitnessset
    );

    console.log(transaction.to_js_value());

    const witness = await Wallet.signTx(
      Buffer.from(transaction.to_bytes(), "hex").toString("hex"),
      false
    );

    const signedTx = CardanoWasm.Transaction.new(
      transaction.body(),
      CardanoWasm.TransactionWitnessSet.from_bytes(Buffer.from(witness, "hex")),
      undefined
    );

    const scripts = CardanoWasm.PlutusV2Scripts.new();
    scripts.add(
      CardanoWasm.PlutusV2Script.from_bytes(
        Buffer.from(plutusScriptWitness.hash().to_hex(), "hex")
      )
    );
    const signedWitnessSet = signedTx.witness_set();
    signedWitnessSet.set_redeemers(Redeemers);
    signedWitnessSet.set_plutus_v2_scripts(scripts);

    const signedTxFinal = CardanoWasm.Transaction.new(
      signedTx.body(),
      signedWitnessSet
    );

    const txHash = await Wallet.submitTx(
      Buffer.from(signedTxFinal.to_bytes()).toString("hex")
    );

    console.log(txHash);
    if (
      window.confirm(
        `Your Transaction Hash is: ${txHash}. \nIf you click "OK" a new tab will open to CardanoScan to see your transaction. (It may take several minutes to populate.) \nCancel will stay at website.`
      )
    ) {
      const prefix =
        networkId === 1 ? "" : networkId === 0 ? "preview." : "preprod.";
      var newTab = window.open(
        `https://${prefix}cardanoscan.io/transaction/${txHash}`,
        "_blank"
      );
      newTab.location.href = `https://${prefix}cardanoscan.io/transaction/${txHash}`;
    }
    return [txHash, paymentAddress];
  } catch (error) {
    console.log(error);

    switch (error.message) {
      case "Cannot read properties of null (reading 'location')":
        alert(
          "New tab was blocked from opening, look for pop-up blocked notification to see link."
        );
        break;
      default:
        if (!error.name) alert(`could not mint due to: ${error.info}`);
        else {
          alert(`could not mint due to: ${error}`);
        }
    }
  }
}
