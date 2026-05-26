import * as Y from 'yjs';

export class YjsServer {
  private readonly docs: Map<string, Y.Doc> = new Map();
  private readonly connections: Map<string, Set<string>> = new Map();

  getOrCreateDoc(docId: string): Y.Doc {
    let doc = this.docs.get(docId);
    if (!doc) {
      doc = new Y.Doc();
      this.docs.set(docId, doc);
    }
    return doc;
  }

  applyUpdate(docId: string, update: Uint8Array): void {
    const doc = this.getOrCreateDoc(docId);
    Y.applyUpdate(doc, update);
  }

  getStateVector(docId: string): Uint8Array {
    const doc = this.getOrCreateDoc(docId);
    return Y.encodeStateVector(doc);
  }

  encodeState(docId: string): Uint8Array {
    const doc = this.getOrCreateDoc(docId);
    return Y.encodeStateAsUpdate(doc);
  }

  handleConnection(docId: string, clientId: string): void {
    let clients = this.connections.get(docId);
    if (!clients) {
      clients = new Set();
      this.connections.set(docId, clients);
    }
    clients.add(clientId);
  }

  removeConnection(docId: string, clientId: string): void {
    const clients = this.connections.get(docId);
    if (clients) {
      clients.delete(clientId);
      if (clients.size === 0) {
        this.connections.delete(docId);
      }
    }
  }

  getConnectedClients(docId: string): string[] {
    const clients = this.connections.get(docId);
    return clients ? Array.from(clients) : [];
  }
}
