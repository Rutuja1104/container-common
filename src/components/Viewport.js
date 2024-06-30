import React, { useState, useEffect } from "react";
import "./Viewport.css";

const Viewport = ({
  type,
  viewPortContent,
  viewPortConfig,
  toggleViewport,
  blinking,
  handleIconClicked,
  showContextMenu,
  viewportState,
  eventHandler,
  ctx,
}) => {
  const [isViewportOpen, setIsViewportOpen] = useState(viewportState);
  const [showDetails, setShowDetails] = useState(false);
  const toggleViewportState = () => {
    setIsViewportOpen(!isViewportOpen);
    toggleViewport(!isViewportOpen);
  };
  eventHandler?.on("container-launch", (event, content) => {
    if (content?.maximize) {
      setIsViewportOpen(true);
      toggleViewport(true);
    }
  });

  useEffect(() => {
    setIsViewportOpen(viewportState);
  }, [viewportState])

  const showCounts = viewPortConfig?.showCounts;

  const icon = viewPortConfig?.icon;
  const tabBackgroundColor = viewPortConfig?.tabBackgroundColor;
  const tabHeightWithViewport = viewPortConfig?.tabHeightWithViewport;
  const tabHeightWithoutViewport = viewPortConfig?.tabHeightWithoutViewport;
  const tabWidthWithViewport = viewPortConfig?.tabWidthWithViewport;
  const tabWidthWithoutViewport = viewPortConfig?.tabWidthWithoutViewport;
  const viewportHeight = viewPortConfig?.viewportHeight;
  const viewportWidth = viewPortConfig?.viewportWidth;

  const configTabStyle = {
    width: (isViewportOpen ? tabWidthWithViewport : tabWidthWithoutViewport) + "px",
    height: (isViewportOpen ? tabHeightWithViewport : tabHeightWithoutViewport) + "px",
    backgroundColor: tabBackgroundColor || "#fff",
    zIndex: "1",
  };
  const viewportStyle = {
    width: viewportWidth ? viewportWidth : isViewportOpen ? "30vw" : "0",
    height: viewportHeight ? viewportHeight : "60vh",
    overflow: "auto",
  };

  const iconClicked = () => {
    handleIconClicked(false);
  };

  return (
    <div id="insiteflow-container-root">
      <div className="containerViewport" onContextMenu={showContextMenu}>
        {type === 'browser' && showDetails && (
          <div className="hover-details">
            {ctx?.eventCode && <p>Event: {ctx?.eventCode}</p>}
            {ctx?.data?.userDetails && (
              <>
                <p>AccountId: {ctx?.data?.userDetails?.context_id}</p>
                <p>ProviderId: {ctx?.data?.userDetails?.providerId}</p>
                <p>
                  ProviderUsername: {ctx?.data?.userDetails?.username}
                </p>
              </>
            )}
            {ctx?.data?.tenantId && (
              <p>TenantId: {ctx?.data?.tenantId}</p>
            )}
            {ctx?.data?.patientId && (
              <p>PatientId: {ctx?.data?.patientId}</p>
            )}
            {/^\d+$/.test(ctx?.data?.chartId) &&
              ctx?.data?.patientId && (
                <p>ChartId: {ctx?.data?.chartId}</p>
              )}
            {/^\d+$/.test(ctx?.data?.encounterId) &&
              ctx?.data?.patientId && (
                <p>EncounterId: {ctx?.data?.encounterId}</p>
              )}
            {ctx?.data?.userDetails?.app && (
              <p>Section: {ctx?.data?.userDetails?.app}</p>
            )}
          </div>
        )}
        <div
          style={configTabStyle}
          className={`containerSidebarMenu ${isViewportOpen ? "viewportTab" : "viewport"
            }`}
          onClick={(e) => {
            if (!e.target.closest('.iconBox') && !isViewportOpen) {
              toggleViewportState();
            }
          }}
        >
          <ul
            style={{
              flexDirection: parseInt(configTabStyle.width) > parseInt(configTabStyle.height) ? "row" : "column",
              alignItem: isViewportOpen ? "center": "",
              justifyContent: "center"
            }}
          >
            <li style={{ marginRight: !isViewportOpen && "" }}>
              <div className="iconBox">
                <img
                  id="brand-icon"
                  alt=""
                  src={icon}
                  className={`${blinking ? "viewportIcon fade-in-image" : "viewportIcon"
                    }`}
                  onClick={iconClicked}
                  onMouseEnter={() => setShowDetails(true)}
                  onMouseLeave={() => setShowDetails(false)}
                />
              </div>
            </li>
            {showCounts ? (
              <li className="count">{viewPortContent?.count}</li>
            ) : (
              ""
            )}
            {
              <li
                onClick={toggleViewportState}
                className={`${isViewportOpen
                  ? "mt-1 expand-btn expand-btn-r"
                  : parseInt(configTabStyle.width) > parseInt(configTabStyle.height)
                    ? " "
                    : "expand-btn expand-btn-l"
                  }`}
              ></li>
            }
          </ul>
        </div>
        <div
          id="viewport-frame"
          className={isViewportOpen ? (type === 'browser' ? 'openViewportBrowser' : 'openViewport') : "closeViewport"}
          style={viewportStyle}
        >
          {viewPortContent?.url?.length > 0 ? (
            type === "browser" ? (
              <iframe
                style={{ border: "none" }}
                title="Insiteflow viewPortContent"
                src={viewPortContent?.url}
              />
            ) : (
              <webview
                title="Insiteflow viewPortContent"
                src={viewPortContent?.url}
                style={{ height: "100%" }}
              />
            )
          ) : (
            <div className="view">
              <p className="no-event">No Events.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Viewport;
