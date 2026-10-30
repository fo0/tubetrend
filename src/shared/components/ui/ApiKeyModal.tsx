import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, HelpCircle, Key, ExternalLink, Loader2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { verifyApiKey } from "@/src/features/youtube/services/youtubeApiClient";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Minimum plausible length for a YouTube Data API key (real keys are ~39 chars).
// Single source of truth for both the disabled state and the submit guard so the
// two can't drift out of sync (they previously used <10 vs >10 — a dead state
// where the button looked enabled but submit silently did nothing).
const MIN_API_KEY_LENGTH = 10;

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  /**
   * Dismiss the dialog without saving a key. Omit it and the dialog has no way
   * out — see the Escape handler below for why every caller should pass one.
   */
  onClose?: () => void;
}

/** Why the last check did not save the key — tied to the key it was made for. */
interface KeyCheckFailure {
  key: string;
  message: string;
  /** YouTube could not be reached: the same key may be saved unchecked on the next submit. */
  allowUnchecked: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, onClose }) => {
  const [inputKey, setInputKey] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  // The key is masked by default (privacy / shoulder-surfing); a toggle reveals it.
  const [showKey, setShowKey] = useState(false);
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  // What had focus before this dialog appeared, so closing can hand it back
  // (WCAG 2.4.3) — otherwise focus falls to <body> and a keyboard user resumes
  // tabbing from the top of the page instead of the control they came from.
  //
  // Captured during render, not in an effect: the key field carries `autoFocus`,
  // which React applies while committing the DOM — i.e. before any effect of
  // this component runs. Reading `document.activeElement` from an effect would
  // therefore capture that very input and "restore" focus to a node that is
  // being unmounted in the same breath.
  const previouslyFocusedRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null,
  );

  const trimmedKey = inputKey.trim();
  const isKeyLongEnough = trimmedKey.length >= MIN_API_KEY_LENGTH;
  // Show the "too short" hint only once the user has typed something.
  const showTooShortHint = inputKey.length > 0 && !isKeyLongEnough;

  // Save checks the key against YouTube first (1 quota unit) instead of storing
  // whatever was pasted. A typo, a key whose project never enabled the YouTube
  // Data API, or one restricted to another site used to close this dialog as if
  // all was well — the failure only surfaced at the first search, as an error
  // banner, or with the dialog popping up again for no visible reason.
  const [isChecking, setIsChecking] = useState(false);
  const [checkFailure, setCheckFailure] = useState<KeyCheckFailure | null>(null);
  const checkAbortRef = useRef<AbortController | null>(null);
  // A failure describes the key it was made for; editing the field retires it.
  const activeFailure = checkFailure && checkFailure.key === trimmedKey ? checkFailure : null;

  // Closing the dialog mid-check drops the request instead of saving behind it.
  useEffect(() => () => checkAbortRef.current?.abort(), []);

  // Focus trap: keep focus inside the modal while it is open (WCAG 2.4.3)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab" || !dialogRef.current) return;

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /**
   * Close without saving, handing focus back to whatever opened the dialog.
   *
   * The focus move happens before `onClose`, i.e. while this component is still
   * mounted: the caller unmounts it synchronously, and a `.focus()` afterwards
   * would race the teardown. The target is outside the dialog, so it keeps the
   * focus it is given. `isConnected` guards the case where the trigger itself is
   * gone (the header swaps its API-key button when the key state changes).
   */
  const handleClose = useCallback(() => {
    if (!onClose) return;
    const previouslyFocused = previouslyFocusedRef.current;
    if (previouslyFocused?.isConnected) previouslyFocused.focus?.();
    onClose();
  }, [onClose]);

  // Escape closes the dialog.
  //
  // The Tab trap above is only half of WCAG 2.4.3 — the other half is a way
  // back out, and this dialog had none: no Escape, no close button, no backdrop
  // click. The single exit was submitting a key of at least MIN_API_KEY_LENGTH
  // characters, so anyone who opened it (or landed in it on first run) with no
  // key at hand was held in a trap the standard names outright, WCAG 2.1.2 "No
  // Keyboard Trap". Every other dialog in the app — the hidden-highlights
  // modal, the shortcuts popover, the quota panel — already closes on Escape.
  //
  // Dismissing is safe: the dashboard renders favorites and highlights straight
  // out of localStorage and needs no API key at all, and any action that does
  // need one routes back through App's onApiKeyInvalid, which reopens this
  // dialog. The header keeps a button to open it again by hand.
  useEffect(() => {
    if (!onClose) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      handleClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose, handleClose]);

  // Lock background scrolling while this blocking dialog is up, so the page
  // behind the backdrop cannot be scrolled out from under the user.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKeyLongEnough || isChecking) return;
    const key = trimmedKey;

    // Second submit after "could not reach YouTube": the user chose to keep the
    // key unchecked — offline setups and blocked networks must not lock them out.
    if (activeFailure?.allowUnchecked) {
      onSave(key);
      return;
    }

    checkAbortRef.current?.abort();
    const controller = new AbortController();
    checkAbortRef.current = controller;
    setIsChecking(true);
    setCheckFailure(null);

    let result: Awaited<ReturnType<typeof verifyApiKey>>;
    try {
      result = await verifyApiKey(key, controller.signal);
    } catch {
      // Only an abort lands here — the dialog was closed, nothing left to update.
      return;
    }
    if (controller.signal.aborted) return;
    setIsChecking(false);

    switch (result.status) {
      case "ok":
        onSave(key);
        return;
      case "invalid":
        setCheckFailure({ key, message: t("modal.apiKey.checkInvalid"), allowUnchecked: false });
        return;
      case "rejected":
        setCheckFailure({
          key,
          message: result.message
            ? t("modal.apiKey.checkRejectedDetail", { message: result.message })
            : t("modal.apiKey.checkRejected"),
          allowUnchecked: false,
        });
        return;
      case "unreachable":
        setCheckFailure({ key, message: t("modal.apiKey.checkUnreachable"), allowUnchecked: true });
        return;
    }
  };

  // The ids the field's description points at: the length hint and the check result.
  const describedBy =
    [showTooShortHint ? "apikey-too-short" : "", activeFailure ? "apikey-check-result" : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apikey-modal-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Key className="w-8 h-8 text-red-500" />
            </div>
            <h2
              id="apikey-modal-title"
              className="text-2xl font-bold text-slate-900 dark:text-white"
            >
              {t("modal.apiKey.title")}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">{t("modal.apiKey.description")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2"
              >
                {t("modal.apiKey.fieldLabel")}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  id="apiKey"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  readOnly={isChecking}
                  placeholder="AIzaSy..."
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all font-mono text-sm"
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  aria-invalid={
                    showTooShortHint || (activeFailure !== null && !activeFailure.allowUnchecked)
                  }
                  aria-describedby={describedBy}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? t("modal.apiKey.hideKey") : t("modal.apiKey.showKey")}
                  aria-pressed={showKey}
                  title={showKey ? t("modal.apiKey.hideKey") : t("modal.apiKey.showKey")}
                  // slate-400 on the slate-50 field is 2.5:1 — under the 3:1 WCAG
                  // 1.4.11 asks of a control's own graphic. The 400 shade stays
                  // for dark mode, where the field is slate-950.
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {showTooShortHint && (
                <p
                  id="apikey-too-short"
                  role="alert"
                  // amber-600 on the white panel is 3.2:1, under WCAG 1.4.3's
                  // 4.5:1 for this 12px text — the one line saying why Save is
                  // disabled. amber-700 is 5.1:1; dark mode keeps amber-400.
                  className="mt-2 text-xs text-amber-700 dark:text-amber-400"
                >
                  {t("modal.apiKey.tooShort")}
                </p>
              )}
              {activeFailure && (
                <p
                  id="apikey-check-result"
                  role="alert"
                  // Red for a key YouTube refused; amber for "could not check",
                  // where nothing is known to be wrong — the same reading as the
                  // length hint above. Shades as there (WCAG 1.4.3).
                  className={`mt-2 text-xs break-words ${
                    activeFailure.allowUnchecked
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-red-700 dark:text-red-400"
                  }`}
                >
                  {activeFailure.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isKeyLongEnough || isChecking}
              aria-busy={isChecking}
              className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="w-5 h-5" aria-hidden="true" />
              )}
              {isChecking
                ? t("modal.apiKey.checking")
                : activeFailure?.allowUnchecked
                  ? t("modal.apiKey.saveAnyway")
                  : t("modal.apiKey.save")}
            </button>

            {/* The pointer counterpart of the Escape handler above — a keyboard
                escape alone is not a visible affordance, and "modal.apiKey.cancel"
                has shipped in both bundles all along with nothing rendering it.
                type="button" so it never submits the form it sits in. */}
            {onClose && (
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t("modal.apiKey.cancel")}
              </button>
            )}
          </form>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              aria-expanded={showHelp}
              className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 text-sm hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors mx-auto"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{t("modal.apiKey.helpToggle")}</span>
            </button>

            {showHelp && (
              <div className="mt-4 text-xs text-slate-600 dark:text-slate-300 space-y-3 bg-slate-100/50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {t("modal.apiKey.quotaTitle")}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {t("modal.apiKey.quotaInfo")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-slate-700 dark:text-slate-200">
                    {t("modal.apiKey.stepsTitle")}
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-500 dark:text-slate-400">
                    <li>
                      {/* Light shades only: indigo-500 on this slate-100/50 panel
                          is 4.4:1 and the old hover:text-indigo-400 3.0:1, both
                          under the 4.5:1 WCAG 1.4.3 asks of this 12px link. Now
                          6.2:1 at rest and 7.7:1 on hover. The dark:hover pin keeps
                          dark mode at indigo-400 as before, so the light hover
                          shade can never reach the dark panel. */}
                      <a
                        href="https://console.cloud.google.com/marketplace/product/google/youtube.googleapis.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-500/30 hover:text-indigo-700 dark:hover:text-indigo-400 inline-flex items-center gap-1"
                      >
                        {t("modal.apiKey.step1")}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>{t("modal.apiKey.step2")}</li>
                    <li>{t("modal.apiKey.step3")}</li>
                    <li>{t("modal.apiKey.step4")}</li>
                    <li>{t("modal.apiKey.step5")}</li>
                  </ol>
                </div>

                {/* The key-format hint is content, not decoration: slate-400 /
                    slate-500 measured 2.5:1 light and 4.0:1 dark on this panel,
                    failing WCAG 1.4.3 in both themes. The swapped pair is the
                    one the steps list above already uses (4.6:1 / 7.3:1). */}
                <div className="pt-2 text-slate-500 dark:text-slate-400 text-[10px]">
                  {t("modal.apiKey.keyFormat")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
