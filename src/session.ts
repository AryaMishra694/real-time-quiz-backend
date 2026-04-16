import { getAuthUserIdFromToken, convertResultToCSV, getQuestionResults } from './helperFunction.ts';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

import { getData, setData } from './dataStore.ts';
import {
  Data,
  Quiz,
  ErrorMsg,
  State,
  QuizSession,
  questionAnswers,
  message,
  sessionResultsCSVReturn,
  AdminQuizViewSessionsReturn,
  AnswerResult,
  // TimeOutIdObject
} from './interfaces.ts';

const MIN_CHAT_LENGTH = 1;
const MAX_CHAT_LENGTH = 100;

// const timeOutIds: TimeOutIdObject[] = [];

/**
 * Starts a new quiz session.
 *
 * @param {string} token - The authorization token for the user.
 * @param {number} quizId - The ID of the quiz to start the session for.
 * @param {number} autoStartNum - The number of players required to auto-start the session.
 * @returns An object containing the new session ID if successful, or throws an error with a message if there are validation issues.
 *
 */
export function startSession(token: string, quizId: number, autoStartNum: number): { sessionId: number } | ErrorMsg {
  const data: Data = getData();

  // Validate the token and get the authUserId
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  }
  const authUserId = authResult.authUserId;

  // Validate the user existence
  const user = data.users.find(u => u.authUserId === authUserId);
  if (!user) {
    throw new Error('AuthUserId is not a valid user');
  }

  // Validate quiz existence
  const quiz = data.quizzes.find(q => q.quizId === quizId);
  if (!quiz) {
    throw new Error('Quiz ID does not refer to a valid quiz');
  }
  // creating a clone of quiz, so that the original quiz is not modified
  const quizCopy = structuredClone(quiz);

  // Validate quiz ownership
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns');
  }

  // Validate autoStartNum
  if (autoStartNum > 50) {
    throw new Error('autoStartNum is a number greater than 50');
  }

  // Validate quiz state and properties
  if (data.QuizSessions.filter(s => s.quiz.quizId === quizId && s.state !== State.END).length >= 10) {
    throw new Error('10 sessions that are not in END state currently exist for this quiz');
  }
  if (quiz.questions.length === 0) {
    throw new Error('The quiz does not have any questions in it');
  }
  if (quiz.deleted) {
    throw new Error('The quiz is in trash');
  }

  // Generate a new session token
  const newSessionId = Math.floor(Math.random() * 1000000);

  // Create the QuizSession:
  const quizSession : QuizSession = {
    sessionId: newSessionId,
    quiz: quizCopy,
    state: State.LOBBY,
    lobby: [],
    chat: [],
    currentQuestion: 0,
    autoStartNum: autoStartNum,
    questionAnswers: [],
    metadata: {
      quizId: 0,
      name: ' ',
      timeCreated: 0,
      timeLastEdited: 0,
      description: ' ',
      numQuestions: 0,
      questions: [],
      duration: 0,
      thumbnailUrl: ' '
    }

  };

  for (let i = 0; i < quizCopy.questions.length; i++) {
    const questionObject: questionAnswers = {
      questionPosition: i + 1,
      playerAnswers: []
    };
    quizSession.questionAnswers.push(questionObject);
  }

  data.QuizSessions.push(quizSession);
  setData(data);

  return { sessionId: newSessionId };
}

/**
 * Updates the state of a quiz session based on the provided action.
 *
 * @param {number} quizId - The ID of the quiz associated with the session.
 * @param {number} sessionId - The ID of the session to update.
 * @param {string} token - The authorization token for the user.
 * @param {string} action - The action to perform on the session. Valid actions include:
 *    - "NEXT_QUESTION"
 *    - "SKIP_COUNTDOWN"
 *    - "GO_TO_ANSWER"
 *    - "GO_TO_FINAL_RESULTS"
 *    - "END"
 * @returns An empty object if the action is successfully performed, or throws an error with a message if there are validation issues or if the action cannot be performed in the current session state.
 *
 * @throws {Error} Throws an error if the session does not exist, if the token is invalid, if the action is not recognized, if the quiz does not exist, or if the user does not own the quiz.
 * @throws {Error} Throws an error if the action is not allowed in the current session state, such as skipping countdown in the LOBBY state or moving to the final results from the ANSWER_SHOW state.
 */

/*
export function adminQuizSessionUpdate(quizId: number, sessionId: number, token: string, action: string) {
  let data = getData();
  // checking if session exists
  if (data.QuizSessions.some(session => session.sessionId === sessionId) === false) {
    throw new Error('The quiz session does not exist!');
  }

  // Validate the token and get the authUserId
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  }
  const authUserId = authResult.authUserId;

    enum actions {
      NEXT_QUESTION,
      SKIP_COUNTDOWN,
      GO_TO_ANSWER,
      GO_TO_FINAL_RESULTS,
      END
    }
    const session = data.QuizSessions.find(session => session.sessionId === sessionId);

    const values = Object.values(actions);

    // checking if the action exists on the enum
    if (values.some(value => value === action) === false) {
      throw new Error('The action provided does not match any of the actions provided');
    }
    // check existence of quiz
    if (data.quizzes.some(quiz => quiz.quizId === quizId) === false) {
      throw new Error('Quiz does not exist!');
    }

    // checking the ownership of the quiz
    if (data.QuizSessions.some(session => session.quiz.userId === authUserId) === false) {
      throw new Error('You do not own this quiz');
    }

    // Conditions when in differente states.
    if (session.state === State.LOBBY) {
      if (action === 'SKIP_COUNTDOWN') {
        throw new Error('You cannot skip countdown');
      }

      if (action === 'GO_TO_ANSWER') {
        throw new Error('Cannot got to answers from lobby');
      }

      if (action === 'GO_TO_FINAL_RESULTS') {
        throw new Error('Cannot go to final results from lobby');
      }

      if (action === 'NEXT_QUESTION') {
        session.state = State.QUESTION_COUNTDOWN;
        if (session.currentQuestion + 1 > session.quiz.questions.length) {
          throw new Error('You have reached the end of the quiz.');
        }
        session.currentQuestion++;
        // 3 second countdown begins
        const timeId = setTimeout(() => {
          session.state = State.QUESTION_OPEN;
          const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
          data.QuizSessions[index] = session;
          setData(data);
          setTimeout(() => {
            data = getData();
            const updatedSession: QuizSession = data.QuizSessions.find(a => a.sessionId === sessionId);
            updatedSession.state = State.QUESTION_CLOSE;
            const newIndex = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
            data.QuizSessions[newIndex] = updatedSession;
            setData(data);
          }, session.quiz.duration * 1000);
        }, 3000);
        const timeIdObject = { timeId: timeId, sessionId: sessionId };
        timeOutIds.push(timeIdObject);
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }
      if (action === 'END') {
        session.state = State.END;
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }
    }

    if (session.state === State.QUESTION_COUNTDOWN) {
      if (action === 'NEXT_QUESTION') {
        throw new Error('cannot go next question from question countdown');
      }

      if (action === 'GO_TO_ANSWER') {
        throw new Error('cannot got to answer from question countdown');
      }

      if (action === 'GO_TO_FINAL_RESULTS') {
        throw new Error('cannot got to final results from question countdown');
      }

      if (action === 'SKIP_COUNTDOWN') {
        const endTimeId = timeOutIds.find(a => a.sessionId === sessionId).timeId;
        clearTimeout(endTimeId);
        session.state = State.QUESTION_OPEN;
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }

      if (action === 'END') {
        session.state = State.END;
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }
    }

    if (session.state === State.QUESTION_OPEN) {
      if (action === 'SKIP_COUNTDOWN') {
        throw new Error('You cannot skip countdown');
      }
      if (action === 'NEXT_QUESTION') {
        throw new Error('cannot go to next question from question open');
      }

      if (action === 'GO_TO_FINAL_RESULTS') {
        throw new Error('Cannot go to final results from go to final results');
      }

      if (action === 'END') {
        session.state = State.END;
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }

      if (action === 'GO_TO_ANSWER') {
        session.state = State.ANSWER_SHOW;
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }
    }

    if (session.state === State.QUESTION_CLOSE) {
      if (action === 'SKIP_COUNTDOWN') {
        throw new Error('You cannot skip countdown');
      }

      if (action === 'END') {
        session.state = State.END;
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }
      if (action === 'GO_TO_FINAL_RESULTS') {
        session.state = State.FINAL_RESULTS;
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }

      if (action === 'NEXT_QUESTION') {
        session.state = State.QUESTION_COUNTDOWN;
        if (session.currentQuestion + 1 > session.quiz.questions.length) {
          throw new Error('You have reached the end of the quiz.');
        }
        session.currentQuestion++;
        // 3 second countdown begins
        const timeId = setTimeout(() => {
          session.state = State.QUESTION_OPEN;
          const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
          data.QuizSessions[index] = session;
          setData(data);
          setTimeout(() => {
            data = getData();
            const updatedSession = data.QuizSessions.find(a => a.sessionId === sessionId);
            if (updatedSession === undefined) {
              throw new Error('UNDEFINED!');
            }
            updatedSession.state = State.QUESTION_CLOSE;
            const newIndex = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
            data.QuizSessions[newIndex] = updatedSession;
            setData(data);
          }, session.quiz.duration * 1000);
        }, 3000);
        const timeIdObject = { timeId: timeId, sessionId: sessionId };
        timeOutIds.push(timeIdObject);
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }

      if (action === 'GO_TO_ANSWER') {
        session.state = State.ANSWER_SHOW;
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }
    }

    if (session.state === State.ANSWER_SHOW) {
      if (action === 'SKIP_COUNTDOWN') {
        throw new Error('You cannot skip countdown');
      }

      if (action === 'GO_TO_ANSWER') {
        throw new Error('cannot go to answer at answer show');
      }

      if (action === 'END') {
        throw new Error('cannot go to end state');
      }

      if (action === 'NEXT_QUESTION') {
        session.state = State.QUESTION_COUNTDOWN;
        if (session.currentQuestion + 1 > session.quiz.questions.length) {
          throw new Error('You have reached the end of the quiz.');
        }
        session.currentQuestion++;
        // 3 second countdown begins
        const timeId = setTimeout(() => {
          session.state = State.QUESTION_OPEN;
          const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
          data.QuizSessions[index] = session;
          setData(data);
          setTimeout(() => {
            data = getData();
            const updatedSession = data.QuizSessions.find(a => a.sessionId === sessionId);
            if (updatedSession === undefined) {
              throw new Error('UNDEFINED!');
            }
            updatedSession.state = State.QUESTION_CLOSE;
            const newIndex = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
            data.QuizSessions[newIndex] = updatedSession;
            setData(data);
          }, session.quiz.duration * 1000);
        }, 3000);
        const timeIdObject = { timeId: timeId, sessionId: sessionId };
        timeOutIds.push(timeIdObject);
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }

      if (action === 'GO_TO_FINAL_RESULTS') {
        session.state = State.FINAL_RESULTS;
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }
    }

    if (session.state === State.FINAL_RESULTS) {
      if (action === 'SKIP_COUNTDOWN') {
        throw new Error('You cannot skip countdown');
      }
      if (action === 'NEXT_QUESTION') {
        throw new Error('cannot go to next question from final results');
      }

      if (action === 'GO_TO_ANSWER') {
        throw new Error('cannot go to answer from final results');
      }

      if (action === 'GO_TO_FINAL_RESULTS') {
        throw new Error('cannot go to final results from ');
      }
      if (action === 'END') {
        session.state = State.END;
        const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);
        data.QuizSessions[index] = session;
        setData(data);
        return {};
      }
    }

    if (session.state === State.END) {
      if (action === 'SKIP_COUNTDOWN') {
        throw new Error('session has ended');
      }
      if (action === 'NEXT_QUESTION') {
        throw new Error('session has ended');
      }
      if (action === 'GO_TO_ANSWER') {
        throw new Error('session has ended');
      }
      if (action === 'GO_TO_FINAL_RESULTS') {
        throw new Error('session has ended');
      }
      if (action === 'END') {
        throw new Error('session has ended');
      }
    }

    // find index of QuizSession.
    const index = data.QuizSessions.findIndex(a => a.sessionId === sessionId);

    data.QuizSessions[index] = session;
    setData(data);
    return {};
}

*/

/**
   * Sends a chat message from a player in a quiz session.
   * @param playerId - The ID of the player sending the message.
   * @param message - The content of the chat message.
   * @returns object - An empty object upon success.
   * @throws Error if the session or player does not exist or if the message length is invalid.
   */
export function adminSessionChatSend(playerId: number, message: string): object {
  const data: Data = getData();

  // Find the session that contains the player
  const session: QuizSession | undefined = data.QuizSessions.find(session =>
    session.lobby.some(player => player.playerId === playerId)
  );

  // Validate session existence
  if (!session) {
    throw new Error('Session with player does not exist.');
  }

  // Validate message length
  if (message.length < MIN_CHAT_LENGTH || message.length > MAX_CHAT_LENGTH) {
    throw new Error('Message length must be greater than 0 and less than 101 characters.');
  }

  // Find the player within the session lobby
  const player = session.lobby.find(player => player.playerId === playerId);
  if (!player) {
    throw new Error('Player does not exist in the session.');
  }

  // Create a new message object
  const newMessage: message = {
    playerId: playerId,
    messageBody: message,
    playerName: player.name,
    timeSent: Math.floor(Date.now() / 1000)
  };

  // Add the new message to the session chat
  session.chat.push(newMessage);

  // Save the updated data
  setData(data);

  return {};
}

/**
 * Retrieves the status of a quiz session.
 * @param quizId - The ID of the quiz.
 * @param sessionId - The ID of the session within the quiz.
 * @param token - The authentication token of the user making the request.
 * @returns QuizSession - The status of the requested quiz session.
 * @throws Error if the token is invalid, the quiz ID is invalid, or the session ID is invalid.
 */
export function adminQuizSessionStatus(token: string, quizId: number, sessionId: number): QuizSession {
  const data: Data = getData();

  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  }
  const authUserId = authResult.authUserId;

  // Validate quiz existence
  const quiz = data.quizzes.find(q => q.quizId === quizId);
  if (!quiz) {
    throw new Error('Quiz ID does not refer to a valid quiz.');
  }

  // Check if the quiz belongs to the user making the request
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns.');
  }

  // Find the session
  const session = data.QuizSessions.find(s => s.quiz.quizId === quizId && s.sessionId === sessionId);
  if (!session) {
    throw new Error('Session ID does not refer to a valid session within this quiz');
  }

  const stateString = State[session.state];

  // Ensure session is properly formatted
  const sessionStatus = {
    state: stateString,
    atQuestion: session.currentQuestion, // Assuming `atQuestion` maps to `currentQuestion`
    players: session.lobby.map(player => player.name),
    metadata: {
      quizId: session.metadata.quizId,
      name: session.metadata.name,
      timeCreated: session.metadata.timeCreated,
      timeLastEdited: session.metadata.timeLastEdited,
      description: session.metadata.description,
      numQuestions: session.metadata.numQuestions,
      questions: session.metadata.questions,
      duration: session.metadata.duration,
      thumbnailUrl: session.metadata.thumbnailUrl
    }
  };

  setData(data);
  return sessionStatus;
}

// This function  generated a url link to the final results( CSV format) for all players for a complete quiz session
export const adminQuizSessionResultsCSV = (token:string, quizId: number, sessionId: number): sessionResultsCSVReturn => {
  const data = getData();

  // Validate the token and get the authUserId
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  }
  const authUserId = authResult.authUserId;

  // Validate the user existence
  const user = data.users.find(u => u.authUserId === authUserId);
  if (!user) {
    throw new Error('AuthUserId is not a valid user');
  }

  // Validate quiz existence
  const quiz: Quiz | undefined = data.quizzes.find(q => q.quizId === quizId);
  if (!quiz || quiz.deleted) {
    throw new Error('Quiz ID does not refer to a valid quiz');
  }

  // Validate quiz ownership
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns');
  }

  // Check if the session ID is valid
  const session = data.QuizSessions.find(session => session.quiz.quizId === quizId && session.sessionId === sessionId);

  if (!session) {
    // Throw an error if the session is invalid
    throw new Error('Session Id does not refer to a valid session within this quiz');
  } else if (session.state !== State.FINAL_RESULTS) {
    // Throw an error if the session has not yet ended
    throw new Error('Session is not in FINAL_RESULTS state');
  }

  // Sort the session results by player name in ascending order
  session.questionAnswers.sort((a, b) => a.playerAnswers[0].playerId - b.playerAnswers[0].playerId);

  // Define file name and save path
  const url = uuidv4();
  const csvPath = `${process.env.SERVER_URL}/csv/${url}.csv`;

  const csvData = convertResultToCSV(session.questionAnswers);

  const outputDir = path.join(__dirname, '../csv');

  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Save CSV data to file
  fs.writeFileSync(path.join(outputDir, `${url}.csv`), csvData, { flag: 'w' });

  setData(data);
  return { url: csvPath };
};

export function ViewQuizSessions(token: string, quizId: number): AdminQuizViewSessionsReturn | ErrorMsg {
  const data: Data = getData();

  // Validate player existence
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error(authResult.error);
  }
  const authUserId = authResult.authUserId;

  // Check if the user owns the quiz
  const userQuizzes = data.quizzes.filter(quiz => quiz.userId === authUserId);
  const quiz = userQuizzes.find(q => q.quizId === quizId);

  if (!quiz) {
    throw new Error('Valid token is provided, but user is not an owner of this quiz or quiz does not exist');
  }

  /// Retrieve active and inactive sessions
  const activeSessionsArr = data.QuizSessions.filter(session => session.quiz.quizId === quizId && session.state !== State.END).map(session => session.sessionId);
  const inactiveSessionsArr = data.QuizSessions.filter(session => session.quiz.quizId === quizId && session.state === State.END).map(session => session.sessionId);
  const sortedSessions: AdminQuizViewSessionsReturn = {
    activeSessions: activeSessionsArr.sort((a, b) => a - b),
    inactiveSessions: inactiveSessionsArr.sort((a, b) => a - b),
  };

  return sortedSessions;
}

export function adminSessionFinalResultInGame(quizId: number, sessionId: number, token: string): {
  usersRankedByScore: { name: string; score: number }[];
  questionResults: {
    questionId: number;
    questionCorrectBreakdown: AnswerResult[];
    averageAnswerTime: number;
    percentCorrect: number;
  }[];
} {
  const data: Data = getData();
  // Find the quiz session in which the player is participating
  // const quizSession = data.QuizSessions.find(session =>
  //   session.lobby && session.lobby.some(player => player.playerId === playerId)
  // );

  // Find the quiz session
  const quizSession = data.QuizSessions.find(session => session.sessionId === sessionId);

  if (!quizSession) {
    throw new Error('Quiz session not found for the given player.');
  }

  // check ownership of quiz
  // Validate the token and get the authUserId
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  }
  const authUserId = authResult.authUserId;

  if (quizSession.quiz.userId !== authUserId) {
    throw new Error('You do not own this quiz!');
  }

  // Ensure the session is in FINAL_RESULTS state
  if (quizSession.state !== State.FINAL_RESULTS) {
    throw new Error('Quiz session is not in FINAL_RESULTS state.');
  }

  // Initialize results arrays
  const questionResults: {
    questionId: number;
    questionCorrectBreakdown: AnswerResult[];
    averageAnswerTime: number;
    percentCorrect: number;
  }[] = [];

  // Populate questionResults
  for (let i = 1; i <= quizSession.metadata.numQuestions; i++) {
    questionResults.push(getQuestionResults(data, quizSession, i));
  }

  // Calculate player scores
  const playerScores = new Map<number, number>();

  quizSession.metadata.questions.forEach((question, index) => {
    const questionPosition = index + 1;
    const { questionCorrectBreakdown } = getQuestionResults(data, quizSession, questionPosition);

    questionCorrectBreakdown.forEach(result => {
      const scalingFactor = 1 / result.playersCorrect.length;
      result.playersCorrect.forEach((playerName: string) => {
        const player = quizSession.lobby.find(player => player.name === playerName);
        if (player) {
          const existingScore = playerScores.get(player.playerId) || 0;
          const score = Math.round(question.points * scalingFactor);
          playerScores.set(player.playerId, existingScore + score);
        }
      });
    });
  });

  // Rank players by score
  const playersWithScores = Array.from(playerScores.entries())
    .map(([playerId, score]) => ({
      name: quizSession.lobby.find(player => player.playerId === playerId)?.name || '',
      score
    }))
    .sort((a, b) => b.score - a.score);

  let currentRank = 1;
  let previousScore = -1;
  const rankedPlayers: { name: string; score: number }[] = [];

  playersWithScores.forEach((player, index) => {
    if (player.score !== previousScore) {
      currentRank = index + 1;
    }
    rankedPlayers.push({ name: player.name, score: currentRank });
    previousScore = player.score;
  });

  return {
    usersRankedByScore: rankedPlayers,
    questionResults
  };
}

export function adminSessionFinalResult(playerId: number): {
    usersRankedByScore: { name: string; score: number }[];
    questionResults: {
      questionId: number;
      questionCorrectBreakdown: AnswerResult[];
      averageAnswerTime: number;
      percentCorrect: number;
    }[];
  } {
  const data: Data = getData();
  // Find the quiz session in which the player is participating
  const quizSession = data.QuizSessions.find(session =>
    session.lobby && session.lobby.some(player => player.playerId === playerId)
  );

  if (!quizSession) {
    throw new Error('Quiz session not found for the given player.');
  }

  // Ensure the session is in FINAL_RESULTS state
  if (quizSession.state !== State.FINAL_RESULTS) {
    throw new Error('Quiz session is not in FINAL_RESULTS state.');
  }

  // Initialize results arrays
  const questionResults: {
      questionId: number;
      questionCorrectBreakdown: AnswerResult[];
      averageAnswerTime: number;
      percentCorrect: number;
    }[] = [];

  // Populate questionResults
  for (let i = 1; i <= quizSession.metadata.numQuestions; i++) {
    questionResults.push(getQuestionResults(data, quizSession, i));
  }

  // Calculate player scores
  const playerScores = new Map<number, number>();

  quizSession.metadata.questions.forEach((question, index) => {
    const questionPosition = index + 1;
    const { questionCorrectBreakdown } = getQuestionResults(data, quizSession, questionPosition);

    questionCorrectBreakdown.forEach(result => {
      const scalingFactor = 1 / result.playersCorrect.length;
      result.playersCorrect.forEach((playerName: string) => {
        const player = quizSession.lobby.find(player => player.name === playerName);
        if (player) {
          const existingScore = playerScores.get(player.playerId) || 0;
          const score = Math.round(question.points * scalingFactor);
          playerScores.set(player.playerId, existingScore + score);
        }
      });
    });
  });

  // Rank players by score
  const playersWithScores = Array.from(playerScores.entries())
    .map(([playerId, score]) => ({
      name: quizSession.lobby.find(player => player.playerId === playerId)?.name || '',
      score
    }))
    .sort((a, b) => b.score - a.score);

  let currentRank = 1;
  let previousScore = -1;
  const rankedPlayers: { name: string; score: number }[] = [];

  playersWithScores.forEach((player, index) => {
    if (player.score !== previousScore) {
      currentRank = index + 1;
    }
    rankedPlayers.push({ name: player.name, score: currentRank });
    previousScore = player.score;
  });

  return {
    usersRankedByScore: rankedPlayers,
    questionResults
  };
}
