import type { PassengerLocation } from "../../controllers/usePassengerLocation";
import type { PassengerAuth } from "../../models/passenger";
import type { FormEvent } from "react";
import { usePassengerAccountController } from "../../controllers/passenger/PassengerAccount";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  Info,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  UserRound,
} from "lucide-react";
import { initials } from "../../models/passenger";
import { permissionLabels } from "../../controllers/usePassengerLocation";
import { PassengerModal } from "./PassengerUi";
export function PassengerAccount({
  auth,
  location,
}: {
  auth: PassengerAuth;
  location: PassengerLocation;
}) {
  const {
    profile,
    panel,
    setPanel,
    name,
    setName,
    saving,
    error,
    setError,
    message,
    setMessage,
    saveProfile,
    signOut,
    title,
  } = usePassengerAccountController({
    auth,
    location,
  });
  if (!profile) return null;
  return (
    <main className="ps-account">
      <header className="ps-account-header">
        <Link
          to="/passenger"
          className="ps-icon-button"
          aria-label="Back to home"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </Link>
        <h1>Account &amp; preferences</h1>
        <span aria-hidden="true" />
      </header>
      <div className="ps-account-content">
        <section className="ps-profile-card" aria-label="Your profile">
          <div className="ps-avatar" aria-hidden="true">
            {initials(profile.full_name) || <UserRound size={27} />}
          </div>
          <div className="ps-profile-copy">
            <h2>{profile.full_name || "Your account"}</h2>
            <p>Passenger</p>
          </div>
          <button
            type="button"
            className="ps-edit-button"
            onClick={() => {
              setName(profile.full_name || "");
              setError(null);
              setMessage(null);
              setPanel("edit");
            }}
          >
            <Pencil size={14} aria-hidden="true" />
            Edit profile
          </button>
        </section>
        {message && (
          <p className="ps-success" role="status">
            {message}
          </p>
        )}

        <section
          className="ps-account-section"
          aria-labelledby="ps-profile-heading"
        >
          <h2 id="ps-profile-heading">Profile</h2>
          <dl className="ps-settings-card">
            <div className="ps-info-row">
              <dt>
                <UserRound size={19} aria-hidden="true" />
                Name
              </dt>
              <dd>{profile.full_name || "Not provided"}</dd>
            </div>
            <div className="ps-info-row">
              <dt>
                <Mail size={19} aria-hidden="true" />
                Email
              </dt>
              <dd>{profile.email || "Not provided"}</dd>
            </div>
          </dl>
        </section>
        <section
          className="ps-account-section"
          aria-labelledby="ps-settings-heading"
        >
          <h2 id="ps-settings-heading">Settings</h2>
          <div className="ps-settings-card">
            <button
              type="button"
              className="ps-settings-row"
              onClick={() => setPanel("location")}
            >
              <MapPin size={20} aria-hidden="true" />
              <span>Location permission</span>
              <small>{permissionLabels[location.permission]}</small>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>
        <section
          className="ps-account-section"
          aria-labelledby="ps-support-heading"
        >
          <h2 id="ps-support-heading">Support</h2>
          <div className="ps-settings-card">
            <button
              type="button"
              className="ps-settings-row"
              onClick={() => setPanel("help")}
            >
              <CircleHelp size={20} aria-hidden="true" />
              <span>Help &amp; feedback</span>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ps-settings-row"
              onClick={() => setPanel("about")}
            >
              <Info size={20} aria-hidden="true" />
              <span>About TrackSafar</span>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>
        <button type="button" className="ps-sign-out" onClick={signOut}>
          <LogOut size={20} aria-hidden="true" />
          <span>Sign out</span>
        </button>
        <p className="ps-account-footnote">
          Your next journey, a little easier.
        </p>
      </div>

      {panel && (
        <PassengerModal
          title={title}
          busy={saving}
          onClose={() => setPanel(null)}
        >
          {panel === "edit" ? (
            <form className="ps-dialog-body" onSubmit={saveProfile}>
              <label className="ps-field-label" htmlFor="ps-edit-name">
                Full name
              </label>
              <input
                className="ps-field"
                id="ps-edit-name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={160}
                value={name}
                disabled={saving}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "ps-profile-error" : undefined}
                onChange={(event) => setName(event.target.value)}
              />
              <label className="ps-field-label" htmlFor="ps-edit-email">
                Email
              </label>
              <input
                className="ps-field"
                id="ps-edit-email"
                type="email"
                value={profile.email}
                readOnly
              />
              <p className="ps-inline-note">
                Your sign-in email cannot be changed here.
              </p>
              {error && (
                <p className="ps-notice" id="ps-profile-error" role="alert">
                  {error}
                </p>
              )}
              <div className="ps-dialog-actions">
                <button
                  type="button"
                  className="ps-button"
                  disabled={saving}
                  onClick={() => setPanel(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ps-button ps-button-primary"
                  disabled={saving}
                >
                  {saving && (
                    <LoaderCircle
                      size={16}
                      className="ps-spin"
                      aria-hidden="true"
                    />
                  )}
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          ) : panel === "location" ? (
            <div className="ps-dialog-body">
              <p className="ps-permission-status">
                Browser permission:{" "}
                <strong>{permissionLabels[location.permission]}</strong>
              </p>
              <p>
                Your location is used to find nearby buses when you choose “Use
                my location”. You can search without it.
              </p>
              {location.permission === "denied" && (
                <p>
                  To allow access, open this site's permissions from the address
                  bar in your browser and change Location to Allow.
                </p>
              )}
              {location.error && (
                <p className="ps-notice" role="alert">
                  {location.error}
                </p>
              )}
              {location.position && !location.error && (
                <p className="ps-success" role="status">
                  Your location is ready for nearby search.
                </p>
              )}
              <button
                type="button"
                className="ps-button ps-button-primary"
                onClick={location.locate}
                disabled={
                  location.locating || location.permission === "unsupported"
                }
              >
                {location.locating && (
                  <LoaderCircle
                    size={16}
                    className="ps-spin"
                    aria-hidden="true"
                  />
                )}
                {location.locating
                  ? "Finding your location…"
                  : "Use my location"}
              </button>
            </div>
          ) : panel === "help" ? (
            <div className="ps-dialog-body ps-help">
              <h3>Finding a bus</h3>
              <p>
                Search by bus number, route, destination or stop. Use your
                location to see buses within 1.5 km.
              </p>
              <h3>Why are there no buses?</h3>
              <p>
                Nearby results need an active trip and a recent driver location.
                Try All services or check again during service hours.
              </p>
              <h3>Your account</h3>
              <p>
                Use Edit profile to update your name. Your email is the one used
                to register or create your passenger account.
              </p>
              <h3>Feedback</h3>
              <p>
                Please share feedback with your transport operator or the
                TrackSafar project team. In-app feedback submission is not
                available yet.
              </p>
            </div>
          ) : (
            <div className="ps-dialog-body ps-help">
              <h3>TrackSafar</h3>
              <p>
                A simpler way to explore Lahore's bus network and find buses
                near you.
              </p>
              <p>
                Routes, bus locations and arrival estimates depend on the
                information available. Arrival estimates are not available in
                this version.
              </p>
              <div className="ps-about-links">
                <Link to="/privacy">Privacy notice</Link>
                <Link to="/terms">Terms of use</Link>
              </div>
            </div>
          )}
        </PassengerModal>
      )}
    </main>
  );
}
