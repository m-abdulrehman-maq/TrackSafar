import { useState } from "react";
import { useAuth } from "../auth";
export const PASSWORD_RULE = "At least 8 characters.";
export function useRegisterPageController() {
  const { register, profile, authConfig, initializing } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const update = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
    }));
  const validate = () => {
    const next = {};
    if (form.full_name.trim().length < 2)
      next.full_name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      next.email = "Enter a valid email address.";
    if (form.password.length < 8)
      next.password = `Password must be ${PASSWORD_RULE}`;
    if (form.password !== form.confirm)
      next.confirm = "Passwords do not match.";
    if (!acceptTerms)
      next.terms = "You must accept the terms and privacy notice.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        accept_terms: true,
      });
      setSuccess(
        "Your passenger account has been created. You can now sign in — if email verification is enabled for this environment, confirm your inbox first.",
      );
      setForm((f) => ({
        ...f,
        password: "",
        confirm: "",
      }));
    } catch (err) {
      if (err.status === 409) {
        setFormError(
          "An account with this email already exists. Try signing in instead.",
        );
        setErrors((n) => ({
          ...n,
          email: "Already registered.",
        }));
      } else {
        setFormError(err.message || "Registration failed. Please retry.");
      }
    } finally {
      setSubmitting(false);
    }
  };
  return {
    register,
    profile,
    initializing,
    form,
    setForm,
    acceptTerms,
    setAcceptTerms,
    showPassword,
    setShowPassword,
    errors,
    setErrors,
    formError,
    setFormError,
    success,
    setSuccess,
    submitting,
    setSubmitting,
    update,
    validate,
    onSubmit,
  };
}
