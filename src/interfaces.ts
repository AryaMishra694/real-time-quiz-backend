// Interfaces for AuthLogin function :
export interface User {
  nameFirst: string;
  nameLast: string;
  email: string;
  password: string;
  numFailedPasswordsSinceLastLogin: number;
  numSuccessfulLogins: number;
  authUserId: number;
  old_passwords: string[];
}

// defines data type  Data for data object containing user and quiz details
export interface Data {
  users: User[];
  quizzes: Quiz[];
  sessions: Session[];
  trash: Quiz[];
  QuizSessions: QuizSession[]
}

export interface Quiz {
  quizId: number;
  userId?: number;
  name: string;
  description: string;
  timeCreated?: number;
  timeLastEdited: number;
  questions?: Question[];
  numQuestions?: number;
  deleted?: boolean;
  duration?: number;
  thumbnailUrl?: string;
}

export interface Question {
  questionId: number;
  question: string;
  duration: number;
  points: number;
  answers: Answers[];
  thumbnailUrl?: string;
}

export interface Answers {
  answerId?: number;
  answer: string;
  colour?: string;
  correct: boolean;
}

export interface Session {
  token: string;
  authUserId: number;
}

export interface ErrorMsg {
  error: string;
}

export interface ErrorStatus {
  error: string;
  status: number;
}

export enum State {
  LOBBY = 'LOBBY',
  QUESTION_COUNTDOWN = 'QUESTION_COUNTDOWN',
  QUESTION_OPEN = 'QUESTION_OPEN',
  QUESTION_CLOSE = 'QUESTION_CLOSE',
  ANSWER_SHOW = 'ANSWER_SHOW',
  FINAL_RESULTS = 'FINAL_RESULTS',
  END = 'END'
}

export enum actions {
  NEXT_QUESTION = 'NEXT_QUESTION',
  SKIP_COUNTDOWN = 'SKIP_COUNTDOWN',
  GO_TO_ANSWER = 'GO_TO_ANSWER',
  GO_TO_FINAL_RESULTS = 'GO_TO_FINAL_RESULTS',
  END = 'END'
}

export interface Player {
  playerId?: number,
  name?: string,
}

export interface AnswerResult {
  answerId: number | null;
  playersCorrect: string[];
}

export interface AdminQuizViewSessionsReturn {
  activeSessions: number[];
  inactiveSessions: number[];
}

export interface questionAnswers {
  questionPosition: number,
  playerAnswers: playerAnswers[],
}

export interface playerAnswers {
  playerId: number,
  questionPosition: number,
  answer: Answers,
  timeAnswered: number
  points?: number
}

export interface QuizSession {
  sessionId?: number,
  quiz?: Quiz,
  state: State,
  lobby?: Player[],
  chat?: message[],
  currentQuestion?: number, /// increment this number starting from 1 as we go through the quiz
  autoStartNum?: number,
  questionAnswers?: questionAnswers[],
  questionResult?: PlayerQuestionResults[],
  metadata: {
    quizId: number;
    name: string;
    timeCreated: number;
    timeLastEdited: number;
    description: string;
    numQuestions: number;
    questions: Question[];
    duration: number;
    thumbnailUrl: string;
  };
}

export interface message {
  playerId: number,
  messageBody: string,
  playerName: string,
  timeSent: number
}

export interface PlayerQuestionResults {
  questionId: number,
  playersCorrectList: string[],
  averageAnswerTime: number,
  percentCorrect: number
}

// interface for adminQuizSessionResultsCSV function IT3
export interface sessionResultsCSVReturn {
  url: string;
}

/// //////////////////  Interfaces for Wrapper Functions NEW (ITERATION 3)  ////////////////////////

export interface QuizCreateResponse {
  quizId: number;
}

export interface QuizQuestionDupResponse {
  newQuestionId: number;
}

/// //////  TESTING BRANCH ///////

export interface QuizQuestionDelResponse {
  // empty object is returned
}

export interface ErrorQuizQuestionDelV2 {
  error: string;
  status: number;
}

export interface SessionStartResponse {
  sessionId: string;
}

export interface ErrorSessionStart {
  error: string;
  status: number;
}

export interface PlayerStatusResponse {
  state: State;
  numQuestions: number;
  atQuestion: number;
}

/*
export interface TimeOutIdObject {
  timeId: NodeJS.Timeout;
  sessionId: number;
}
  */
