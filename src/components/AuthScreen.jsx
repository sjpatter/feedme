import { useState } from "react";
import { C, FONT, INPUT_STYLE } from "../styles/tokens";
import { Btn, AppLogo, ErrorBanner } from "./shared";

export function AuthScreen({ onSignIn, onSignUp, showToast }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "signin") {
        await onSignIn(email.trim(), password);
      } else {
        const result = await onSignUp(email.trim(), password);
        // If no session was returned, email confirmation is required
        if (!result?.session) {
          setConfirmSent(true);
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  if (confirmSent) {
    return (
      <div style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <AppLogo />
          <div style={{ marginTop: "2rem", background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: "2rem" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📬</p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Check your email</h2>
            <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to sign in.
            </p>
            <button onClick={() => { setConfirmSent(false); setMode("signin"); }} style={{ marginTop: "1.5rem", background: "none", border: "none", cursor: "pointer", color: C.primary, fontSize: 14, fontWeight: 700, fontFamily: FONT }}>
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ marginBottom: "2rem" }}>
          <AppLogo />
          <p style={{ fontSize: 14, color: C.textTertiary, margin: "10px 0 0", fontWeight: 400 }}>
            Your household's meal planner
          </p>
        </div>

        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 16, padding: "1.5rem" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: "1.5rem", background: C.bg, borderRadius: 10, padding: 4 }}>
            {[["signin", "Sign in"], ["signup", "Create account"]].map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                style={{ flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer", border: "none", background: mode === m ? C.surface : "transparent", color: mode === m ? C.text : C.textTertiary, fontSize: 13, fontWeight: mode === m ? 700 : 500, fontFamily: FONT, boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500, fontFamily: FONT }}>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={Object.assign({}, INPUT_STYLE, { marginTop: 5 })}
              />
            </label>
            <label style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500, fontFamily: FONT }}>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                required
                minLength={6}
                style={Object.assign({}, INPUT_STYLE, { marginTop: 5 })}
              />
            </label>

            <ErrorBanner message={error} />

            <div style={{ marginTop: 4 }}>
              <Btn fullWidth variant="primary" disabled={loading}>
                {loading ? (mode === "signin" ? "Signing in..." : "Creating account...") : (mode === "signin" ? "Sign in" : "Create account")}
              </Btn>
            </div>
          </form>

          {mode === "signin" && (
            <p style={{ fontSize: 12, color: C.textTertiary, textAlign: "center", margin: "1rem 0 0", fontFamily: FONT, lineHeight: 1.5 }}>
              Share your email and password with your partner — you'll share one household account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
