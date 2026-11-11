"use client";

import { Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";

export const BYOK_STORAGE_KEY = "targetjee.byok.gemini.v1";
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

type ByokConfiguration = {
  provider: "gemini";
  apiKey: string;
  model: string;
  savedAt: string;
};

function loadConfiguration(): ByokConfiguration | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BYOK_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ByokConfiguration>;
    if (value.provider !== "gemini" || typeof value.apiKey !== "string" || !value.apiKey.trim()) return null;
    return {
      provider: "gemini",
      apiKey: value.apiKey,
      model: typeof value.model === "string" && value.model.trim() ? value.model.trim() : DEFAULT_GEMINI_MODEL,
      savedAt: typeof value.savedAt === "string" ? value.savedAt : ""
    };
  } catch {
    return null;
  }
}

/** Only called in browser event paths; no secret is rendered into the server response. */
export function getByokExtractionHeaders(): Record<string, string> {
  const config = loadConfiguration();
  if (!config) return {};
  return {
    "X-TargetJee-Vision-Provider": "gemini",
    "X-TargetJee-Api-Key": config.apiKey,
    "X-TargetJee-Vision-Model": config.model
  };
}

type ByokKeyDialogProps = {
  onClose: () => void;
  onSaved?: () => void;
};

/**
 * User-controlled Google Gemini key dialog. It is only mounted after an explicit browser
 * click, stores the key in that browser's localStorage, and supplies it per extraction.
 */
export function ByokKeyDialog({ onClose, onSaved }: ByokKeyDialogProps) {
  const saved = loadConfiguration();
  const [apiKey, setApiKey] = useState(saved?.apiKey ?? "");
  const [model, setModel] = useState(saved?.model ?? DEFAULT_GEMINI_MODEL);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanKey = apiKey.trim();
    const cleanModel = model.trim();
    if (!cleanKey) { setMessage("Enter a Google AI Studio API key to enable live source extraction."); return; }
    if (!/^[A-Za-z0-9._-]{3,120}$/.test(cleanModel)) { setMessage("Use a valid Gemini model ID, such as gemini-flash-latest."); return; }
    window.localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify({ provider: "gemini", apiKey: cleanKey, model: cleanModel, savedAt: new Date().toISOString() } satisfies ByokConfiguration));
    onSaved?.();
    onClose();
  };

  const remove = () => {
    window.localStorage.removeItem(BYOK_STORAGE_KEY);
    setApiKey("");
    setModel(DEFAULT_GEMINI_MODEL);
    setMessage("Key removed from this browser.");
  };

  return <div className="modal-backdrop byok-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal byok-modal" role="dialog" aria-modal="true" aria-labelledby="byok-dialog-title">
      <div className="byok-heading"><div className="modal-icon blue"><KeyRound size={25} /></div><button type="button" className="byok-close" onClick={onClose} aria-label="Close API key dialog"><X size={18} /></button></div>
      <div className="eyebrow">BRING YOUR OWN KEY · GOOGLE GEMINI</div>
      <h2 id="byok-dialog-title">Connect your own AI key.</h2>
      <p>Use your Google AI Studio key for live problem extraction. TargetJEE does not persist it in its database; it is stored on this browser and forwarded only with your extraction request.</p>
      <form onSubmit={save}>
        <label className="byok-field"><span>GEMINI API KEY</span><div><input value={apiKey} onChange={(event) => { setApiKey(event.target.value); setMessage(null); }} type={showKey ? "text" : "password"} autoComplete="off" placeholder="Paste your Google AI Studio key" /><button type="button" onClick={() => setShowKey((current) => !current)} aria-label={showKey ? "Hide API key" : "Show API key"}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
        <a className="byok-provider-link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Get a Google AI Studio key in a new tab ↗</a>
        <label className="byok-field"><span>GEMINI MODEL</span><input value={model} onChange={(event) => { setModel(event.target.value); setMessage(null); }} autoComplete="off" /></label>
        {message && <p className="byok-message">{message}</p>}
        <div className="byok-notice"><LockKeyhole size={14} /><span>Use this only on a personal browser. Clear it from this device whenever you wish.</span></div>
        <div className="modal-actions byok-actions"><button type="button" className="byok-remove" onClick={remove} disabled={!apiKey}><Trash2 size={14} /> Remove local key</button><button className="primary-button" type="submit"><ShieldCheck size={15} /> Save &amp; enable extraction</button></div>
      </form>
    </section>
  </div>;
}
