import type {
  SocketApprovalPayload,
  SocketConnectionStatus,
  SocketEventType,
} from '../types/index.ts';

type EventHandler = (data: any) => void;

export class SimulatedSocket {
  public id: string;
  public connected: boolean = true;
  public status: SocketConnectionStatus = 'connected';
  public latency: number = 24; // Simulated ping in ms
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private joinedRooms: Set<string> = new Set(['room:approvals', 'room:notifications']);

  constructor() {
    this.id = `sock_${Math.random().toString(36).substring(2, 9)}`;
  }

  public on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Return cleanup unsubscribe function
    return () => this.off(event, handler);
  }

  public off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit(event: string, data?: any): void {
    if (!this.connected && event !== 'disconnect' && event !== 'connect') return;

    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in socket event handler for "${event}":`, err);
        }
      });
    }

    // Also trigger wildcard or global logger if attached
    const allHandlers = this.listeners.get('*');
    if (allHandlers) {
      allHandlers.forEach((handler) => handler({ event, data }));
    }
  }

  public join(room: string): void {
    this.joinedRooms.add(room);
  }

  public leave(room: string): void {
    this.joinedRooms.delete(room);
  }

  public getRooms(): string[] {
    return Array.from(this.joinedRooms);
  }

  public isSubscribedTo(room: string): boolean {
    return this.joinedRooms.has(room);
  }

  public disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    this.status = 'disconnected';
    this.emit('disconnect', { reason: 'client_manual_disconnect' });
  }

  public connect(): void {
    this.connected = true;
    this.status = 'connected';
    this.latency = Math.floor(18 + Math.random() * 15);
    this.emit('connect', { socketId: this.id });
  }

  /**
   * Helper to dispatch an approval event through the simulated websocket
   */
  public dispatchApprovalEvent(payload: SocketApprovalPayload): void {
    this.emit(payload.event, payload);
    this.emit('approval:event', payload);
  }
}

// Global Singleton Instance
export const globalSocket = new SimulatedSocket();

/**
 * Helper to build a standard simulated Socket.io approval payload
 */
export function createApprovalSocketPayload(
  event: SocketEventType,
  itemType: 'leave' | 'reimbursement',
  itemId: string,
  applicantName: string,
  title: string,
  departmentName: string,
  currentRoleTarget: 'Manajer' | 'HRD' | 'All',
  amountOrDuration: string
): SocketApprovalPayload {
  const stageName =
    currentRoleTarget === 'Manajer'
      ? 'Tahap 1: Persetujuan Manajer'
      : currentRoleTarget === 'HRD'
      ? 'Tahap 2: Persetujuan HRD / Finance'
      : 'Tahap Final';

  return {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    event,
    itemType,
    itemId,
    title,
    applicantName,
    departmentName,
    stageName,
    currentRoleTarget,
    amountOrDuration,
    timestamp: new Date().toISOString(),
    room: 'room:approvals',
  };
}
