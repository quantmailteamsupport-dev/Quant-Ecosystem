import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface Appointment {
  id: string;
  userId: string;
  providerId: string;
  dateTime: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  type: string;
  createdAt: Date;
}

export interface ConsultationSession {
  id: string;
  appointmentId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: 'active' | 'ended';
  roomUrl: string;
}

export interface Prescription {
  id: string;
  userId: string;
  appointmentId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribedAt: Date;
  prescribedBy: string;
}

export interface HealthRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  uploadedAt: Date;
}

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  location: string;
  rating: number;
  available: boolean;
}

export interface ConsultationNotes {
  appointmentId: string;
  providerId: string;
  diagnosis: string;
  notes: string;
  followUp: string | null;
  createdAt: Date;
}

export const BookAppointmentSchema = z.object({
  providerId: z.string().min(1),
  dateTime: z.string().min(1),
  type: z.string().optional().default('general'),
});

export type BookAppointmentInput = z.infer<typeof BookAppointmentSchema>;

export const UploadHealthRecordSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
});

export type UploadHealthRecordInput = z.infer<typeof UploadHealthRecordSchema>;

const PROVIDERS: Provider[] = [
  {
    id: 'prov-1',
    name: 'Dr. Smith',
    specialty: 'general',
    location: 'New York',
    rating: 4.8,
    available: true,
  },
  {
    id: 'prov-2',
    name: 'Dr. Johnson',
    specialty: 'cardiology',
    location: 'Los Angeles',
    rating: 4.9,
    available: true,
  },
  {
    id: 'prov-3',
    name: 'Dr. Williams',
    specialty: 'dermatology',
    location: 'Chicago',
    rating: 4.7,
    available: false,
  },
  {
    id: 'prov-4',
    name: 'Dr. Brown',
    specialty: 'general',
    location: 'Houston',
    rating: 4.6,
    available: true,
  },
  {
    id: 'prov-5',
    name: 'Dr. Davis',
    specialty: 'nutrition',
    location: 'New York',
    rating: 4.5,
    available: true,
  },
];

export class TelemedicineService {
  private readonly appointments = new Map<string, Appointment>();
  private readonly consultations = new Map<string, ConsultationSession>();
  private readonly prescriptions = new Map<string, Prescription[]>();
  private readonly healthRecords = new Map<string, HealthRecord[]>();
  private readonly consultationNotes = new Map<string, ConsultationNotes>();

  bookAppointment(userId: string, providerId: string, dateTime: string): Appointment {
    BookAppointmentSchema.parse({ providerId, dateTime });

    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
      throw createAppError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
    }

    if (!provider.available) {
      throw createAppError('Provider is not available', 400, 'PROVIDER_UNAVAILABLE');
    }

    const appointment: Appointment = {
      id: randomUUID(),
      userId,
      providerId,
      dateTime: new Date(dateTime),
      status: 'scheduled',
      type: 'general',
      createdAt: new Date(),
    };

    this.appointments.set(appointment.id, appointment);
    return appointment;
  }

  cancelAppointment(appointmentId: string): void {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment) {
      throw createAppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    if (appointment.status === 'cancelled') {
      throw createAppError('Appointment already cancelled', 400, 'ALREADY_CANCELLED');
    }

    if (appointment.status === 'completed') {
      throw createAppError('Cannot cancel completed appointment', 400, 'CANNOT_CANCEL_COMPLETED');
    }

    appointment.status = 'cancelled';
  }

  getAppointments(userId: string): Appointment[] {
    const results: Appointment[] = [];
    for (const appointment of this.appointments.values()) {
      if (appointment.userId === userId) {
        results.push(appointment);
      }
    }
    return results;
  }

  joinConsultation(appointmentId: string): ConsultationSession {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment) {
      throw createAppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    if (appointment.status === 'cancelled') {
      throw createAppError('Appointment is cancelled', 400, 'APPOINTMENT_CANCELLED');
    }

    appointment.status = 'in_progress';

    const session: ConsultationSession = {
      id: randomUUID(),
      appointmentId,
      startedAt: new Date(),
      endedAt: null,
      status: 'active',
      roomUrl: `https://meet.quanthealth.io/${randomUUID()}`,
    };

    this.consultations.set(appointmentId, session);
    return session;
  }

  getPrescriptions(userId: string): Prescription[] {
    return this.prescriptions.get(userId) ?? [];
  }

  uploadHealthRecord(userId: string, record: UploadHealthRecordInput): HealthRecord {
    const parsed = UploadHealthRecordSchema.parse(record);

    const healthRecord: HealthRecord = {
      id: randomUUID(),
      userId,
      type: parsed.type,
      title: parsed.title,
      content: parsed.content,
      uploadedAt: new Date(),
    };

    const existing = this.healthRecords.get(userId) ?? [];
    existing.push(healthRecord);
    this.healthRecords.set(userId, existing);

    return healthRecord;
  }

  getProviders(specialty?: string, location?: string): Provider[] {
    let results = [...PROVIDERS];

    if (specialty) {
      results = results.filter((p) => p.specialty === specialty);
    }

    if (location) {
      results = results.filter((p) => p.location.toLowerCase().includes(location.toLowerCase()));
    }

    return results;
  }

  getConsultationNotes(appointmentId: string): ConsultationNotes {
    const notes = this.consultationNotes.get(appointmentId);
    if (!notes) {
      throw createAppError('Consultation notes not found', 404, 'NOTES_NOT_FOUND');
    }
    return notes;
  }
}
