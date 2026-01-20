import * as readline from 'readline';

interface QuestionOption {
  label: string;
  description: string;
}

interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

interface AskUserQuestionInput {
  questions: Question[];
}

interface AskUserQuestionOutput {
  questions: Question[];
  answers: Record<string, string>;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve, reject) => {
    // Handle Ctrl+C / EOF gracefully
    const cleanup = () => {
      rl.removeAllListeners();
      rl.close();
    };
    
    rl.on('SIGINT', () => {
      cleanup();
      reject(new Error('User interrupted'));
    });
    
    rl.on('close', () => {
      cleanup();
      reject(new Error('Input stream closed'));
    });
    
    rl.question(question, (answer) => {
      cleanup();
      resolve(answer || ''); // Return empty string for empty input
    });
  });
}

function parseResponse(response: string, options: QuestionOption[]): string {
  const trimmed = response.trim();

  // Try to parse as number(s)
  const indices = trimmed.split(',').map((s) => parseInt(s.trim()) - 1);
  const validIndices = indices.filter((i) => !isNaN(i) && i >= 0 && i < options.length);

  if (validIndices.length > 0) {
    // User selected option number(s)
    const labels = validIndices.map((i) => options[i].label);
    return labels.join(', ');
  }

  // Free text input
  return trimmed;
}

/**
 * Prompt user for answers to AskUserQuestion via terminal.
 *
 * Displays questions with numbered options and collects responses.
 * Supports both single-select and multi-select questions.
 * Users can enter a number to select an option, or type free text.
 */
export async function promptAskUserQuestion(
  input: AskUserQuestionInput
): Promise<AskUserQuestionOutput> {
  const answers: Record<string, string> = {};

  for (const q of input.questions) {
    console.log(`\n${q.header}: ${q.question}`);

    const options = q.options;
    options.forEach((opt, i) => {
      console.log(`  ${i + 1}. ${opt.label} - ${opt.description}`);
    });

    if (q.multiSelect) {
      console.log('  (Enter numbers separated by commas, or type your own answer)');
    } else {
      console.log('  (Enter a number, or type your own answer)');
    }

    const response = await prompt('Your choice: ');
    answers[q.question] = parseResponse(response, options);
  }

  return {
    questions: input.questions,
    answers,
  };
}

/**
 * Create default answers for headless mode.
 *
 * When no user is present, return sensible defaults based on the options.
 * Typically selects the first option (often marked as recommended).
 */
export function getDefaultAnswers(input: AskUserQuestionInput): AskUserQuestionOutput {
  const answers: Record<string, string> = {};

  for (const q of input.questions) {
    // Default to first option (usually the recommended one)
    if (q.options.length > 0) {
      answers[q.question] = q.options[0].label;
    }
  }

  return {
    questions: input.questions,
    answers,
  };
}
