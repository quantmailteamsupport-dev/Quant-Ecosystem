import type {
  AmbientContext,
  VoiceFirstConfig,
  NotificationAction,
  ContextTransition,
} from '../types.js';

type FeedbackLevel = 'verbose' | 'terse' | 'silent';
type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export class VoiceFirstMode {
  private cfg: VoiceFirstConfig = { enabled: false, lockScreenActive: false, ambientContext: null };
  private dndEnabled = false;
  private feedbackLevel: FeedbackLevel = 'verbose';
  private notificationRules = new Map<NotificationPriority, 'read' | 'silent' | 'vibrate'>();
  private transitions: ContextTransition[] = [];
  private notifications: NotificationAction[] = [];

  enable(): void {
    this.cfg.enabled = true;
  }
  disable(): void {
    this.cfg.enabled = false;
  }
  isEnabled(): boolean {
    return this.cfg.enabled;
  }

  activateFromLockScreen(): boolean {
    this.cfg.lockScreenActive = true;
    this.cfg.enabled = true;
    return true;
  }

  setAmbientContext(ctx: AmbientContext): void {
    const from = this.cfg.ambientContext;
    this.cfg.ambientContext = ctx;
    this.transitions.push({ from, to: ctx, timestamp: Date.now(), triggeredBy: 'system' });
  }

  getAmbientContext(): AmbientContext | null {
    return this.cfg.ambientContext;
  }

  getContextTransitions(): ContextTransition[] {
    return [...this.transitions];
  }

  routeInteraction(_input: string): 'voice' | 'standard' {
    return this.cfg.enabled ? 'voice' : 'standard';
  }

  setDND(enabled: boolean): void {
    this.dndEnabled = enabled;
  }

  isDNDEnabled(): boolean {
    return this.dndEnabled;
  }

  setFeedbackLevel(level: FeedbackLevel): void {
    this.feedbackLevel = level;
  }

  getFeedbackLevel(): FeedbackLevel {
    return this.feedbackLevel;
  }

  setNotificationRule(priority: NotificationPriority, action: 'read' | 'silent' | 'vibrate'): void {
    this.notificationRules.set(priority, action);
  }

  routeNotification(priority: NotificationPriority): 'read' | 'silent' | 'vibrate' {
    if (this.dndEnabled && priority !== 'critical') return 'silent';
    return this.notificationRules.get(priority) ?? 'read';
  }

  handleNotification(notification: NotificationAction): string {
    this.notifications.push(notification);
    if (this.feedbackLevel === 'silent') return 'suppressed';
    if (this.feedbackLevel === 'terse') return 'ack';
    return `Notification: ${notification.action} - ${notification.payload}`;
  }

  getNotificationHistory(): NotificationAction[] {
    return [...this.notifications];
  }
}
