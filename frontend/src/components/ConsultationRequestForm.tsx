import { useState } from 'react';
import { Clipboard, ClipboardCheck, Send } from 'lucide-react';
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
};

const EMPTY: RequestFields = {
  name: '', email: '', phone: '', contactMethod: 'email', topic: '', question: '',
  availability: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', shareBirthDetails: true,
};

export function ConsultationRequestForm({ chart }: { chart: Chart }) {
  const [fields, setFields] = useState(EMPTY);
  const [prepared, setPrepared] = useState('');
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof RequestFields>(key: K, value: RequestFields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
    setPrepared('');
    setCopied(false);
  };

  const requestText = () => [
    'Private astrologer consultation request',
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    `Phone: ${fields.phone || 'Not provided'}`,
    `Preferred contact: ${fields.contactMethod}`,
    `Guidance area: ${fields.topic}`,
    `Question / context: ${fields.question}`,
    `Availability: ${fields.availability || 'To be arranged'}`,
    `Timezone: ${fields.timezone}`,
    fields.shareBirthDetails
      ? `Birth chart: ${chart.birthDetails.date}, ${chart.birthDetails.localTime}, ${chart.birthDetails.placeName}`
      : 'Birth chart details: Not included',
  ].join('\n');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPrepared(requestText());
    setCopied(false);
  };

  const copyRequest = async () => {
    try {
      await navigator.clipboard.writeText(prepared);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="card consultation-request">
      <h2>Request a private consultation</h2>
      <p className="muted small">Share your question and preferred contact details. Your request is not sent from this page; no astrologer booking destination is configured yet.</p>
      <form className="consultation-form" onSubmit={submit}>
        <label className="field">
          <span className="label">Your name</span>
          <input required maxLength={100} value={fields.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" />
        </label>
        <label className="field">
          <span className="label">Email</span>
          <input required type="email" maxLength={254} value={fields.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" />
        </label>
        <label className="field">
          <span className="label">Phone (optional)</span>
          <input type="tel" maxLength={40} value={fields.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" />
        </label>
        <label className="field">
          <span className="label">Preferred contact</span>
          <select value={fields.contactMethod} onChange={(event) => update('contactMethod', event.target.value as RequestFields['contactMethod'])}>
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
          <input required maxLength={80} value={fields.timezone} onChange={(event) => update('timezone', event.target.value)} />
        </label>
        <label className="field consultation-wide">
          <span className="label">What would you like to discuss?</span>
          <textarea required maxLength={2000} rows={5} value={fields.question} onChange={(event) => update('question', event.target.value)} />
        </label>
        <label className="field consultation-wide">
          <span className="label">Preferred days or times (optional)</span>
          <input maxLength={300} value={fields.availability} onChange={(event) => update('availability', event.target.value)} placeholder="For example, weekday evenings" />
        </label>
        <label className="consultation-consent consultation-wide">
          <input type="checkbox" checked={fields.shareBirthDetails} onChange={(event) => update('shareBirthDetails', event.target.checked)} />
          <span>Include this chart's birth date, time and place in the request.</span>
        </label>
        <button type="submit" className="button-primary consultation-wide"><Send size={16} /> Prepare consultation request</button>
      </form>
      {prepared && <div className="consultation-status" role="status">
        <p><strong>Request prepared, not sent.</strong> Configure a booking or contact destination before requests can be delivered.</p>
        <button type="button" className="button-ghost" onClick={() => void copyRequest()}>
          {copied ? <ClipboardCheck size={16} /> : <Clipboard size={16} />}
          {copied ? 'Copied' : 'Copy request details'}
        </button>
      </div>}
    </section>
  );
}