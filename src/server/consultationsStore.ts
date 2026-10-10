import fs from 'fs';
import path from 'path';

export interface ConsultationRecord {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone?: string;
  contactMethod: 'email' | 'phone';
  topic: string;
  question: string;
  availability?: string;
  timezone: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  shareBirthDetails: boolean;
  status: 'pending' | 'contacted' | 'completed';
  notes?: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'consultations.json');

function ensureFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to initialize consultations data file:', err);
  }
}

export function getAllConsultations(): ConsultationRecord[] {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read consultations:', err);
    return [];
  }
}

export function saveAllConsultations(records: ConsultationRecord[]): void {
  ensureFile();
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save consultations:', err);
  }
}

export function addConsultation(entry: Omit<ConsultationRecord, 'id' | 'createdAt' | 'status'>): ConsultationRecord {
  const records = getAllConsultations();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = `CR-${dateStr}-${randomSuffix}`;

  const record: ConsultationRecord = {
    ...entry,
    id,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  records.unshift(record);
  saveAllConsultations(records);
  return record;
}

export function updateConsultationStatus(id: string, status: 'pending' | 'contacted' | 'completed', notes?: string): ConsultationRecord | null {
  const records = getAllConsultations();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return null;

  records[index].status = status;
  if (notes !== undefined) {
    records[index].notes = notes;
  }
  saveAllConsultations(records);
  return records[index];
}

export function deleteConsultation(id: string): boolean {
  const records = getAllConsultations();
  const filtered = records.filter((r) => r.id !== id);
  if (filtered.length === records.length) return false;
  saveAllConsultations(filtered);
  return true;
}
