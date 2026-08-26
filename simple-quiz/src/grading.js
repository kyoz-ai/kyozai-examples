const correctAnswers = {
  addition: '5',
  multiplication: '24',
  division: '5',
  subtraction: '13',
  halving: '9',
};

export const questionCount = Object.keys(correctAnswers).length;

export function scoreQuiz(answers) {
  return Object.entries(correctAnswers).filter(
    ([question, answer]) => answers[question] === answer,
  ).length;
}
