import { useState } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { CHAIN_INFO } from "../values";
import { chainsConfig ,validatedChains } from "../values";
import { getFactory, convert } from "../../wallet/helpers";
import { ethers } from "ethers";
import { setPasteDestinationAlert, setSelectNFTAlert } from "../../store/reducers/generalSlice";
import { InMemorySigner } from "@taquito/signer";
import { Chain } from "xp.network";
import { UserSigner } from "@elrondnetwork/erdjs/out";
import { setNoApprovedNFTAlert, setTransferLoaderModal, setTxnHash } from "../../store/reducers/generalSlice";

export default function ButtonToTransfer() {
  const receiver = useSelector((state) => state.general.receiver);
  const receiverAddress = convert(receiver);
  const to = useSelector((state) => state.general.to.key);
  const from = useSelector((state) => state.general.from.key);
  const privateKey = useSelector((state) => state.general.privateKey);
  const bigNumberFees = useSelector((state) => state.general.bigNumberFees);
  const [loading, setLoading] = useState();
  const dispatch = useDispatch();
  const selectedNFTList = useSelector((state) => state.general.selectedNFTList);

  const sendAllNFTs = async () => {
    if (!receiver) {
      dispatch(setPasteDestinationAlert(true));
    } else if (selectedNFTList.length < 1) {
      dispatch(setSelectNFTAlert(true));
    } else if (!privateKey) {
      dispatch(setNoApprovedNFTAlert(true));
    } else if (!loading && validatedChains.includes(from)) {
      setLoading(true);
      dispatch(setTransferLoaderModal(true));

      console.log("key", privateKey);
      console.log("from", from);
      const factory = await getFactory();
      const toChain = await factory.inner(chainsConfig[to].Chain);

      let signer;
      let fromChain;

      if (from === "Tezos") {
        signer = await InMemorySigner.fromSecretKey(privateKey);
        fromChain = await factory.inner(Chain.TEZOS);

      } else if (from === "Polygon" || from === "Harmony") {
        console.log("rpc:", chainsConfig[from].rpc);
        const provider = new ethers.providers.JsonRpcProvider(chainsConfig[from].rpc);
        signer = new ethers.Wallet(privateKey, provider);
        fromChain = await factory.inner(CHAIN_INFO[from].nonce);

      } else if (from === "Elrond") {
        signer = UserSigner.fromPem(privateKey);
        fromChain = await factory.inner(Chain.ELROND);
      }

      console.log("nfts length:", selectedNFTList.length);

      for (let i = 0; i < selectedNFTList.length; i++) {
        try {
          const nftSmartContract = selectedNFTList[i].native.contract;
          const contract = selectedNFTList[i].collectionIdent || nftSmartContract.toLowerCase();
          const fromNonce = CHAIN_INFO[from].nonce;
          const toNonce = CHAIN_INFO[to].nonce;
          const wrapped = await factory.isWrappedNft(selectedNFTList[i], fromNonce);
          const tokenId =
            selectedNFTList[i].native &&
            "tokenId" in selectedNFTList[i].native &&
            selectedNFTList[i].native.tokenId.toString();

          let mintWidth;
          if (!wrapped) {
            mintWidth = await factory.getVerifiedContract(
              contract,
              toNonce,
              fromNonce,
              tokenId && !isNaN(Number(tokenId)) ? tokenId : undefined
            );
          }
          const isApproved = await fromChain.approveForMinter(selectedNFTList[i], signer);
          console.log("Is Approved:", isApproved);

          const result = await factory.transferNft(
            fromChain,
            toChain,
            selectedNFTList[i],
            signer,
            receiverAddress || receiver,
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
          } else if (from === "Polygon" || from === "Harmony") {
            dispatch(setTxnHash({ txn: result, nft }));
          }
        } catch (err) {
          console.log(err.message);
        }
      }
    }
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
