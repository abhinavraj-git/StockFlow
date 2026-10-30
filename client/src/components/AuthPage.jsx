import { useState } from "react";

function AuthPage({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    setMessage(null);
    setIsLoading(true);

    const endpoint = isRegistering ? "register" : "login";
    const startTime = Date.now();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      // Ensure at least 600ms elapsed so the user clearly sees the rotating
      // spinner and loading state instead of an instant 10ms flash on localhost.
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Authentication failed.");
      }

      if (isRegistering) {
        setMessage({
          text: "Account created successfully. Please sign in.",
          type: "success",
        });
        setIsRegistering(false);
        setForm({
          name: "",
          email: form.email,
          password: "",
        });
        return;
      }

      onLogin(data);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
      }

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        setMessage({
          text: "Cannot connect to backend server. Please verify that the server is running on http://localhost:5050",
          type: "error",
        });
      } else {
        setMessage({
          text: error.message || "Something went wrong.",
          type: "error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-live="polite">
        {isLoading && (
          <div
            className="auth-progress-bar"
            role="progressbar"
            aria-label="Authorizing"
          />
        )}
        <p className="label">INVENTORY MANAGEMENT</p>
        <h1>StockFlow</h1>
        <p>{isRegistering ? "Create your account." : "Welcome back."}</p>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          aria-busy={isLoading}
        >
          {isRegistering && (
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
              disabled={isLoading}
              required
            />
          )}

          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email address"
            disabled={isLoading}
            required
          />

          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            minLength="6"
            disabled={isLoading}
            required
          />

          <button
            type="submit"
            className={`auth-submit-btn ${isLoading ? "is-loading" : ""}`}
            disabled={isLoading}
          >
            {isLoading && (
              <svg
                className="auth-spinner"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeOpacity="0.25"
                />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
            <span>
              {isLoading
                ? isRegistering
                  ? "Creating account..."
                  : "Signing in..."
                : isRegistering
                ? "Create Account"
                : "Sign In"}
            </span>
          </button>
        </form>

        {message && (
          <div
            className={`auth-message ${message.type}`}
            role={message.type === "error" ? "alert" : "status"}
          >
            <span className="auth-message-icon" aria-hidden="true">
              {message.type === "error" ? "⚠" : "✓"}
            </span>
            <span>{message.text}</span>
          </div>
        )}

        <button
          type="button"
          className="auth-switch"
          disabled={isLoading}
          onClick={() => {
            setIsRegistering(!isRegistering);
            setMessage(null);
          }}
        >
          {isRegistering
            ? "Already have an account? Sign in"
            : "Need an account? Create one"}
        </button>
      </section>
    </main>
  );
}

export default AuthPage;