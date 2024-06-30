import React from "react";
import "./Toast.css";

const Toast = ({
  type,
  showToast,
  handleToastAck,
  handleToastClose,
  toastConfig,
  toastContext,
}) => {
  const configStyle = {
    width: parseInt(toastConfig?.width) + "px",
    height: parseInt(toastConfig?.height) + "px",
    color: toastConfig?.color,
    backgroundColor: toastConfig?.backgroundColor,
    fontSize: toastConfig.fontSize + "px",
    transition: "0.5s",
    display: "flex",
  };

  const imgIconStyle = {
    width: `${toastConfig?.iconWidth}`,
    height: `${toastConfig?.iconHeight}`,
  };

  const iconSrc = toastContext?.icon;

  const title = toastContext?.title;

  const description = toastContext?.description;

  const handleClose = () => {
    handleToastClose();
  };

  const handleToastAcknowledged = () => {
    handleToastAck();
  };

  if (!showToast) {
    return null;
  }

  return (
    <div>
      <div className="toast" style={configStyle}>
        <div className="toast-content">
          <div
            className="icon-container align-self-baseline"
            style={type === "desktop" ? { WebkitAppRegion: "drag" } : {}}
          >
            <img
              className="toastIcon"
              alt="icon"
              style={imgIconStyle}
              src={iconSrc}
            />
          </div>
          <div
            className="message-container align-self-end"
            onClick={handleToastAcknowledged}
          >
            <p
              className="message align-self-end"
              style={{
                color: toastConfig?.color,
                fontSize: parseInt(toastConfig.fontSize),
              }}
            >
              {title}
            </p>
            <p
              className="description align-self-end"
              style={{
                color: toastConfig?.color,
                fontSize: parseInt(toastConfig.fontSize),
              }}
            >
              {description}
            </p>
          </div>
          <div className="close-button-container">
            <button onClick={handleClose} className="close-button">
              x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;
