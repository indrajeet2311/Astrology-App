import { useState, useEffect } from 'react';
import { CheckCircle2, ExternalLink, LoaderCircle, Mail, Send } from 'lucide-react';
import { submitConsultation, AuthUser } from '../api';
import type { Chart } from '../types';

type RequestFields = {
  name: string;
  email: string;
  phone: string;
  contactMethod: 'email' | 'phone';
  topic: string;
  question: string;
  availability: string;
  timezone: string;
  shareBirthDetails: boolean;
  website: string;
};

const ASTROLOGER_EMAIL = 'indrajeetbhattacharya5@gmail.com';

const EMPTY: RequestFields = {
  name: '',
  email: '',
  phone: '',
  contactMethod: 'email',
  topic: '',
  question: '',
  availability: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  shareBirthDetails: true,
  website: '',
};

export function ConsultationRequestForm({ chart, user }: { chart: Chart; user?: AuthUser | null }) {
  const [fields, setFields] = useState<RequestFields>(() => ({
    ...EMPTY,
    name: user?.name || '',
    email: user?.email || '',
  }));
  const [busy, setBusy] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFields((prev) => ({
        ...prev,
        name: prev.name || user.name,
        email: prev.email || user.email,
      }));
    }
  }, [user]);

  const mailtoHref = (referenceId = submittedId) => {
    const mailDetails = [
      `Name: ${fields.name}`,
      `Email: ${fields.email}`,
      `Phone: ${fields.phone || 'Not provided'}`,
      `Preferred contact: ${fields.contactMethod}`,
      `Guidance area: ${fields.topic || 'Consultation'}`,
      `Timezone: ${fields.timezone}`,
      `Availability: ${fields.availability || 'To be arranged'}`,
      ...(referenceId ? [`Reference ID: #${referenceId}`] : []),
      '',
      'Question / context:',
      fields.question,
      ...(fields.shareBirthDetails
        ? ['', `Birth chart: ${chart.birthDetails.date} ${chart.birthDetails.localTime}, ${chart.birthDetails.placeName}`]
        : []),
    ].join('\n');

    return `mailto:${ASTROLOGER_EMAIL}?subject=${encodeURIComponent(
      `Consultation Request: ${fields.topic || 'General'} - ${fields.name}`
    )}&body=${encodeURIComponent(mailDetails)}`;
  };

  const update = <K extends keyof RequestFields>(key: K, value: RequestFields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
    setMessage('');
    setError('');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await submitConsultation({
        ...fields,
        birthDate: chart.birthDetails.date,
        birthTime: chart.birthDetails.localTime,
        birthPlace: chart.birthDetails.placeName,
      });
      setMessage(result.message);
      if (result.id) {
        setSubmittedId(result.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your request could not be sent. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setFields(EMPTY);
    setSubmittedId(null);
    setMessage('');
    setError('');
  };

  return (
    <section className="card consultation-request">
      <h2>Request a private consultation</h2>
      <p className="muted small">
        Share your question for a personalized reading. Submitting emails your request to the astrologer and saves a reference in your account.
      </p>

      {submittedId ? (
        <div className="consultation-success-card">
          <div className="success-icon-wrap">
            <CheckCircle2 size={36} color="#52c41a" />
          </div>
          <h3>Request Sent</h3>
          <p className="success-lead">
            Thank you, <strong>{fields.name}</strong>. Your consultation request was emailed to the astrologer and saved under reference <strong>#{submittedId}</strong>.
          </p>
          <p className="muted small">
            Use the link below if you would also like to send a follow-up email.
          </p>

          <div className="success-actions">
            <a href={mailtoHref()} className="button-ghost" target="_blank" rel="noopener noreferrer">
              <Mail size={16} /> Send a follow-up email ({ASTROLOGER_EMAIL})
            </a>
            <button className="button-ghost" onClick={resetForm}>
              Submit Another Request
            </button>
          </div>
        </div>
      ) : (
        <form className="consultation-form" onSubmit={(event) => void submit(event)}>
          <label className="consultation-trap" aria-hidden="true">
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={fields.website}
              onChange={(event) => update('website', event.target.value)}
            />
          </label>

          <label className="field">
            <span className="label">Your name</span>
            <input
              required
              maxLength={100}
              value={fields.name}
              onChange={(event) => update('name', event.target.value)}
              autoComplete="name"
              placeholder="Full name"
            />
          </label>

          <label className="field">
            <span className="label">Email</span>
            <input
              required
              type="email"
              maxLength={254}
              value={fields.email}
              onChange={(event) => update('email', event.target.value)}
              autoComplete="email"
              placeholder="your.email@example.com"
            />
          </label>

          <label className="field">
            <span className="label">Phone (optional)</span>
            <input
              type="tel"
              maxLength={40}
              value={fields.phone}
              onChange={(event) => update('phone', event.target.value)}
              autoComplete="tel"
              placeholder="+1 ..."
            />
          </label>

          <label className="field">
            <span className="label">Preferred contact</span>
            <select
              value={fields.contactMethod}
              onChange={(event) => update('contactMethod', event.target.value as RequestFields['contactMethod'])}
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Guidance area</span>
            <select required value={fields.topic} onChange={(event) => update('topic', event.target.value)}>
              <option value="">Choose an area</option>
              <option>Marriage and relationships</option>
              <option>Career and work</option>
              <option>Family and home</option>
              <option>Education</option>
              <option>Spiritual growth</option>
              <option>General chart reading</option>
              <option>Other</option>
            </select>
          </label>

          <label className="field">
            <span className="label">Timezone</span>
            <input
              required
              maxLength={80}
              value={fields.timezone}
              onChange={(event) => update('timezone', event.target.value)}
            />
          </label>

          <label className="field consultation-wide">
            <span className="label">What would you like to discuss?</span>
            <textarea
              required
              maxLength={2000}
              rows={5}
              value={fields.question}
              onChange={(event) => update('question', event.target.value)}
              placeholder="Describe your situation, questions, or goals..."
            />
          </label>

          <label className="field consultation-wide">
            <span className="label">Preferred days or times (optional)</span>
            <input
              maxLength={300}
              value={fields.availability}
              onChange={(event) => update('availability', event.target.value)}
              placeholder="For example, weekday evenings"
            />
          </label>

          <label className="consultation-consent consultation-wide">
            <input
              type="checkbox"
              checked={fields.shareBirthDetails}
              onChange={(event) => update('shareBirthDetails', event.target.checked)}
            />
            <span>Include this chart's birth date, time and place in the request.</span>
          </label>

          <p className="muted small consultation-wide">
            Submitting emails your request to {ASTROLOGER_EMAIL} and saves a tracking reference.
          </p>

          <button type="submit" className="button-primary consultation-wide" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
            {busy ? 'Sending…' : 'Send consultation request'}
          </button>

          <p className="muted small consultation-wide">
            You can also{' '}
            <a href={mailtoHref()}>
              email directly to {ASTROLOGER_EMAIL} <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </a>.
          </p>
        </form>
      )}

      {message && !submittedId && <p className="consultation-status" role="status">{message}</p>}
      {error && <p className="consultation-status hint-error" role="alert">{error}</p>}
    </section>
  );
}
