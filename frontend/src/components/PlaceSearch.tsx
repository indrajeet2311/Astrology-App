import { useEffect, useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { errorMessage, searchPlaces } from '../api';
import type { Place } from '../types';

interface Props {
  selected: Place | null;
  onSelect: (place: Place | null) => void;
}

const MIN_QUERY = 3;

export function PlaceSearch({ selected, onSelect }: Props) {
  const listId = useId();
  const [text, setText] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const query = text.trim();
    if (selected || query.length < MIN_QUERY) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      setError('');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const found = await searchPlaces(query, controller.signal);
        setResults(found);
        setSearched(true);
        setActive(-1);
        setOpen(true);
      } catch (e) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(errorMessage(e, 'Place search failed.'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [text, selected]);

  const choose = (place: Place) => {
    onSelect(place);
    setOpen(false);
    setText('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (selected) {
    return (
      <div className="place-selected">
        <MapPin size={18} aria-hidden />
        <div>
          <strong>{selected.placeName}</strong>
          <small>
            {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)} · {selected.timeZone}
          </small>
        </div>
        <button type="button" className="icon-button" onClick={() => onSelect(null)} aria-label="Change birthplace">
          <X size={16} />
        </button>
      </div>
    );
  }

  const showList = open && results.length > 0;

  return (
    <div className="place-search">
      <div className="input-with-icon">
        <Search size={17} aria-hidden />
        <input
          id="birthplace"
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          value={text}
          placeholder="Start typing a city, e.g. Varanasi"
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {loading && <Loader2 className="spin" size={17} aria-label="Searching" />}
      </div>

      {showList && (
        <ul id={listId} role="listbox" className="place-list">
          {results.map((p, i) => (
            <li
              key={`${p.latitude},${p.longitude},${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <MapPin size={15} aria-hidden />
              <span>
                {p.placeName}
                <small>
                  {p.latitude.toFixed(2)}, {p.longitude.toFixed(2)} · {p.timeZone}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && searched && results.length === 0 && (
        <p className="hint">No places found. Try a different spelling or a nearby larger city.</p>
      )}
      {error && <p className="hint hint-error" role="alert">{error}</p>}
      {!error && text.trim().length > 0 && text.trim().length < MIN_QUERY && (
        <p className="hint">Type at least {MIN_QUERY} characters.</p>
      )}
    </div>
  );
}
