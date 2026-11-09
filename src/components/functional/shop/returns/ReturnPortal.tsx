"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useMessages } from "@/core/locale/client";
import { fetchReturnOverview, postReturnSession } from "@/core/modules/returns/api";
import type { ReturnOverview, ReturnReceipt } from "@/core/modules/returns/types";
import type { ReturnType } from "@/db/generated/enums";
import ReturnLookup from "./ReturnLookup";
import ReturnOverviewView from "./ReturnOverviewView";
import ReturnReceiptView from "./ReturnReceiptView";
import ReturnRequestForm from "./ReturnRequestForm";

type State =
  | { kind: "loading" }
  | { kind: "lookup"; expired: boolean }
  | { kind: "overview"; overview: ReturnOverview }
  | { kind: "form"; overview: ReturnOverview; type: ReturnType }
  | { kind: "done"; overview: ReturnOverview; receipt: ReturnReceipt };

/*
 * /retour in one place. Arriving from the mail, the link's token sits in the URL fragment: it's spent once for a session
 * cookie and removed from the address bar straight away. Without a token, an open session (a reload) shows the order;
 * otherwise the lookup form.
 */
export default function ReturnPortal({ companyEmail }: { companyEmail: string }) {
  const { returns: m } = useMessages();
  const locale = useLocale();
  const [state, setState] = useState<State>({ kind: "loading" });
  const spent = useRef<string | null>(null);

  const showOverview = useCallback(
    () =>
      fetchReturnOverview(locale)
        .then((overview) => setState({ kind: "overview", overview }))
        .catch(() => setState({ kind: "lookup", expired: false })),
    [locale],
  );

  useEffect(() => {
    const openLink = () => {
      const token = new URLSearchParams(window.location.hash.slice(1)).get("t");
      // Each token once: a second run (React's strict mode in development) would spend it again and fail.
      if (!token || token === spent.current) return false;
      spent.current = token;
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setState({ kind: "loading" });
      postReturnSession(token, locale)
        .then((overview) => setState({ kind: "overview", overview }))
        .catch(() => setState({ kind: "lookup", expired: true }));
      return true;
    };
    if (!openLink() && spent.current === null) void showOverview();
    // A link opened while /retour is already open only changes the fragment.
    window.addEventListener("hashchange", openLink);
    return () => window.removeEventListener("hashchange", openLink);
  }, [locale, showOverview]);

  switch (state.kind) {
    case "loading":
      return <div className="h-64 animate-pulse rounded-3xl bg-white" role="status" aria-label={m.session.opening} />;
    case "lookup":
      return <ReturnLookup companyEmail={companyEmail} expired={state.expired} />;
    case "overview":
      return <ReturnOverviewView overview={state.overview} onStart={(type) => setState({ kind: "form", overview: state.overview, type })} />;
    case "form":
      return (
        <ReturnRequestForm
          type={state.type}
          overview={state.overview}
          onBack={() => setState({ kind: "overview", overview: state.overview })}
          onDone={(receipt) => setState({ kind: "done", overview: state.overview, receipt })}
          onSessionLost={() => setState({ kind: "lookup", expired: true })}
        />
      );
    case "done":
      return <ReturnReceiptView receipt={state.receipt} onBack={() => void showOverview()} />;
  }
}
