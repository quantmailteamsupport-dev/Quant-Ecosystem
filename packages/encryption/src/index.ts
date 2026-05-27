export type {
  E2EEConfig,
  EncryptionAlgorithm,
  KeyPair,
  EncryptedPayload,
  KeyRotationPolicy,
  DeviceKey,
  PreKeyBundle,
  SessionState,
  RatchetState,
} from './types.js';

export { E2EEManager, createE2EEManager } from './e2ee.js';

export { KeyExchange, createKeyExchange } from './key-exchange.js';
