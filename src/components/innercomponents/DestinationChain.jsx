import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import RedClose from "../../assets/img/icons/RedClose.svg";
import {
  setDepartureOrDestination,
  setReceiver,
  setPrivateKey,
  setSwitchDestination,
} from "../../store/reducers/generalSlice";
import ChainSwitch from "../Buttons/ChainSwitch";
// import vet from "../../assets/img/Vector.svg";
// import { ReactComponent as Vet } from "../../assets/img/Vector.svg";

function DestinationChain() {
  const alert = useSelector((state) => state.general.pasteDestinationAlert);
  const to = useSelector((state) => state.general.to);
  const { widget } = useSelector(({ general: { widget } }) => ({
    widget,
  }));

  const dispatch = useDispatch();
  const receiver = useSelector((state) => state.general.receiver);
  const pk = useSelector((state) => state.general.privateKey);


  const handleChange = (e) => {
    dispatch(setReceiver(e.target.value));
  };

  const handlePkChange = (e) => {
    dispatch(setPrivateKey(e.target.value));
  };

  function handleSwitchChain() {
    dispatch(setDepartureOrDestination("destination"));
    dispatch(setSwitchDestination(true));
  }

  useEffect(() => {}, [to]);

  return (
    <div className="destination-props">
      <div className="destination__header">
        <span className="destination__title">Destination</span>
        <ChainSwitch assignment={"to"} func={handleSwitchChain} />
      </div>

      <div className={!alert ? "destination__address" : "destination__address desti-alert"}>
        <input
          value={receiver}
          onChange={(e) => handleChange(e)}
          type="text"
          placeholder="Paste destination address"
        />
        <div className="destination__header">
          <span className="destination__title">Private Key</span>
        </div>
        <input
          value={pk}
          onChange={(e) => handlePkChange(e)}
          type="text"
          placeholder="Paste Private Key"
        />
        <span className="invalid">
          <img src={RedClose} alt="Close" /> Invalid address
        </span>
      </div>
    </div>
  );
}

export default DestinationChain;
