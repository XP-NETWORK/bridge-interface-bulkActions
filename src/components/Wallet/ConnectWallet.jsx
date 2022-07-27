import { useEffect, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import {
  setCheckWallet,
  setQrCodeString,
  setShowAbout,
  setShowVideo,
  setTemporaryFrom,
  setWalletsModal,
  setWrongNetwork,
} from "../../store/reducers/generalSlice";
import MaiarModal from "../MaiarModal";
import WalletList from "./WalletList";
import { useNavigate, useLocation } from "react-router-dom";
import { CHAIN_INFO, TESTNET_CHAIN_INFO } from "../values";
import { useWeb3React } from "@web3-react/core";
import { getAddEthereumChain } from "../../wallet/chains";
import { useDidUpdateEffect } from "../Settings/hooks";
import Web3 from "web3";

function ConnectWallet() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [walletSearch, setWalletSearch] = useState();
  const hardcoded = new URLSearchParams(window.location.search).get(
    "checkWallet"
  );
  dispatch(setCheckWallet(hardcoded));
  const from = useSelector((state) => state.general.from);
  const to = useSelector((state) => state.general.to);
  const [show, setShow] = useState();
  const qrCodeString = useSelector((state) => state.general.qrCodeString);
  const qrCodeImage = useSelector((state) => state.general.qrCodeImage);
  const elrondAccount = useSelector((state) => state.general.elrondAccount);
  const tezosAccount = useSelector((state) => state.general.tezosAccount);
  const secretAccount = useSelector((state) => state.general.secretAccount);

  const algorandAccount = useSelector((state) => state.general.algorandAccount);
  const evmAccount = useSelector((state) => state.general.account);
  const tronAccount = useSelector((state) => state.general.tronWallet);
  const testnet = useSelector((state) => state.general.testNet);
  const bitKeep = useSelector((state) => state.general.bitKeep);

  const { account, chainId } = useWeb3React();
  const inputElement = useRef(null);

  const connected =
    secretAccount ||
    elrondAccount ||
    tezosAccount ||
    algorandAccount ||
    evmAccount ||
    tronAccount ||
    account
      ? true
      : false;

  const handleClose = () => {
    setShow(false);
    setWalletSearch("");
    dispatch(setWalletsModal(false));
    if (qrCodeImage) {
      dispatch(setQrCodeString(""));
    }
    dispatch(setTemporaryFrom(""));
  };

  const walletsModal = useSelector((state) => state.general.walletsModal);

  async function switchNetwork() {
    const info = testnet
      ? TESTNET_CHAIN_INFO[from?.key]
      : CHAIN_INFO[from?.key];
    const _chainId = `0x${info.chainId.toString(16)}`;
    try {
      const success = await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: _chainId }],
      });
      navigate(
        testnet
          ? `/testnet/account${location.search ? location.search : ""}`
          : `/account${location.search ? location.search : ""}`
      );
      dispatch(setWrongNetwork(false));
    } catch (error) {
      console.log(error);
      try {
        const toHex = (num) => {
          return "0x" + num.toString(16);
        };
        const chain = getAddEthereumChain()[parseInt(_chainId).toString()];

        const params = {
          chainId: _chainId, // A 0x-prefixed hexadecimal string
          chainName: chain.name,
          nativeCurrency: {
            name: chain.nativeCurrency.name,
            symbol: chain.nativeCurrency.symbol, // 2-6 characters long
            decimals: chain.nativeCurrency.decimals,
          },
          rpcUrls: chain.rpc,
          blockExplorerUrls: [
            chain.explorers &&
            chain.explorers.length > 0 &&
            chain.explorers[0].url
              ? chain.explorers[0].url
              : chain.infoURL,
          ],
        };
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [params, account],
        });
        navigate(
          testnet
            ? `/testnet/account${location.search ? location.search : ""}`
            : `/account${location.search ? location.search : ""}`
        );
      } catch (error) {
        console.log(error);
      }
    }
  }

  const handleConnect = async () => {
    let provider;
    let _chainId;
    if (bitKeep) {
      provider = window.bitkeep?.ethereum;
      await provider.request({ method: "eth_requestAccounts" });
      const web3 = new Web3(provider);
      _chainId = await web3.eth.getChainId();
    }
    const chainID = chainId || _chainId;
    if (testnet && from.tnChainId === chainID) {
      navigate(`/testnet/account${location.search ? location.search : ""}`);
    } else if (!testnet && from.chainId === chainID) {
      navigate(`/account${location.search ? location.search : ""}`);
    } else if (testnet && from.type !== "EVM") {
      navigate(`/testnet/account${location.search ? location.search : ""}`);
    } else if (from.type !== "EVM") {
      navigate(`/account${location.search ? location.search : ""}`);
    } else {
      switchNetwork();
    }
  };

  function handleAboutClick() {
    dispatch(setShowAbout(true));
  }
  function handleVideoClick() {
    dispatch(setShowVideo(true));
  }

  useDidUpdateEffect(() => {
    inputElement?.current?.focus();
  }, [show, walletsModal]);

  return (
    <div>
      <div
        onClick={() =>
          from && to
            ? !connected
              ? setShow(true)
              : handleConnect()
            : undefined
        }
        className={
          from && to
            ? "connect-wallet__button"
            : "connect-wallet__button--disabled"
        }
      >
        Continue bridging -&gt;
      </div>
      <div id="aboutnft" className="aboutNft">
        <div
          onClick={() => handleVideoClick()}
          className="about-btn about-video"
        >
          Learn how to use NFT bridge
        </div>
        <div
          onClick={() => handleAboutClick()}
          className="about-btn about-text"
        >
          What is NFT
        </div>
      </div>
      {!qrCodeString && (
        <Modal
          show={show || walletsModal}
          onHide={handleClose}
          animation={false}
          className="ChainModal wallet-modal"
        >
          <Modal.Header>
            <Modal.Title>Connect Wallet</Modal.Title>
            <span className="CloseModal" onClick={handleClose}>
              <div className="close-modal"></div>
            </span>
          </Modal.Header>
          <div className="wallet-search__container">
            <input
              ref={inputElement}
              onChange={(e) => setWalletSearch(e.target.value)}
              value={walletSearch}
              className="wallet-search serchInput"
              type="text"
              placeholder="Search"
            />
            <div className="magnify"></div>
          </div>
          <Modal.Body>
            <div className="walletListBox">
              <WalletList input={walletSearch} connected={handleClose} />
            </div>
          </Modal.Body>
        </Modal>
      )}
      {qrCodeString && (
        <MaiarModal
          handleClose={handleClose}
          strQR={qrCodeImage}
          qrCodeString={qrCodeString}
          setShow={setShow}
          show={show}
        />
      )}
    </div>
  );
}
//
export default ConnectWallet;
