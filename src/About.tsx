import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

export default function About(props: { onClose: () => void }) {
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion(""));
  }, []);

  return (
    <div className="dialog about">
      <h2>PepeSwitcher</h2>
      {version && <p className="hint">Version {version}</p>}
      <div className="about-info">
        <div>
          Developed by <strong>vpck</strong>
        </div>
        <div className="muted">paceka@me.com</div>
        <div className="muted">Licensed under the GNU General Public License</div>
      </div>
      <div className="dialog-actions">
        <button onClick={props.onClose}>Close</button>
      </div>
    </div>
  );
}
