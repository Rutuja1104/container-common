import React, { useState } from "react";
import Toast from "./components/Toast";
import Viewport from "./components/Viewport";
import { configViewportDetails, configToastDetails } from "./components/config";
import { content } from "./components/content";

//use case

const App = () => {
  const [isOpenViewport, setIsOpenViewport] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const toggleViewport = () => {
    setIsOpenViewport((prevState) => !prevState);
    console.log("toggle viewport", isOpenViewport);
  };

  const handleIconClicked = () => {
    setBlinking(false);
    console.log("icon clicked");
  };

  const type = "browser";
  return (
    <>
      <h1>Common Container</h1>
      <Toast
        type={type}
        toastConfig={configToastDetails}
        showToast={true}
        toastContext={content}
      />
      <Viewport
        toggleViewport={toggleViewport}
        type={type}
        viewPortConfig={configViewportDetails}
        viewPortContent={content}
        blinking={blinking}
        handleIconClicked={handleIconClicked}
      />
    </>
  );
};

export default App;
