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
            {isLoading && <span className="auth-spinner" aria-hidden="true" />}
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