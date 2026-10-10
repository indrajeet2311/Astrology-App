import { useState } from 'react';
import { Send } from 'lucide-react';
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

const EMPTY: RequestFields = {
  name: '', email: '', phone: '', contactMethod: 'email', topic: '', question: '',
  availability: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', shareBirthDetails: true, website: '',
};

export function ConsultationRequestForm({ chart }: { chart: Chart }) {
  const [fields, setFields] = useState(EMPTY);

  const mailDetails = [
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    `Phone: ${fields.phone || 'Not provided'}`,
    `Preferred contact: ${fields.contactMethod}`,
    `Guidance area: ${fields.topic || 'Not selected'}`,
    `Timezone: ${fields.timezone}`,
    `Availability: ${fields.availability || 'To be arranged'}`,
    '',
    'Question / context:',
    fields.question,
    ...(fields.shareBirthDetails ? ['', `Birth chart: ${chart.birthDetails.date} ${chart.birthDetails.localTime}, ${chart.birthDetails.placeName}`] : []),
  ].join('\n');
  const mailtoHref = `mailto:ibtnextgen@gmail.com?subject=${encodeURIComponent(`Private consultation request: ${fields.topic || 'Consultation'}`)}&body=${encodeURIComponent(mailDetails)}`;

  const update = <K extends keyof RequestFields>(key: K, value: RequestFields[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.location.href = mailtoHref;
  };

  return (
    <section className="card consultation-request">
      <h2>Request a private consultation</h2>
      <p className="muted small">Submit to open a prefilled email to ibtnextgen@gmail.com. Review the draft and press Send in your email app.</p>
      <form className="consultation-form" onSubmit={submit}>
        <label className="consultation-trap" aria-hidden="true">
          Website
          <input tabIndex={-1} autoComplete="off" value={fields.website} onChange={(event) => update('website', event.target.value)} />
        </label>
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
        <button type="submit" className="button-primary consultation-wide">
          <Send size={16} />
          Open prefilled email
        </button>
      </form>
    </section>
  );
}
