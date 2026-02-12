import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { SelectorWindow } from "./components/capture/SelectorWindow";
import "./index.css";

function Root() {
  const label = getCurrentWindow().label;

  if (label === "selector") {
    return <SelectorWindow />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
