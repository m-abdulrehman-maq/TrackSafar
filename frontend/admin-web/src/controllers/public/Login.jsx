import { redirectForRole } from "../auth";
import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../auth";
export const ROLE_COPY = {
  passenger: {
    title: "Passenger sign in",
    blurb: "Track buses, routes and your own alerts.",
    home: "/register",
    homeLabel: "Create a passenger account",
  },
  driver: {
    title: "Driver sign in",
    blurb: "Sign in to view your assignment and operate trips.",
    home: null,
    homeLabel: null,
  },
  admin: {
    title: "Administrator sign in",
    blurb:
      "Restricted staff portal. Accounts are provisioned by an administrator.",
    home: null,
    homeLabel: null,
  },
};
export const ROLE_PATHS = {
  passenger: "/login/passenger",
  driver: "/login/driver",
  admin: "/login/admin",
};
export function useLoginPageController() {
  const { role } = useParams();
  const location = useLocation();
  const { login, profile, authConfig, authConfigError, initializing } =
    useAuth();
  const activeRole =
    role || new URLSearchParams(location.search).get("role") || "passenger";
  const copy = ROLE_COPY[activeRole] || ROLE_COPY.passenger;
  const passwordLoginBlocked =
    authConfig.auth_mode === "supabase" && !authConfig.password_login_enabled;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const validate = () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    if (activeRole !== "passenger" && !acceptTerms) {
      setFormError(
        "Please acknowledge the acceptable-use notice before signing in.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const me = await login({
        email,
        password,
      });
      if (me.role !== activeRole) {
        setFormError(
          `This account is a ${me.role} account. Redirecting to your ${me.role} dashboard…`,
        );
        setTimeout(() => {
          window.location.href = redirectForRole(me.role);
        }, 700);
        return;
      }
      if (!me.is_active) {
        setFormError("This account is deactivated. Contact an administrator.");
        return;
      }
      window.location.href = redirectForRole(me.role);
    } catch (err) {
      setFormError(err.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };
  return {
    login,
    profile,
    authConfigError,
    initializing,
    activeRole,
    copy,
    passwordLoginBlocked,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    acceptTerms,
    setAcceptTerms,
    errors,
    setErrors,
    formError,
    setFormError,
    submitting,
    setSubmitting,
    validate,
    onSubmit,
  };
}
