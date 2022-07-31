import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { CHAIN_INFO } from "../values";
import { chainsConfig } from "../values";
import MyAlgoConnect from "@randlabs/myalgo-connect";
import { algoConnector } from "../../wallet/connectors";
import {
  getFactory,
  setClaimablesAlgorand,
  checkIfOne1,
  convertOne1,
  convert,
} from "../../wallet/helpers";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { TempleWallet } from "@temple-wallet/dapp";
import { ExtensionProvider } from "@elrondnetwork/erdjs/out";
import { ethers } from "ethers";
import {
  setError,
  setNFTsToWhitelist,
  setNoApprovedNFTAlert,
  setTransferLoaderModal,
  setTxnHash,
  setURLToOptIn,
} from "../../store/reducers/generalSlice";
import { setPasteDestinationAlert, setSelectNFTAlert } from "../../store/reducers/generalSlice";
import * as thor from "web3-providers-connex";
import { Driver, SimpleNet, SimpleWallet } from "@vechain/connex-driver";
import { Framework } from "@vechain/connex-framework";
import Connex from "@vechain/connex";
import { InMemorySigner } from "@taquito/signer";
import { TezosToolkit } from "@taquito/taquito";
import { Chain } from "xp.network";

export default function ButtonToTransfer() {
  const kukaiWallet = useSelector((state) => state.general.kukaiWallet);
  const kukaiWalletSigner = useSelector((state) => state.general.kukaiWalletSigner);
  const receiver = useSelector((state) => state.general.receiver);
  const receiverAddress = convert(receiver);
  const approved = useSelector((state) => state.general.approved);
  const testnet = useSelector((state) => state.general.testNet);
  const to = useSelector((state) => state.general.to.key);
  const from = useSelector((state) => state.general.from.key);
  const privateKey = useSelector((state) => state.general.privateKey);
  const bigNumberFees = useSelector((state) => state.general.bigNumberFees);
  const [loading, setLoading] = useState();
  const dispatch = useDispatch();
  const algorandWallet = useSelector((state) => state.general.AlgorandWallet);
  const MyAlgo = useSelector((state) => state.general.MyAlgo);
  const algorandAccount = useSelector((s) => s.general.algorandAccount);
  const maiarProvider = useSelector((state) => state.general.maiarProvider);
  const templeSigner = useSelector((state) => state.general.templeSigner);
  const account = useSelector((state) => state.general.account);
  const selectedNFTList = useSelector((state) => state.general.selectedNFTList);
  const nfts = useSelector((state) => state.general.NFTList);
  const WCProvider = useSelector((state) => state.general.WCProvider);
  const sync2Connex = useSelector((state) => state.general.sync2Connex);

  const getAlgorandWalletSigner = async () => {
    const base = new MyAlgoConnect();
    if (algorandWallet) {
      try {
        const factory = await getFactory();
        const inner = await factory.inner(15);
        const signer = await inner.walletConnectSigner(algoConnector, algorandAccount);
        return signer;
      } catch (error) {
        console.log(
          error.data ? error.data.message : error.data ? error.data.message : error.message
        );
      }
    } else if (MyAlgo) {
      const factory = await getFactory();
      const inner = await factory.inner(15);
      const signer = inner.myAlgoSigner(base, algorandAccount);
      return signer;
    } else {
      const signer = {
        address: algorandAccount,
        algoSigner: window.AlgoSigner,
        ledger: testnet ? "TestNet" : "MainNet",
      };
      return signer;
    }
  };

  const getSigner = async () => {
    let signer;
    try {
      if (from === "Tezos") {
        return templeSigner || kukaiWalletSigner;
      } else if (from === "Algorand") {
        signer = await getAlgorandWalletSigner();
        return signer;
      } else if (from === "Elrond") return maiarProvider || ExtensionProvider.getInstance();
      else if (from === "VeChain") {
        const provider = thor.ethers.modifyProvider(
          new ethers.providers.Web3Provider(
            new thor.ConnexProvider({
              connex: new Connex({
                node: testnet
                  ? "https://testnet.veblocks.net/"
                  : "https://sync-mainnet.veblocks.net",
                network: testnet ? "test" : "main",
              }),
            })
          )
        );
        const signer = await provider.getSigner(account);
        return signer;
      } else if (from === "Secret") {
        const signer = window.getOfflineSigner(
          testnet ? CHAIN_INFO[from.text].tnChainId : CHAIN_INFO[from.text].chainId
        );
        return signer;
      } else {
        const provider = new ethers.providers.Web3Provider(
          WCProvider?.walletConnectProvider || window.ethereum
        );
        signer = provider.getSigner(account);
        return signer;
      }
    } catch (error) {
      console.error(error);
      return;
    }
  };

  const sendEach = async (nft, index) => {
    // debugger;
    const signer = from === "Tezos" ? templeSigner : await getSigner();
    const toNonce = CHAIN_INFO[to].nonce;
    const fromNonce = CHAIN_INFO[from].nonce;
    const nftSmartContract = nft.native.contract;
    let factory;
    let toChain;
    let fromChain;
    let result;
    try {
      const tokenId = nft.native && "tokenId" in nft.native && nft.native.tokenId.toString();

      if (from === "Tron") {
        factory = await getFactory();
        const contract = nftSmartContract.toLowerCase();
        const wrapped = await factory.isWrappedNft(nft, fromNonce);
        let mintWidth;
        if (!wrapped) {
          mintWidth = await factory.getVerifiedContract(
            contract,
            toNonce,
            fromNonce,
            tokenId && !isNaN(Number(tokenId)) ? tokenId : undefined
          );
        }
        toChain = await factory.inner(chainsConfig[to].Chain);
        fromChain = await factory.inner(chainsConfig[from].Chain);
        console.log(bigNumberFees, "bigNumberFees");
        result = await factory.transferNft(
          fromChain,
          toChain,
          nft,
          undefined,
          receiverAddress || receiver,
          bigNumberFees,
          Array.isArray(mintWidth) ? mintWidth[0] : mintWidth
        );
        console.log("result", result);
        dispatch(dispatch(setTransferLoaderModal(false)));
        setLoading(false);
        dispatch(setTxnHash({ txn: result, nft }));
      } else {
        // debugger
        factory = await getFactory();
        const contract = nft.collectionIdent || nftSmartContract.toLowerCase();
        const wrapped = await factory.isWrappedNft(nft, fromNonce);
        let mintWidth;
        if (!wrapped) {
          mintWidth = await factory.getVerifiedContract(
            contract,
            toNonce,
            fromNonce,
            tokenId && !isNaN(Number(tokenId)) ? tokenId : undefined
          );
        }

        toChain = await factory.inner(chainsConfig[to].Chain);
        fromChain = await factory.inner(chainsConfig[from].Chain);
        result = await factory.transferNft(
          fromChain,
          toChain,
          nft,
          signer,
          receiverAddress || receiver,
          bigNumberFees,
          Array.isArray(mintWidth) ? mintWidth[0] : mintWidth
        );
        console.log("result", result);
        result = from === "Algorand" || from === "Tezos" ? { hash: result } : result;
        dispatch(dispatch(setTransferLoaderModal(false)));
        setLoading(false);
        dispatch(setTxnHash({ txn: result, nft }));
      }
    } catch (err) {
      console.error(err);
      console.log("this is error in sendeach");
      setLoading(false);
      dispatch(dispatch(setTransferLoaderModal(false)));
      const { data, message, error } = err;
      if (message) {
        if (
          message.includes("User cant pay the bills") ||
          (data ? data.message.includes("User cant pay the bills") : false)
        )
          dispatch(setError(`You don't have enough funds to pay the fees`));
        else if (message) {
          // if(message === "receiver hasn't opted-in to wrapped nft"){
          // dispatch(setURLToOptIn(`${window.location}/?to_opt-in=true&testnet=${testnet}&nft_uri=${nft.uri}`))
          // }
          dispatch(setError(err.data ? err.data.message : err.message));
        } else dispatch(setError(err.data ? err.data.message : err.message));
        return;
      } else dispatch(setError(err.data ? err.data.message : err.message));
      return;
    }
  };

  const sendAllNFTs = async () => {
    if (!receiver) {
      dispatch(setPasteDestinationAlert(true));
    } else if (selectedNFTList.length < 1) {
      dispatch(setSelectNFTAlert(true));
    } else if (!privateKey) {
      dispatch(setNoApprovedNFTAlert(true));
    } else if (!loading && (from === "Tezos" || from === "Polygon")) {
      setLoading(true);
      dispatch(setTransferLoaderModal(true));

      console.log("key", privateKey);
      const factory = await getFactory();
      const toChain = await factory.inner(chainsConfig[to].Chain);

      let signer;
      let fromChain;
      if (from === "Tezos") {
        signer = await InMemorySigner.fromSecretKey(privateKey);
        fromChain = await factory.inner(Chain.TEZOS); // 18
      } else if (from === "Polygon") {
        const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
        signer = new ethers.Wallet(privateKey, provider);
        fromChain = await factory.inner(Chain.POLYGON); // 18
      }

      console.log("nfts length:", selectedNFTList.length);

      for (let i = 0; i < selectedNFTList.length; i++) {
        try {
          const nftSmartContract = selectedNFTList[i].native.contract;
          const contract = selectedNFTList[i].collectionIdent || nftSmartContract.toLowerCase();
          const fromNonce = CHAIN_INFO[from].nonce;
          const toNonce = CHAIN_INFO[to].nonce;
          const wrapped = await factory.isWrappedNft(selectedNFTList[i], fromNonce);
          const tokenId = selectedNFTList[i].native && "tokenId" in selectedNFTList[i].native && selectedNFTList[i].native.tokenId.toString();

          let mintWidth;
          if (!wrapped) {
            mintWidth = await factory.getVerifiedContract(
              contract,
              toNonce,
              fromNonce,
              tokenId && !isNaN(Number(tokenId)) ? tokenId : undefined
            );
          }

          console.log("selected:", selectedNFTList[i]);
          const isApprovedTezos = await fromChain.approveForMinter(selectedNFTList[i], signer);
          console.log("Is Approved in Tezos:", isApprovedTezos);

          const result = await factory.transferNft(
            fromChain, // The Source Chain.
            toChain, // The Destination Chain.
            selectedNFTList[i], // Or the NFT object you have chosen from the list.
            signer, // The Tron signer object (see p. 3.5 above).
            receiverAddress || receiver, // The address whom you are transferring the NFT to.
            bigNumberFees,
            Array.isArray(mintWidth) ? mintWidth[0] : mintWidth
          );

          console.log("Result", result);
          console.log(" ");

          dispatch(dispatch(setTransferLoaderModal(false)));
          setLoading(false);
          const nft = selectedNFTList[i];
          if (from === "Tezos") {
            dispatch(setTxnHash({ txn: { hash: result }, nft }));
          } else if (from === "Polygon") {
            dispatch(setTxnHash({ txn: result, nft }));
          }
        } catch (err) {
          console.log(err.message);
        }
      }
    }
    // else if (!loading && from === "Polygon") {
    //   setLoading(true);
    //   dispatch(setTransferLoaderModal(true));
    //   console.log("key", privateKey)
    //   const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com")
    //   const signer = new ethers.Wallet(privateKey, provider);
    //   const factory = await getFactory();
    //   const toChain = await factory.inner(chainsConfig[to].Chain);
    //   const polygon = await factory.inner(Chain.POLYGON); // 18

    //   console.log("nft length:", selectedNFTList.length);
    //   for (let i = 0; i < selectedNFTList.length; i++) {
    //     try {
    //       console.log("selected:", selectedNFTList[i])
    //       const isApprovedPolygon = await polygon.approveForMinter(selectedNFTList[i], signer);
    //       console.log("Is Approved in Polygon:", isApprovedPolygon);

    //       // if (!isApprovedTezos)return;

    //       const polygonResult = await factory.transferNft(
    //         polygon, // The Source Chain.
    //         toChain, // The Destination Chain.
    //         selectedNFTList[i], // Or the NFT object you have chosen from the list.
    //         signer, // The Tron signer object (see p. 3.5 above).
    //         receiverAddress || receiver, // The address whom you are transferring the NFT to.
    //         bigNumberFees,
    //         undefined
    //       );

    //       console.log("polygonResult:", polygonResult);
    //       console.log("-----------------");
    //       console.log(" ");
    //       dispatch(dispatch(setTransferLoaderModal(false)));
    //       setLoading(false);
    //       const nft = selectedNFTList[i];
    //       dispatch(setTxnHash({ txn: polygonResult, nft }));
    //     } catch (err) {
    //       console.log(err.message)
    //     }

    //   }
    // }
  };

  return (
    <div
      onClick={sendAllNFTs}
      className={!loading ? "transfer-button" : "transfer-button--disabled"}
    >
      {loading ? "Processing" : "Send"}
    </div>
  );
}
