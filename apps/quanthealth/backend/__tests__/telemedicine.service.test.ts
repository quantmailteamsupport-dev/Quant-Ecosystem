import { describe, it, expect, beforeEach } from 'vitest';
import { TelemedicineService } from '../services/telemedicine.service';

describe('TelemedicineService', () => {
  let service: TelemedicineService;

  beforeEach(() => {
    service = new TelemedicineService();
  });

  describe('bookAppointment', () => {
    it('books an appointment with a valid provider', () => {
      const appointment = service.bookAppointment('user-1', 'prov-1', '2025-02-01T10:00:00Z');

      expect(appointment.id).toBeDefined();
      expect(appointment.userId).toBe('user-1');
      expect(appointment.providerId).toBe('prov-1');
      expect(appointment.status).toBe('scheduled');
      expect(appointment.dateTime).toBeInstanceOf(Date);
      expect(appointment.createdAt).toBeInstanceOf(Date);
    });

    it('throws for non-existent provider', () => {
      expect(() =>
        service.bookAppointment('user-1', 'fake-provider', '2025-02-01T10:00:00Z'),
      ).toThrow('Provider not found');
    });

    it('throws for unavailable provider', () => {
      expect(() => service.bookAppointment('user-1', 'prov-3', '2025-02-01T10:00:00Z')).toThrow(
        'Provider is not available',
      );
    });

    it('creates unique appointment ids', () => {
      const a1 = service.bookAppointment('user-1', 'prov-1', '2025-02-01T10:00:00Z');
      const a2 = service.bookAppointment('user-1', 'prov-2', '2025-02-02T10:00:00Z');

      expect(a1.id).not.toBe(a2.id);
    });
  });

  describe('cancelAppointment', () => {
    it('cancels a scheduled appointment', () => {
      const appointment = service.bookAppointment('user-1', 'prov-1', '2025-02-01T10:00:00Z');
      service.cancelAppointment(appointment.id);

      const appointments = service.getAppointments('user-1');
      expect(appointments[0]!.status).toBe('cancelled');
    });

    it('throws for non-existent appointment', () => {
      expect(() => service.cancelAppointment('fake-id')).toThrow('Appointment not found');
    });

    it('throws when cancelling already cancelled appointment', () => {
      const appointment = service.bookAppointment('user-1', 'prov-1', '2025-02-01T10:00:00Z');
      service.cancelAppointment(appointment.id);

      expect(() => service.cancelAppointment(appointment.id)).toThrow(
        'Appointment already cancelled',
      );
    });
  });

  describe('getAppointments', () => {
    it('returns all appointments for a user', () => {
      service.bookAppointment('user-1', 'prov-1', '2025-02-01T10:00:00Z');
      service.bookAppointment('user-1', 'prov-2', '2025-02-02T10:00:00Z');
      service.bookAppointment('user-2', 'prov-1', '2025-02-03T10:00:00Z');

      const appointments = service.getAppointments('user-1');
      expect(appointments).toHaveLength(2);
    });

    it('returns empty array for user with no appointments', () => {
      const appointments = service.getAppointments('user-999');
      expect(appointments).toHaveLength(0);
    });
  });

  describe('joinConsultation', () => {
    it('creates a consultation session for a scheduled appointment', () => {
      const appointment = service.bookAppointment('user-1', 'prov-1', '2025-02-01T10:00:00Z');
      const session = service.joinConsultation(appointment.id);

      expect(session.id).toBeDefined();
      expect(session.appointmentId).toBe(appointment.id);
      expect(session.status).toBe('active');
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.roomUrl).toBeDefined();
    });

    it('throws for non-existent appointment', () => {
      expect(() => service.joinConsultation('fake-id')).toThrow('Appointment not found');
    });

    it('throws for cancelled appointment', () => {
      const appointment = service.bookAppointment('user-1', 'prov-1', '2025-02-01T10:00:00Z');
      service.cancelAppointment(appointment.id);

      expect(() => service.joinConsultation(appointment.id)).toThrow('Appointment is cancelled');
    });

    it('changes appointment status to in_progress', () => {
      const appointment = service.bookAppointment('user-1', 'prov-1', '2025-02-01T10:00:00Z');
      service.joinConsultation(appointment.id);

      const appointments = service.getAppointments('user-1');
      expect(appointments[0]!.status).toBe('in_progress');
    });
  });

  describe('getPrescriptions', () => {
    it('returns empty array when no prescriptions exist', () => {
      const prescriptions = service.getPrescriptions('user-1');
      expect(prescriptions).toHaveLength(0);
    });
  });

  describe('uploadHealthRecord', () => {
    it('uploads a health record', () => {
      const record = service.uploadHealthRecord('user-1', {
        type: 'lab_result',
        title: 'Blood Work',
        content: 'All values normal',
      });

      expect(record.id).toBeDefined();
      expect(record.userId).toBe('user-1');
      expect(record.type).toBe('lab_result');
      expect(record.title).toBe('Blood Work');
      expect(record.uploadedAt).toBeInstanceOf(Date);
    });

    it('throws on invalid data', () => {
      expect(() =>
        service.uploadHealthRecord('user-1', { type: '', title: 'Test', content: 'Data' }),
      ).toThrow();
    });
  });

  describe('getProviders', () => {
    it('returns all providers when no filters specified', () => {
      const providers = service.getProviders();
      expect(providers.length).toBeGreaterThan(0);
    });

    it('filters by specialty', () => {
      const providers = service.getProviders('cardiology');
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.every((p) => p.specialty === 'cardiology')).toBe(true);
    });

    it('filters by location', () => {
      const providers = service.getProviders(undefined, 'new york');
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.every((p) => p.location.toLowerCase().includes('new york'))).toBe(true);
    });

    it('combines specialty and location filters', () => {
      const providers = service.getProviders('general', 'new york');
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.every((p) => p.specialty === 'general')).toBe(true);
    });
  });

  describe('getConsultationNotes', () => {
    it('throws when notes do not exist', () => {
      expect(() => service.getConsultationNotes('fake-appointment')).toThrow(
        'Consultation notes not found',
      );
    });
  });
});
