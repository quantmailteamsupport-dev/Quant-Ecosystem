// ============================================================================
// Quant Ecosystem - Testing Framework: Component Tester
// Virtual DOM rendering, event simulation, query utilities, act() wrapper
// ============================================================================

import type { DOMNode, ComponentDefinition, ComponentRenderResult, FireEventConfig } from '../types';

/**
 * Creates a virtual DOM node
 */
function createNode(tag: string, props: Record<string, unknown> = {}, children: (DOMNode | string)[] = []): DOMNode {
  const node: DOMNode = {
    tag,
    props,
    children,
    textContent: '',
    role: props['role'] as string | undefined,
    testId: props['data-testid'] as string | undefined,
    events: new Map(),
    parent: null,
  };
  node.textContent = getTextContent(node);
  for (const child of children) {
    if (typeof child !== 'string') {
      child.parent = node;
    }
  }
  return node;
}

/**
 * Recursively computes textContent from children
 */
function getTextContent(node: DOMNode): string {
  let text = '';
  for (const child of node.children) {
    if (typeof child === 'string') {
      text += child;
    } else {
      text += getTextContent(child);
    }
  }
  return text;
}

/**
 * Collects all nodes in the tree (DFS)
 */
function collectNodes(root: DOMNode): DOMNode[] {
  const nodes: DOMNode[] = [root];
  for (const child of root.children) {
    if (typeof child !== 'string') {
      nodes.push(...collectNodes(child));
    }
  }
  return nodes;
}

/**
 * ComponentTester - Simulates component rendering and interaction
 */
export class ComponentTester {
  private container: DOMNode;
  private mounted: boolean = false;
  private currentComponent: ComponentDefinition | null = null;
  private currentProps: Record<string, unknown> = {};
  private stateUpdates: Function[] = [];
  private cleanupFns: Function[] = [];

  constructor() {
    this.container = createNode('div', { id: 'test-root' });
  }

  /**
   * Renders a component with given props, returns query utilities
   */
  render(component: ComponentDefinition, props: Record<string, unknown> = {}): ComponentRenderResult {
    this.cleanup();
    this.currentComponent = component;
    this.currentProps = props;

    const rendered = component.render(props);
    this.container = createNode('div', { id: 'test-root' }, [rendered]);
    rendered.parent = this.container;
    this.mounted = true;

    // Run effects if defined
    if (component.effects) {
      for (const effect of component.effects) {
        const cleanup = effect();
        if (typeof cleanup === 'function') {
          this.cleanupFns.push(cleanup);
        }
      }
    }

    return this.createResult();
  }

  /**
   * Creates the ComponentRenderResult with all query methods
   */
  private createResult(): ComponentRenderResult {
    const self = this;
    return {
      container: this.container,
      getByText: (text: string) => {
        const node = self.findByText(text);
        if (!node) throw new Error(`Unable to find element with text: "${text}"`);
        return node;
      },
      getByRole: (role: string) => {
        const node = self.findByRole(role);
        if (!node) throw new Error(`Unable to find element with role: "${role}"`);
        return node;
      },
      getByTestId: (testId: string) => {
        const node = self.findByTestId(testId);
        if (!node) throw new Error(`Unable to find element with testId: "${testId}"`);
        return node;
      },
      queryByText: (text: string) => self.findByText(text),
      queryByRole: (role: string) => self.findByRole(role),
      queryByTestId: (testId: string) => self.findByTestId(testId),
      queryAllByText: (text: string) => self.findAllByText(text),
      queryAllByRole: (role: string) => self.findAllByRole(role),
      rerender: (newProps: Record<string, unknown>) => self.rerender(newProps),
      unmount: () => self.unmount(),
      debug: () => self.debugTree(),
    };
  }

  /**
   * Re-renders the component with new props
   */
  rerender(newProps: Record<string, unknown>): void {
    if (!this.currentComponent) {
      throw new Error('No component mounted to rerender');
    }
    this.currentProps = { ...this.currentProps, ...newProps };
    const rendered = this.currentComponent.render(this.currentProps);
    this.container = createNode('div', { id: 'test-root' }, [rendered]);
    rendered.parent = this.container;
  }

  /**
   * Unmounts the component and runs cleanup
   */
  unmount(): void {
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
    this.container = createNode('div', { id: 'test-root' });
    this.mounted = false;
    this.currentComponent = null;
  }

  /**
   * Cleans up the current render
   */
  cleanup(): void {
    if (this.mounted) {
      this.unmount();
    }
  }

  /**
   * Wraps state updates to batch and flush
   */
  act(fn: () => void | Promise<void>): void | Promise<void> {
    const result = fn();
    if (result && typeof result === 'object' && 'then' in result) {
      return (result as Promise<void>).then(() => this.flush());
    }
    this.flush();
  }

  /**
   * Flushes pending state updates and re-renders
   */
  private flush(): void {
    for (const update of this.stateUpdates) {
      update();
    }
    this.stateUpdates = [];
    if (this.currentComponent && this.mounted) {
      const rendered = this.currentComponent.render(this.currentProps);
      this.container = createNode('div', { id: 'test-root' }, [rendered]);
      rendered.parent = this.container;
    }
  }

  /**
   * Waits for a condition to be true (polling)
   */
  async waitFor(callback: () => void, options: { timeout?: number; interval?: number } = {}): Promise<void> {
    const timeout = options.timeout ?? 1000;
    const interval = options.interval ?? 50;
    const startTime = Date.now();

    while (true) {
      try {
        callback();
        return;
      } catch (err) {
        if (Date.now() - startTime >= timeout) {
          throw new Error(`waitFor timed out after ${timeout}ms: ${(err as Error).message}`);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }

  // --- Query Methods ---

  private findByText(text: string): DOMNode | null {
    const nodes = collectNodes(this.container);
    return nodes.find(n => n.textContent.includes(text) || n.children.some(c => typeof c === 'string' && c.includes(text))) ?? null;
  }

  private findAllByText(text: string): DOMNode[] {
    const nodes = collectNodes(this.container);
    return nodes.filter(n => n.textContent.includes(text) || n.children.some(c => typeof c === 'string' && c.includes(text)));
  }

  private findByRole(role: string): DOMNode | null {
    const nodes = collectNodes(this.container);
    return nodes.find(n => n.role === role || n.props['role'] === role) ?? null;
  }

  private findAllByRole(role: string): DOMNode[] {
    const nodes = collectNodes(this.container);
    return nodes.filter(n => n.role === role || n.props['role'] === role);
  }

  private findByTestId(testId: string): DOMNode | null {
    const nodes = collectNodes(this.container);
    return nodes.find(n => n.testId === testId || n.props['data-testid'] === testId) ?? null;
  }

  /**
   * Generates a debug tree representation
   */
  private debugTree(node?: DOMNode, indent: number = 0): string {
    const target = node ?? this.container;
    const pad = '  '.repeat(indent);
    let output = `${pad}<${target.tag}`;

    for (const [key, val] of Object.entries(target.props)) {
      if (key !== 'children') {
        output += ` ${key}="${val}"`;
      }
    }
    output += '>\n';

    for (const child of target.children) {
      if (typeof child === 'string') {
        output += `${pad}  ${child}\n`;
      } else {
        output += this.debugTree(child, indent + 1);
      }
    }

    output += `${pad}</${target.tag}>\n`;
    return output;
  }
}

/**
 * FireEvent - Simulates DOM events on virtual nodes
 */
export const fireEvent = {
  click(node: DOMNode, config?: Partial<FireEventConfig>): void {
    dispatchEvent(node, 'click', config);
  },

  change(node: DOMNode, config?: Partial<FireEventConfig>): void {
    dispatchEvent(node, 'change', config);
  },

  submit(node: DOMNode, config?: Partial<FireEventConfig>): void {
    dispatchEvent(node, 'submit', config);
  },

  keyPress(node: DOMNode, config?: Partial<FireEventConfig> & { key?: string }): void {
    dispatchEvent(node, 'keypress', { ...config, target: { ...config?.target, key: config?.key } });
  },

  focus(node: DOMNode, config?: Partial<FireEventConfig>): void {
    dispatchEvent(node, 'focus', config);
  },

  blur(node: DOMNode, config?: Partial<FireEventConfig>): void {
    dispatchEvent(node, 'blur', config);
  },

  input(node: DOMNode, config?: Partial<FireEventConfig>): void {
    dispatchEvent(node, 'input', config);
  },

  mouseEnter(node: DOMNode, config?: Partial<FireEventConfig>): void {
    dispatchEvent(node, 'mouseenter', config);
  },

  mouseLeave(node: DOMNode, config?: Partial<FireEventConfig>): void {
    dispatchEvent(node, 'mouseleave', config);
  },

  doubleClick(node: DOMNode, config?: Partial<FireEventConfig>): void {
    dispatchEvent(node, 'dblclick', config);
  },
};

/**
 * Internal event dispatch with bubbling simulation
 */
function dispatchEvent(node: DOMNode, eventName: string, config?: Partial<FireEventConfig>): void {
  const handlers = node.events.get(eventName);
  if (handlers) {
    const event = {
      type: eventName,
      target: config?.target ?? node,
      bubbles: config?.bubbles ?? true,
      cancelable: config?.cancelable ?? true,
      preventDefault: () => {},
      stopPropagation: () => {},
    };
    for (const handler of handlers) {
      handler(event);
    }
  }

  // Bubble up to parent if enabled
  if ((config?.bubbles ?? true) && node.parent) {
    dispatchEvent(node.parent, eventName, { ...config, bubbles: true });
  }
}

/**
 * Screen object providing global query access
 */
export function createScreen(container: DOMNode): ComponentRenderResult {
  const tester = new ComponentTester();
  return tester.render({ render: () => container });
}
