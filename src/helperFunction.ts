import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getData } from './dataStore.ts';
import { questionAnswers, Data, AnswerResult, QuizSession } from './interfaces.ts';

// helper function to generate tokens
export function generateToken () : string {
  const sessionId = uuidv4();
  return sessionId;
}

export function getAuthUserIdFromToken (token: string): {authUserId : number} | { error : string} {
  const data : Data = getData();
  const session = data.sessions.find(session => {
    return session.token === token;
  });

  if (session === undefined) {
    return { error: 'Invalid token!' };
  }
  return { authUserId: session.authUserId };
}

// Function to select a random element from an array
export function getRandomElement(array: string[]) {
  // Generate a random index
  const randomIndex = Math.floor(Math.random() * array.length);
  // Use array destructuring to directly extract the random element
  const randomElement = array[randomIndex];
  return randomElement;
}

export function containsInvalidCharacters(name :string) {
  return /[^a-zA-Z0-9 ]/.test(name);
}

// HELPER FUNCTION
export function generateRandomName(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';

  let randomLetters = '';
  let randomNumbers = '';

  // Generate 5 unique random letters
  while (randomLetters.length < 5) {
    const letter = letters[Math.floor(Math.random() * letters.length)];
    if (!randomLetters.includes(letter)) {
      randomLetters += letter;
    }
  }

  // Generate 3 unique random numbers
  while (randomNumbers.length < 3) {
    const number = numbers[Math.floor(Math.random() * numbers.length)];
    if (!randomNumbers.includes(number)) {
      randomNumbers += number;
    }
  }

  return randomLetters + randomNumbers;
}

// Helper function to convert player 's final result in the CSV format :

export // Converts quiz results into a CSV formatted string
/// ERROR CHECKING !!!!!!!!!!
const convertResultToCSV = (results: questionAnswers[]): string => {
  // Determine the number of questions based on the provided results
  const questionCount = results.length;

  // Create the header row with dynamic question columns
  const headers = ['Player'];
  for (let i = 1; i <= questionCount; i++) {
    headers.push(`question${i}score`, `question${i}rank`);
  }
  let csvString = headers.join(',') + '\n';

  // Create a map to collect scores and ranks for each player
  const playerResults: { [key: string]: (number | string)[] } = {};

  results.forEach(result => {
    result.playerAnswers.forEach(playerAnswer => {
      const playerName = playerAnswer.playerId.toString(); // Use playerId as key (assume a real implementation would map ID to name)
      if (!playerResults[playerName]) {
        playerResults[playerName] = [];
      }
      const score = playerAnswer.answer.correct ? playerAnswer.points || 1 : 0;
      const rank = playerAnswer.answer.correct ? 1 : 0; // Rank assignment logic to be adjusted as necessary
      playerResults[playerName].push(score, rank);
    });
  });

  // Sort players alphabetically (or by player ID, which we're using as a name substitute here)
  const sortedPlayerNames = Object.keys(playerResults).sort();

  // Construct CSV rows for each player
  sortedPlayerNames.forEach(playerName => {
    const row = [playerName, ...playerResults[playerName]];

    // If a player does not have entries for all questions, fill in with 0s
    while (row.length < headers.length) {
      row.push(0, 0);
    }

    csvString += row.join(',') + '\n';
  });

  return csvString;
};

/**
 * Deletes all CSV files in the specified directory, excluding the 'README.txt' file.
 */
export const removeCSV = (): void => {
  const directoryPath = path.join(__dirname, '../csv');
  const csvFile = fs.readdirSync(directoryPath);

  csvFile.forEach(file => {
    if (file !== 'README.txt') {
      const filePath = path.join(directoryPath, file);
      fs.unlinkSync(filePath);
    }
  });
};

export function getQuestionResults(data: Data, sess: QuizSession, questionPosition: number): {
  questionId: number;
  questionCorrectBreakdown: AnswerResult[];
  averageAnswerTime: number;
  percentCorrect: number;
} {
  const correctAnswerIds: number[] = [];
  const answerResults: AnswerResult[] = [];

  // Find the current question
  const currentQuestion = sess.metadata.questions[questionPosition - 1];
  const questionId = currentQuestion.questionId;

  // Find all correct answer IDs for the current question
  currentQuestion.answers.forEach(answer => {
    if (answer.correct) {
      correctAnswerIds.push(answer.answerId);
    }
  });

  // Track which players got which answers correct
  const playersCorrectList: string[] = [];
  sess.questionAnswers?.forEach(qa => {
    if (qa.questionPosition === questionPosition) {
      const playerAnswers = qa.playerAnswers.filter(pa => pa.answer.correct);
      const playerAnswerIds = playerAnswers.map(pa => pa.answer.answerId);

      // Check if the player answered all correct answers correctly
      if (playerAnswerIds.length === correctAnswerIds.length &&
          playerAnswerIds.every(id => correctAnswerIds.includes(id)) &&
          correctAnswerIds.every(id => playerAnswerIds.includes(id))) {
        playerAnswers.forEach(pa => {
          const playerName = sess.lobby?.find(player => player.playerId === pa.playerId)?.name || '';
          if (!playersCorrectList.includes(playerName)) {
            playersCorrectList.push(playerName);
          }
        });
      }
    }
  });

  // Calculate average answer time for players who got the question correct
  const correctAnswerTimes = sess.questionAnswers?.find(qa => qa.questionPosition === questionPosition)?.playerAnswers
    .filter(pa => pa.answer.correct)
    .map(pa => pa.timeAnswered) || [];

  const averageAnswerTime = correctAnswerTimes.length > 0
    ? correctAnswerTimes.reduce((acc, time) => acc + time, 0) / correctAnswerTimes.length
    : 0;

  // Calculate percent correct
  const totalPlayers = sess.lobby?.length || 0;
  const percentCorrect = totalPlayers > 0
    ? (playersCorrectList.length / totalPlayers) * 100
    : 0;

  return {
    questionId: questionId,
    questionCorrectBreakdown: answerResults,
    averageAnswerTime: averageAnswerTime,
    percentCorrect: percentCorrect
  };
}
