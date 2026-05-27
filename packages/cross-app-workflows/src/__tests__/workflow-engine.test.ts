import { describe, expect, it } from 'vitest';
import { createWorkflowEngine } from '../workflow-engine.js';

describe('WorkflowEngine', () => {
  it('creates workflows as first-class objects', () => {
    const engine = createWorkflowEngine();
    const workflow = engine.createWorkflow({
      name: 'Email to Task',
      description: 'Convert starred emails into tasks',
      createdBy: 'user-1',
    });

    expect(workflow.id).toBeTruthy();
    expect(workflow.name).toBe('Email to Task');
    expect(workflow.status).toBe('draft');
    expect(workflow.enabled).toBe(false);
    expect(workflow.version).toBe(1);
  });

  it('retrieves workflows by ID', () => {
    const engine = createWorkflowEngine();
    const workflow = engine.createWorkflow({
      name: 'Test',
      description: 'Test workflow',
      createdBy: 'user-1',
    });

    const retrieved = engine.getWorkflow(workflow.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.name).toBe('Test');
  });

  it('lists all workflows', () => {
    const engine = createWorkflowEngine();
    engine.createWorkflow({ name: 'WF1', description: 'D1', createdBy: 'u1' });
    engine.createWorkflow({ name: 'WF2', description: 'D2', createdBy: 'u1' });

    expect(engine.getAllWorkflows()).toHaveLength(2);
  });

  it('deletes workflows', () => {
    const engine = createWorkflowEngine();
    const wf = engine.createWorkflow({ name: 'WF', description: 'D', createdBy: 'u1' });

    expect(engine.deleteWorkflow(wf.id)).toBe(true);
    expect(engine.getWorkflow(wf.id)).toBeNull();
  });

  it('adds steps with cross-app actions', () => {
    const engine = createWorkflowEngine();
    const wf = engine.createWorkflow({ name: 'WF', description: 'D', createdBy: 'u1' });

    const step = engine.addStep(wf.id, {
      name: 'Send notification',
      type: 'action',
      appId: 'quant-chat',
      action: {
        id: 'act-1',
        type: 'send_message',
        appId: 'quant-chat',
        operation: 'sendMessage',
        parameters: { channel: 'general', text: 'Hello!' },
      },
      nextStepId: null,
      onError: 'retry',
      maxRetries: 3,
      timeoutMs: 5000,
    });

    expect(step).not.toBeNull();
    expect(step!.appId).toBe('quant-chat');
    expect(engine.getWorkflow(wf.id)!.steps).toHaveLength(1);
  });

  it('removes steps', () => {
    const engine = createWorkflowEngine();
    const wf = engine.createWorkflow({ name: 'WF', description: 'D', createdBy: 'u1' });

    const step = engine.addStep(wf.id, {
      name: 'Step 1',
      type: 'action',
      appId: 'quant-mail',
      action: { id: 'a1', type: 'read', appId: 'quant-mail', operation: 'read', parameters: {} },
      nextStepId: null,
      onError: 'stop',
      maxRetries: 0,
      timeoutMs: 5000,
    });

    expect(engine.removeStep(wf.id, step!.id)).toBe(true);
    expect(engine.getWorkflow(wf.id)!.steps).toHaveLength(0);
  });

  it('adds triggers from different apps', () => {
    const engine = createWorkflowEngine();
    const wf = engine.createWorkflow({ name: 'WF', description: 'D', createdBy: 'u1' });

    const trigger = engine.addTrigger(wf.id, {
      type: 'event',
      appId: 'quant-mail',
      event: 'email.received',
      enabled: true,
    });

    expect(trigger).not.toBeNull();
    expect(trigger!.type).toBe('event');
    expect(trigger!.appId).toBe('quant-mail');
  });

  it('executes workflows across apps', async () => {
    const engine = createWorkflowEngine();
    const wf = engine.createWorkflow({ name: 'WF', description: 'D', createdBy: 'u1' });

    engine.addStep(wf.id, {
      name: 'Read Email',
      type: 'action',
      appId: 'quant-mail',
      action: {
        id: 'a1',
        type: 'read',
        appId: 'quant-mail',
        operation: 'readEmail',
        parameters: {},
      },
      nextStepId: null,
      onError: 'stop',
      maxRetries: 0,
      timeoutMs: 5000,
    });

    engine.addStep(wf.id, {
      name: 'Create Task',
      type: 'action',
      appId: 'quant-tasks',
      action: {
        id: 'a2',
        type: 'create',
        appId: 'quant-tasks',
        operation: 'createTask',
        parameters: { title: 'Follow up' },
      },
      nextStepId: null,
      onError: 'stop',
      maxRetries: 0,
      timeoutMs: 5000,
    });

    const execution = await engine.execute(wf.id, { emailId: 'email-123' });
    expect(execution.status).toBe('completed');
    expect(execution.stepResults).toHaveLength(2);
    expect(execution.stepResults[0]!.status).toBe('success');
    expect(execution.stepResults[1]!.status).toBe('success');
    expect(execution.context.sourceApp).toBe('quant-mail');
    expect(execution.context.targetApp).toBe('quant-tasks');
  });

  it('supports conditional branching', async () => {
    const engine = createWorkflowEngine();
    const wf = engine.createWorkflow({ name: 'WF', description: 'D', createdBy: 'u1' });

    engine.addStep(wf.id, {
      name: 'Check priority',
      type: 'condition',
      appId: 'quant-mail',
      action: {
        id: 'a1',
        type: 'check',
        appId: 'quant-mail',
        operation: 'checkPriority',
        parameters: {},
      },
      condition: {
        field: 'priority',
        operator: 'eq',
        value: 'high',
        nextIfTrue: null,
        nextIfFalse: null,
      },
      nextStepId: null,
      onError: 'skip',
      maxRetries: 0,
      timeoutMs: 5000,
    });

    const exec1 = await engine.execute(wf.id, { priority: 'high' });
    expect(exec1.stepResults[0]!.status).toBe('success');

    const exec2 = await engine.execute(wf.id, { priority: 'low' });
    expect(exec2.stepResults[0]!.status).toBe('skipped');
  });

  it('evaluates conditions correctly', () => {
    const engine = createWorkflowEngine();

    expect(
      engine.evaluateCondition(
        { field: 'count', operator: 'gt', value: 5, nextIfTrue: null, nextIfFalse: null },
        { count: 10 },
      ),
    ).toBe(true);

    expect(
      engine.evaluateCondition(
        { field: 'name', operator: 'contains', value: 'test', nextIfTrue: null, nextIfFalse: null },
        { name: 'this is a test' },
      ),
    ).toBe(true);

    expect(
      engine.evaluateCondition(
        { field: 'missing', operator: 'exists', value: null, nextIfTrue: null, nextIfFalse: null },
        {},
      ),
    ).toBe(false);

    expect(
      engine.evaluateCondition(
        {
          field: 'missing',
          operator: 'not_exists',
          value: null,
          nextIfTrue: null,
          nextIfFalse: null,
        },
        {},
      ),
    ).toBe(true);
  });

  it('tracks execution history', async () => {
    const engine = createWorkflowEngine();
    const wf = engine.createWorkflow({ name: 'WF', description: 'D', createdBy: 'u1' });

    engine.addStep(wf.id, {
      name: 'Action',
      type: 'action',
      appId: 'quant-chat',
      action: { id: 'a1', type: 'send', appId: 'quant-chat', operation: 'send', parameters: {} },
      nextStepId: null,
      onError: 'stop',
      maxRetries: 0,
      timeoutMs: 5000,
    });

    await engine.execute(wf.id);
    await engine.execute(wf.id);

    const history = engine.getExecutionHistory(wf.id);
    expect(history).toHaveLength(2);
  });

  it('throws when executing workflow with no steps', async () => {
    const engine = createWorkflowEngine();
    const wf = engine.createWorkflow({ name: 'Empty', description: 'D', createdBy: 'u1' });

    await expect(engine.execute(wf.id)).rejects.toThrow('no steps');
  });

  it('updates workflow status', () => {
    const engine = createWorkflowEngine();
    const wf = engine.createWorkflow({ name: 'WF', description: 'D', createdBy: 'u1' });

    engine.updateStatus(wf.id, 'active');
    expect(engine.getWorkflow(wf.id)!.status).toBe('active');
    expect(engine.getWorkflow(wf.id)!.enabled).toBe(true);

    engine.updateStatus(wf.id, 'paused');
    expect(engine.getWorkflow(wf.id)!.enabled).toBe(false);
  });
});
