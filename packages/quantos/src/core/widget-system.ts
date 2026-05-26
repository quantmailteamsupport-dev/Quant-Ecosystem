// ============================================================================
// QuantOS - Widget System
// ============================================================================

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Widget, WidgetConfig, WidgetRegistrationConfig, WidgetLayoutConfig } from '../types';

// ============================================================================
// Validation Schemas
// ============================================================================

export const RegisterWidgetSchema = z.object({
  type: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  size: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  refreshInterval: z.number().nonnegative().optional(),
});

export const UpdateWidgetDataSchema = z.object({
  widgetId: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

// ============================================================================
// WidgetSystem Class
// ============================================================================

export class WidgetSystem {
  private widgets: Map<string, Widget> = new Map();

  registerWidget(config: WidgetRegistrationConfig): Widget {
    const validated = RegisterWidgetSchema.parse(config);

    const widget: Widget = {
      id: randomUUID(),
      type: validated.type,
      position: validated.position ?? { x: 0, y: 0 },
      size: validated.size ?? { width: 200, height: 200 },
      config: (validated.config as WidgetConfig) ?? {},
      data: {},
      refreshInterval: validated.refreshInterval ?? 0,
      createdAt: Date.now(),
    };

    this.widgets.set(widget.id, widget);
    return widget;
  }

  removeWidget(widgetId: string): void {
    if (!this.widgets.has(widgetId)) {
      throw new Error(`Widget not found: ${widgetId}`);
    }
    this.widgets.delete(widgetId);
  }

  updateWidgetData(widgetId: string, data: Record<string, unknown>): Widget {
    UpdateWidgetDataSchema.parse({ widgetId, data });

    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    widget.data = { ...widget.data, ...data };
    return widget;
  }

  getWidgets(): Widget[] {
    return Array.from(this.widgets.values());
  }

  configureWidget(widgetId: string, config: WidgetConfig): Widget {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    widget.config = { ...widget.config, ...config };
    return widget;
  }

  layoutWidgets(layoutConfig: WidgetLayoutConfig): Widget[] {
    const allWidgets = Array.from(this.widgets.values());
    if (allWidgets.length === 0) return [];

    const count = allWidgets.length;
    const gap = layoutConfig.gap ?? 10;

    if (layoutConfig.layout === 'horizontal') {
      let x = 0;
      allWidgets.forEach((widget) => {
        widget.position = { x, y: 0 };
        x += widget.size.width + gap;
      });
    } else if (layoutConfig.layout === 'vertical') {
      let y = 0;
      allWidgets.forEach((widget) => {
        widget.position = { x: 0, y };
        y += widget.size.height + gap;
      });
    } else if (layoutConfig.layout === 'grid') {
      const cols = layoutConfig.columns ?? Math.ceil(Math.sqrt(count));
      allWidgets.forEach((widget, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        widget.position = {
          x: col * (widget.size.width + gap),
          y: row * (widget.size.height + gap),
        };
      });
    } else if (layoutConfig.layout === 'stacked') {
      allWidgets.forEach((widget) => {
        widget.position = { x: 0, y: 0 };
      });
    }

    return allWidgets;
  }
}
