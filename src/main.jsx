import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { msalConfig, useB2CAuth } from "./auth/msalConfig";
import "./styles.css";

const msalInstance = useB2CAuth ? new PublicClientApplication(msalConfig) : null;

async function bootstrap() {
  if (msalInstance) {
    await msalInstance.initialize();
  }

  const tree = (
    <React.StrictMode>
      {msalInstance ? (
        <MsalProvider instance={msalInstance}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MsalProvider>
      ) : (
        <AuthProvider>
          <App />
        </AuthProvider>
      )}
    </React.StrictMode>
  );

  ReactDOM.createRoot(document.getElementById("root")).render(tree);
}

bootstrap();
