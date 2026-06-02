import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import * as api from "./api";
import logo from "./assets/logo.png";

const GITHUB_URL = "https://github.com/vpck-labs/pepeswitcher";

export default function About(props: { onClose: () => void }) {
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion(""));
  }, []);

  return (
    <div className="dialog about">
      <img className="about-logo" src={logo} alt="PepeSwitcher logo" />
      <h2>PepeSwitcher</h2>
      {version && <p className="hint">Version {version}</p>}

      <div className="about-info">
        <div>
          Developed by <strong>vpck</strong>
        </div>
        <div className="muted">Licensed under the GNU General Public License v3.0</div>
        <div className="muted">
          Command-line tools powered by{" "}
          <button className="link" onClick={() => api.openExternal("https://www.nirsoft.net/")}>
            NirSoft
          </button>
        </div>
        <button className="link" onClick={() => api.openExternal(GITHUB_URL)}>
          github.com/vpck-labs/pepeswitcher
        </button>
      </div>

      <div className="dialog-actions">
        <button onClick={props.onClose}>Close</button>
      </div>
    </div>
  );
}
