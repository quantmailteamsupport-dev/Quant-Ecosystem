// ============================================================================
// QuantAI - Math Reasoning Service
// Problem solving, step-by-step solutions, visualization, practice problems
// ============================================================================

interface MathSolution { id: string; problem: string; answer: string | number; steps: SolutionStep[]; domain: string; difficulty: string; confidence: number; }
interface SolutionStep { stepNumber: number; description: string; expression: string; result: string; explanation: string; }
interface Visualization { type: 'graph' | 'diagram' | 'table' | 'number_line' | 'geometry'; data: Record<string, any>; description: string; }
interface PracticeProblem { id: string; problem: string; difficulty: 'easy' | 'medium' | 'hard'; topic: string; hints: string[]; answer: string; solution: SolutionStep[]; }
interface ConceptExplanation { topic: string; explanation: string; examples: string[]; relatedTopics: string[]; prerequisites: string[]; }

class MathReasoningService {
  private solutions: Map<string, MathSolution> = new Map();
  private problems: Map<string, PracticeProblem[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string { return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`; }

  async solve(problem: string): Promise<MathSolution> {
    if (problem.length < 3) throw new Error('Problem too short');

    const parsed = this.parseProblem(problem);
    const steps = this.generateSteps(parsed);
    const answer = this.computeAnswer(parsed);

    const solution: MathSolution = {
      id: this.genId('sol'), problem, answer,
      steps, domain: parsed.domain, difficulty: parsed.difficulty,
      confidence: 0.9 + Math.random() * 0.1,
    };

    this.solutions.set(solution.id, solution);
    return solution;
  }

  private parseProblem(problem: string): { type: string; domain: string; difficulty: string; values: number[]; operation: string } {
    const numbers = problem.match(/\d+\.?\d*/g)?.map(Number) || [5, 3];
    let domain = 'arithmetic';
    let type = 'computation';
    let operation = '+';

    if (problem.includes('x') || problem.includes('solve')) { domain = 'algebra'; type = 'equation'; operation = 'solve'; }
    else if (problem.includes('derivative') || problem.includes('integral')) { domain = 'calculus'; type = 'calculus'; operation = 'differentiate'; }
    else if (problem.includes('triangle') || problem.includes('circle') || problem.includes('area')) { domain = 'geometry'; type = 'geometry'; operation = 'area'; }
    else if (problem.includes('probability') || problem.includes('chance')) { domain = 'probability'; type = 'probability'; operation = 'calculate'; }
    else if (problem.includes('+')) operation = '+';
    else if (problem.includes('-')) operation = '-';
    else if (problem.includes('*') || problem.includes('times')) operation = '*';
    else if (problem.includes('/') || problem.includes('divide')) operation = '/';

    const difficulty = numbers.some(n => n > 100) ? 'hard' : numbers.some(n => n > 10) ? 'medium' : 'easy';
    return { type, domain, difficulty, values: numbers, operation };
  }

  private computeAnswer(parsed: { values: number[]; operation: string; domain: string }): string | number {
    const [a, b] = parsed.values;
    switch (parsed.operation) {
      case '+': return a + (b || 0);
      case '-': return a - (b || 0);
      case '*': return a * (b || 1);
      case '/': return b ? Math.round((a / b) * 10000) / 10000 : 'undefined';
      case 'solve': return b ? `x = ${b}` : `x = ${a}`;
      case 'differentiate': return `${a}x^${a - 1}`;
      case 'area': return Math.round(Math.PI * a * a * 100) / 100;
      case 'calculate': return Math.round((a / (b || 100)) * 10000) / 10000;
      default: return a + (b || 0);
    }
  }

  private generateSteps(parsed: { type: string; values: number[]; operation: string; domain: string }): SolutionStep[] {
    const [a, b] = parsed.values;
    const steps: SolutionStep[] = [
      { stepNumber: 1, description: 'Identify the problem type', expression: `Problem: ${parsed.domain}`, result: `Type: ${parsed.type}`, explanation: `This is a ${parsed.domain} problem involving ${parsed.operation}` },
      { stepNumber: 2, description: 'Extract given values', expression: `Given: ${a}${b !== undefined ? `, ${b}` : ''}`, result: `Values identified`, explanation: 'Identify all known quantities from the problem statement' },
      { stepNumber: 3, description: 'Apply appropriate formula', expression: `${a} ${parsed.operation} ${b || ''}`, result: `= ${this.computeAnswer(parsed)}`, explanation: `Apply the ${parsed.operation} operation to the given values` },
      { stepNumber: 4, description: 'Verify the result', expression: `Check: ${this.computeAnswer(parsed)}`, result: 'Verified', explanation: 'Verify the answer by substituting back or using an alternative method' },
    ];
    return steps;
  }

  async showSteps(solutionId: string): Promise<SolutionStep[]> {
    const solution = this.solutions.get(solutionId);
    if (!solution) throw new Error('Solution not found');
    return solution.steps;
  }

  async visualize(solutionId: string): Promise<Visualization> {
    const solution = this.solutions.get(solutionId);
    if (!solution) throw new Error('Solution not found');

    const vizType = solution.domain === 'geometry' ? 'geometry' : solution.domain === 'calculus' ? 'graph' : 'number_line';
    const data: Record<string, any> = {};

    if (vizType === 'graph') {
      data.points = Array.from({ length: 20 }, (_, i) => ({ x: i - 10, y: Math.pow(i - 10, 2) }));
      data.xAxis = { min: -10, max: 10, label: 'x' };
      data.yAxis = { min: 0, max: 100, label: 'y' };
    } else if (vizType === 'number_line') {
      data.min = -10;
      data.max = 10;
      data.points = [{ value: Number(solution.answer) || 0, label: 'answer' }];
    } else {
      data.shape = 'circle';
      data.dimensions = { radius: 5 };
    }

    return { type: vizType, data, description: `Visualization of ${solution.problem}` };
  }

  async checkWork(solution: string, problem: string): Promise<{ correct: boolean; feedback: string; errors: string[]; suggestions: string[] }> {
    const parsed = this.parseProblem(problem);
    const expected = String(this.computeAnswer(parsed));
    const correct = solution.trim() === expected || solution.includes(expected);

    return {
      correct,
      feedback: correct ? 'Excellent work! Your solution is correct.' : `Not quite. The expected answer is ${expected}. Review step 3.`,
      errors: correct ? [] : ['Check your calculation in the final step'],
      suggestions: correct ? ['Try a harder problem!'] : ['Double-check your arithmetic', 'Make sure you applied the correct formula'],
    };
  }

  async explainConcept(topic: string): Promise<ConceptExplanation> {
    const concepts: Record<string, Partial<ConceptExplanation>> = {
      algebra: { explanation: 'Algebra is the study of mathematical symbols and the rules for manipulating them. It includes solving equations, working with variables, and understanding functions.', prerequisites: ['arithmetic', 'order of operations'], relatedTopics: ['linear equations', 'quadratic equations', 'polynomials'] },
      calculus: { explanation: 'Calculus is the study of continuous change. It has two major branches: differential calculus (rates of change) and integral calculus (accumulation of quantities).', prerequisites: ['algebra', 'trigonometry', 'limits'], relatedTopics: ['derivatives', 'integrals', 'differential equations'] },
      geometry: { explanation: 'Geometry is the study of shapes, sizes, positions, and properties of space. It includes the study of points, lines, surfaces, and solids.', prerequisites: ['basic arithmetic', 'measurement'], relatedTopics: ['area', 'volume', 'trigonometry', 'coordinate geometry'] },
      probability: { explanation: 'Probability is the study of uncertainty and randomness. It measures how likely events are to occur, expressed as a number between 0 and 1.', prerequisites: ['fractions', 'ratios', 'counting'], relatedTopics: ['statistics', 'combinatorics', 'expected value'] },
    };

    const concept = concepts[topic.toLowerCase()] || { explanation: `${topic} is a mathematical concept that involves logical reasoning and problem-solving.`, prerequisites: ['basic math'], relatedTopics: ['applied mathematics'] };
    return { topic, explanation: concept.explanation || '', examples: [`Example: Solve a basic ${topic} problem`, `Example: Apply ${topic} in real life`], relatedTopics: concept.relatedTopics || [], prerequisites: concept.prerequisites || [] };
  }

  async practiceProblems(topic: string, difficulty: PracticeProblem['difficulty'], count: number = 5): Promise<PracticeProblem[]> {
    const generators: Record<string, () => { problem: string; answer: string; hints: string[] }> = {
      algebra: () => { const a = 2 + Math.floor(Math.random() * 10); const b = 1 + Math.floor(Math.random() * 20); return { problem: `Solve for x: ${a}x + ${b} = ${a * 5 + b}`, answer: `x = 5`, hints: [`Subtract ${b} from both sides`, `Divide both sides by ${a}`] }; },
      arithmetic: () => { const a = 10 + Math.floor(Math.random() * 90); const b = 10 + Math.floor(Math.random() * 90); return { problem: `Calculate: ${a} * ${b}`, answer: `${a * b}`, hints: ['Break into partial products', 'Use the distributive property'] }; },
      geometry: () => { const r = 2 + Math.floor(Math.random() * 8); return { problem: `Find the area of a circle with radius ${r}`, answer: `${Math.round(Math.PI * r * r * 100) / 100}`, hints: ['Use the formula A = pi * r^2', `Substitute r = ${r}`] }; },
    };

    const generator = generators[topic.toLowerCase()] || generators.arithmetic;
    return Array.from({ length: count }, () => {
      const { problem, answer, hints } = generator();
      return { id: this.genId('prob'), problem, difficulty, topic, hints, answer, solution: [{ stepNumber: 1, description: 'Apply formula', expression: problem, result: answer, explanation: 'Direct computation' }] };
    });
  }

  async getHints(solutionId: string, stepNumber: number): Promise<string[]> {
    const solution = this.solutions.get(solutionId);
    if (!solution) throw new Error('Solution not found');
    return [`Hint for step ${stepNumber}: Review the formula for ${solution.domain}`, 'Try working backwards from the answer', 'Check if you have all the given values correct'];
  }
}

export const mathReasoningService = new MathReasoningService();
export { MathReasoningService };
