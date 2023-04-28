import { Cardano } from "@dotare/cardano-delegation";
import { Buffer } from "buffer";
import { newTxBuild, connectWallet, signTx, getStakeActivity, getLatestBlock } from "../utils";

/**
 * example of a delegation transaction using dcspark serialization with some helper methods under the hood
 * 
 * @param stakePoolId 
 * @param walletName 
 * @param networkId 
 * @returns 
 */
export async function delegationTx(stakePoolId: string, walletName: string, networkId: number = 1) {
  const CardanoWasm = await Cardano(); // load the serialization lib
  try {
    const txBuilder = await newTxBuild(networkId, CardanoWasm); // add protocal params

    const Wallet = await connectWallet(walletName); // connect to browser wallet
    const usedAddresses: string[] = await Wallet.getUsedAddresses();
    const rewardAddress: string = await Wallet.getRewardAddresses().then((x) => x[0]);
    const walletNetworkId: number = await Wallet.getNetworkId();

    const stakeKey = await CardanoWasm.StakeCredential.from_keyhash(
      CardanoWasm.Ed25519KeyHash.from_bytes(
        Buffer.from(rewardAddress.slice(2), "hex")
      )
    );

    const stakeAddress = CardanoWasm.RewardAddress.new(
      walletNetworkId,
      stakeKey
    )
      .to_address()
      .to_bech32();

    const stakeInfo = await getStakeActivity(stakeAddress, networkId).then(x => x);
    const network: string = stakeInfo.network;
    if (!network)
      throw new Error(
        "Could not find stake address inside network, may also be new with no funds."
      );
    if (walletNetworkId !== networkId && networkId !== 2)
      throw new Error("Wallet network does not match staking target network.");

    const bech32stakePoolId: string = await CardanoWasm.Ed25519KeyHash.from_bytes(Buffer.from(stakePoolId, "hex")).to_bech32("pool");
    if (stakeInfo.pool_id === bech32stakePoolId) throw new Error("stake address is already delegated to selected pool.")

    const isStakeActive: boolean = stakeInfo.active;

    if (!isStakeActive) {
      txBuilder.add_cert(
        CardanoWasm.SingleCertificateBuilder.new(
          CardanoWasm.Certificate.new_stake_registration(
            CardanoWasm.StakeRegistration.new(
              CardanoWasm.StakeCredential.from_keyhash(
                CardanoWasm.Ed25519KeyHash.from_bytes(
                  Buffer.from(rewardAddress.slice(2), "hex")
                )
              )
            )
          )
        ).skip_witness()
      );
    }

    txBuilder.add_cert(
      CardanoWasm.SingleCertificateBuilder.new(
        CardanoWasm.Certificate.new_stake_delegation(
          CardanoWasm.StakeDelegation.new(
            CardanoWasm.StakeCredential.from_keyhash(
              CardanoWasm.Ed25519KeyHash.from_bytes(
                Buffer.from(rewardAddress.slice(2), "hex")
              )
            ),
            CardanoWasm.Ed25519KeyHash.from_bytes(
              Buffer.from(stakePoolId, "hex")
            )
          )
        )
      ).payment_key()
    );

    const utxos = await Wallet.getUtxos()

    const utxo = CardanoWasm.TransactionUnspentOutput.from_bytes(Buffer.from(utxos[0], 'hex'))

    txBuilder.add_input(
      CardanoWasm.SingleInputBuilder.new(
        utxo.input(), utxo.output()
      ).payment_key()
    )

    const latestSlot = await getLatestBlock(network).then((x) => x.slot);
    txBuilder.set_ttl(CardanoWasm.BigNum.from_str((latestSlot + 500).toString()
    ));

    const paymentAddress = CardanoWasm.BaseAddress.from_address(
      CardanoWasm.Address.from_bytes(Buffer.from(usedAddresses[0], "hex"))
    )
      .to_address()
      .to_bech32();

    const signedTx = await signTx(txBuilder, CardanoWasm, paymentAddress, Wallet);


    const txHash = await Wallet.submitTx(
      Buffer.from(signedTx.to_bytes()).toString("hex")
    );

    console.log(txHash);

    if (window.confirm(`Your Transaction Hash is: ${txHash}. \nIf you click "OK" a new tab will open to CardanoScan to see your transaction. (It may take several minutes to populate.) \nCancel will stay at website.`)) {
      const prefix = network === "mainnet" ? "" : network === "preview" ? "preview." : "preprod.";
      var newTab = window.open(`https://${prefix}cardanoscan.io/transaction/${txHash}`, '_blank');
      newTab.location.href = `https://${prefix}cardanoscan.io/transaction/${txHash}`;
    };
    return ([txHash, paymentAddress]);
  } catch (error) {
    switch (error.name) {
      case 'TypeError':
        alert('New tab was blocked from opening, look for pop-up blocked notification to see link.');
        break;
      default:
        if (!error.name) alert(`could not delegate due to: ${error.info}`)
        else {
          alert(`could not delegate due to: ${error}`)
        }
    }
  }
};