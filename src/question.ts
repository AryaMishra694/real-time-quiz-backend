import { getAuthUserIdFromToken, getRandomElement } from './helperFunction.ts';
import { getData, setData } from './dataStore.ts';
import {
  User,
  Data,
  Quiz,
  ErrorMsg,
  Question,
  Answers,
  State,
  QuizSession
} from './interfaces.ts';

const MIN_QUESTION_LENGTH = 5;
const MAX_QUESTION_LENGTH = 50;
const MIN_ANSWERS_COUNT = 2;
const MAX_ANSWERS_COUNT = 6;
const MAX_TOTAL_DURATION = 180;
const MIN_POINTS = 1;
const MAX_POINTS = 10;
const MIN_ANSWER_LENGTH = 1;
const MAX_ANSWER_LENGTH = 30;

/**
 * Creates a new question within a specified quiz, including validation of various input parameters.
 *
 * @param {string} token - The authentication token of the user creating the question.
 * @param {string} question - The text of the new question to be added.
 * @param {number} duration - The duration (in seconds) allowed for answering the question.
 * @param {number} points - The points awarded for correctly answering the question.
 * @param {Answers[]} answersArray - An array of possible answers, including which ones are correct.
 * @param {number} quizId - The ID of the quiz to which the new question will be added.
 * @returns {{ questionId: number } | ErrorMsg} - Returns an object containing the `questionId` of the newly created question, or an `ErrorMsg` if validation fails.
 * @throws {Error} - Throws an error if the token is invalid, the quiz does not exist, the user does not own the quiz, or if any input fails validation.
 */
export function adminQuestionCreate(token: string,
  question: string,
  duration: number,
  points: number,
  answersArray: Answers[],
  quizId: number) :{questionId: number} | ErrorMsg {
  // validate the existence of the user:
  let authUserId : number;

  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    // returns {error: Invalid token!}
    throw new Error('Invalid token!');
  } else {
    authUserId = authResult.authUserId;
  }

  // validate the existence of the quiz
  const data: Data = getData();

  if (data.quizzes.some(quiz => quiz.quizId === quizId) === false) {
    throw new Error('Quiz does not exist!');
  }

  // assign the found Quiz to this variable
  const quiz: Quiz = data.quizzes.find(quiz => quiz.quizId === quizId);
  // Check ownership of the quiz
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz is not owned by YOU!');
  }

  // determine whether duplicate answers have been provided
  const foundArray:{answer: string, correct: boolean}[] = [];
  for (const answer of answersArray) {
    if (foundArray.some(object => object.answer === answer.answer)) {
      throw new Error('Duplicate Answer Provided!');
    } else {
      foundArray.push(answer);
    }
  }

  // Check question string length
  if (question.length < MIN_QUESTION_LENGTH || question.length > MAX_QUESTION_LENGTH) {
    throw new Error('Question must be between 5 and 50 characters!');
  }

  // checks answers array length;
  if (answersArray.length < MIN_ANSWERS_COUNT || answersArray.length > MAX_ANSWERS_COUNT) {
    throw new Error('must have at least 2 answers, and no more than 6 answers!');
  }
  // check length of answer strings

  for (const answer of answersArray) {
    if (answer.answer.length < MIN_ANSWER_LENGTH || answer.answer.length > MAX_ANSWER_LENGTH) {
      throw new Error('answers must be more than 1 characters and less than 30 characters');
    }
  }

  // Iterate thorugh answers array and check if there is at least one correct answer
  if (answersArray.some(answer => answer.correct === true) === false) {
    throw new Error('There must be at least one correct answer');
  }

  // Check that total duration of quiz is nowt longer than 3 minutes
  if (quiz.duration + duration > MAX_TOTAL_DURATION) {
    throw new Error('Question duration too long!, total Quiz Duration cannot exceed 3 minutes!');
  }

  // Duration is not a positive number
  if (duration < 0) {
    throw new Error('Time cannot be negative!');
  }

  // Check if points are between 1 and 10 points
  if (points > MAX_POINTS || points < MIN_POINTS) {
    throw new Error('points must be between 1 and 10 points!');
  }

  const colours = ['Red', 'Green', 'Yellow', 'Blue'];
  // add random colour and answer id to answer object within answers array

  for (let i = 0; i < answersArray.length; i++) {
    answersArray[i].colour = getRandomElement(colours);
    answersArray[i].answerId = i;
  }

  // add question to questions array witin the Quiz
  const questionObject = {
    questionId: quiz.questions.length,
    question: question,
    duration: duration,
    points: points,
    answers: answersArray,
  };

  // find index of the specific quiz
  const index = data.quizzes.findIndex(quiz => quiz.quizId === quizId);

  data.quizzes[index].questions.push(questionObject);
  data.quizzes[index].duration = data.quizzes[index].duration + duration;
  data.quizzes[index].timeLastEdited = Date.now();
  setData(data);

  return { questionId: quiz.questions.length - 1 };
}

/**
 * Creates a new question within a specified quiz, including validation of various input parameters and handling of a thumbnail URL.
 *
 * @param {string} token - The authentication token of the user creating the question.
 * @param {string} question - The text of the new question to be added.
 * @param {number} duration - The duration (in seconds) allowed for answering the question.
 * @param {number} points - The points awarded for correctly answering the question.
 * @param {Answers[]} answersArray - An array of possible answers, including which ones are correct.
 * @param {number} quizId - The ID of the quiz to which the new question will be added.
 * @param {string} thumbnailUrl - The URL of the thumbnail image for the question.
 * @returns {{ questionId: number } | ErrorMsg} - Returns an object containing the `questionId` of the newly created question, or an `ErrorMsg` if validation fails.
 * @throws {Error} - Throws an error if the token is invalid, the quiz does not exist, the user does not own the quiz, or if any input fails validation.
 */
export function adminQuestionCreateV2(token: string,
  question: string,
  duration: number,
  points: number,
  answersArray: Answers[],
  quizId: number,
  thumbnailUrl : string) :{questionId: number} | ErrorMsg {
  // validate the existence of the user:
  let authUserId : number;

  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    // returns {error: Invalid token!}
    throw new Error('Invalid token!');
  } else {
    authUserId = authResult.authUserId;
  }

  // validate the existence of the quiz
  const data: Data = getData();

  if (data.quizzes.some(quiz => quiz.quizId === quizId) === false) {
    throw new Error('Quiz does not exist!');
  }

  // assign the found Quiz to this variable
  const quiz: Quiz = data.quizzes.find(quiz => quiz.quizId === quizId);
  // Check ownership of the quiz
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz is not owned by YOU!');
  }

  // determine whether duplicate answers have been provided
  const foundArray:{answer: string, correct: boolean}[] = [];
  for (const answer of answersArray) {
    if (foundArray.some(object => object.answer === answer.answer)) {
      throw new Error('Duplicate Answer Provided!');
    } else {
      foundArray.push(answer);
    }
  }

  // Check question string length
  if (question.length < MIN_QUESTION_LENGTH || question.length > MAX_QUESTION_LENGTH) {
    throw new Error('Question must be between 5 and 50 characters!');
  }

  // checks answers array length;
  if (answersArray.length < MIN_ANSWERS_COUNT || answersArray.length > MAX_ANSWERS_COUNT) {
    throw new Error('must have at least 2 answers, and no more than 6 answers!');
  }
  // check length of answer strings

  for (const answer of answersArray) {
    if (answer.answer.length < MIN_ANSWER_LENGTH || answer.answer.length > MAX_ANSWER_LENGTH) {
      throw new Error('answers must be more than 1 characters and less than 30 characters');
    }
  }

  // Iterate thorugh answers array and check if there is at least one correct answer
  if (answersArray.some(answer => answer.correct === true) === false) {
    throw new Error('There must be at least one correct answer');
  }

  // Check that total duration of quiz is nowt longer than 3 minutes
  if (quiz.duration + duration > MAX_TOTAL_DURATION) {
    throw new Error('Question duration too long!, total Quiz Duration cannot exceed 3 minutes!');
  }

  // Duration is not a positive number
  if (duration < 0) {
    throw new Error('Time cannot be negative!');
  }

  // Check if points are between 1 and 10 points
  if (points > MAX_POINTS || points < MIN_POINTS) {
    throw new Error('points must be between 1 and 10 points!');
  }

  // Checks conditions for thumbnail URL
  if (thumbnailUrl === '') {
    throw new Error('thumbnail URL cannot be an empty string');
  }
  const validProtocols = ['http://', 'https://'];
  const validExtensions = ['.jpg', '.jpeg', '.png'];

  if (validProtocols.some(protocol => thumbnailUrl.startsWith(protocol)) === false) {
    throw new Error('The provded thumbnail does not start with http:// or https://');
  }

  if (validExtensions.some(extension => thumbnailUrl.endsWith(extension)) === false) {
    throw new Error('The provided thumbnail does not end with jpg, jpeg or png');
  }

  const colours = ['Red', 'Green', 'Yellow', 'Blue'];
  // add random colour and answer id to answer object within answers array

  for (let i = 0; i < answersArray.length; i++) {
    answersArray[i].colour = getRandomElement(colours);
    answersArray[i].answerId = i;
  }

  // add question to questions array witin the Quiz
  const questionObject = {
    questionId: quiz.questions.length,
    question: question,
    duration: duration,
    points: points,
    answers: answersArray,
    thumbnailUrl: thumbnailUrl
  };

  // find index of the specific quiz
  const index = data.quizzes.findIndex(quiz => quiz.quizId === quizId);

  data.quizzes[index].questions.push(questionObject);
  data.quizzes[index].duration = data.quizzes[index].duration + duration;
  data.quizzes[index].timeLastEdited = Date.now();
  setData(data);

  return { questionId: quiz.questions.length - 1 };
}

/**
 * Deletes a specific question from a specified quiz, including validation of user authentication and ownership.
 *
 * @param {string} token - The authentication token of the user performing the deletion.
 * @param {number} quizId - The ID of the quiz from which the question will be deleted.
 * @param {number} questionId - The ID of the question to be deleted.
 * @returns {void} - This function does not return a value. It modifies the data in place and updates the quiz.
 * @throws {Error} - Throws an error if the token is invalid, the user is not found, the quiz does not exist, the user does not own the quiz, or the question does not exist within the quiz.
 */
export function QuizQuestionDeleteV1(token: string, quizId: number, questionId: number): void {
  const data: Data = getData();

  // Validate the token and get the authUserId
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error(authResult.error);
  }
  const authUserId = authResult.authUserId;

  // Validate user existence
  const user: User | undefined = data.users.find(u => u.authUserId === authUserId);
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

  // Validate question existence within the quiz
  const questionIndex = quiz.questions?.findIndex(q => q.questionId === questionId);
  if (questionIndex === -1) {
    throw new Error('Question ID does not refer to a valid question within this quiz');
  }
  // Remove the question
  quiz.questions?.splice(questionIndex, 1);

  // Update the timeLastEdited
  const timestamp = Date.now();
  quiz.timeLastEdited = timestamp;

  setData(data);
}

/**
   * Deletes a specific question from a specified quiz, with additional validation for active quiz sessions.
   *
   * @param {string} token - The authentication token of the user performing the deletion.
   * @param {number} quizId - The ID of the quiz from which the question will be deleted.
   * @param {number} questionId - The ID of the question to be deleted.
   * @returns {void} - This function does not return a value. It modifies the data in place and updates the quiz.
   * @throws {Error} - Throws an error if the token is invalid, the user is not found, the quiz does not exist, the user does not own the quiz, the question does not exist within the quiz, or if there is an active session for the quiz that is not in the END state.
   */
export function QuizQuestionDeleteV2(token: string, quizId: number, questionId: number): void {
  const data: Data = getData();

  // Validate the token and get the authUserId
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  }
  const authUserId = authResult.authUserId;

  // Validate user existence
  const user: User | undefined = data.users.find(u => u.authUserId === authUserId);
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

  // Validate question existence within the quiz
  const questionIndex = quiz.questions?.findIndex(q => q.questionId === questionId);
  if (questionIndex === undefined || questionIndex === -1) {
    throw new Error('Question ID does not refer to a valid question within this quiz');
  }

  // Validate that any session for this quiz is in the END state (New check)
  const session: QuizSession | undefined = data.QuizSessions.find(s => s.quiz.quizId === quizId);
  if (session && session.state !== State.END) {
    throw new Error('There is still an active session for this quiz that is not in the END state');
  }

  // Remove the question
  quiz.questions?.splice(questionIndex, 1);

  // Update the timeLastEdited
  const timestamp = Date.now();
  quiz.timeLastEdited = timestamp;

  setData(data);
}

/**
  * Updates the name of the specified quiz.
  *
  * @param {string} token - The ID of the authenticated user making the request.
  * @param {number} quizId - The ID of the quiz to be updated.
  * @param {string} userEmail - The email of the user
  * @returns { {success: true} | ErrorMsg } - Function returns an object indicating success or an error.
  */
export function transferQuiz(token: string, quizId: number, userEmail: string): object {
  const data: Data = getData();

  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  }

  const authUserId = authResult.authUserId;

  // Find the quiz
  const quiz = data.quizzes.find(q => q.quizId === quizId && q.userId === authUserId);
  if (!quiz || quiz.deleted) {
    throw new Error('Quiz ID does not refer to a valid quiz.');
  }

  // Find the new owner by email
  const newOwner = data.users.find(user => user.email === userEmail);
  if (!newOwner) {
    throw new Error('userEmail is not a real user.');
  }

  // Check if the new owner is the same as the current owner
  if (newOwner.authUserId === authUserId) {
    throw new Error('userEmail is the current logged in user.');
  }

  // Check if the new owner already has a quiz with the same name
  const existingQuiz = data.quizzes.find(q => q.userId === newOwner.authUserId && q.name === quiz.name);
  if (existingQuiz) {
    throw new Error('Quiz ID refers to a quiz that has a name that is already used by the target user.');
  }

  // Transfer ownership
  quiz.userId = newOwner.authUserId;

  // Update the timeLastEdited
  quiz.timeLastEdited = Date.now();

  // Update the data store
  setData(data);
  return {};
}

/**
 * Duplicates a question within a specified quiz.
 *
 * @param {string} token - The authentication token of the user performing the duplication.
 * @param {number} quizId - The ID of the quiz in which the question will be duplicated.
 * @param {number} questionId - The ID of the question to be duplicated.
 * @returns {{ newQuestionId: number }} - An object containing the ID of the newly created question.
 * @throws {Error} - Throws an error if the token is invalid, the user is not valid, the quiz does not exist, the quiz is not owned by the user, or the question does not exist within the quiz.
 */
export function adminQuizDuplicateQuestionV1(token: string, quizId: number, questionId: number): { newQuestionId: number }| ErrorMsg {
  const data: Data = getData();

  // Validate the token and get the authUserId
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error(authResult.error);
  }
  const authUserId = authResult.authUserId;

  // Check if the user is valid
  const userExists: User | undefined = data.users.find(user => user.authUserId === authUserId);
  if (!userExists) {
    throw new Error('AuthUserId is not a valid user.');
  }

  // Check if the quiz exists
  const quizExists: Quiz | undefined = data.quizzes.find(quiz => quiz.quizId === quizId);
  if (!quizExists) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns.');
  }

  // Check if the quiz is owned by the user
  if (quizExists.userId !== authUserId) {
    throw new Error('Quiz is not owned by YOU!');
  }

  // Check if the question exists within the quiz
  const questionExists: Question | undefined = quizExists.questions.find(question => question.questionId === questionId);
  if (!questionExists) {
    throw new Error('Question Id does not refer to a valid question within this quiz.');
  }

  // Create a new question ID
  const newQuestionId = data.quizzes.reduce((maxId, quiz) => Math.max(maxId, ...quiz.questions.map(q => q.questionId)), 0) + 1;
  const timestamp = Date.now();

  // Duplicate the question
  const newQuestion: Question = {
    questionId: newQuestionId,
    question: questionExists.question,
    duration: questionExists.duration,
    points: questionExists.points,
    answers: questionExists.answers.map(answer => ({
      answerId: answer.answerId,
      answer: answer.answer,
      colour: answer.colour,
      correct: answer.correct
    })),
  };

  // Add the duplicated question to the quiz
  quizExists.questions.push(newQuestion);

  // Update the quiz's timeLastEdited
  quizExists.timeLastEdited = timestamp;

  // Update the data store
  setData(data);

  // Return the new question ID
  return { newQuestionId: newQuestionId };
}

/**
   * Duplicates a question within a specified quiz and returns the new question ID.
   *
   * @param {string} token - The authentication token of the user performing the duplication.
   * @param {number} quizId - The ID of the quiz in which the question will be duplicated.
   * @param {number} questionId - The ID of the question to be duplicated.
   * @returns {{ newQuestionId: number }} - An object containing the ID of the newly created question.
   * @throws {Error} - Throws an error if the token is invalid, the user is not valid, the quiz does not exist, the quiz is not owned by the user, or the question does not exist within the quiz.
   */
export function adminQuizDuplicateQuestionV2(token: string, quizId: number, questionId: number): { newQuestionId: number }| ErrorMsg {
  const data: Data = getData();

  // Validate the token and get the authUserId
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error(authResult.error);
  }
  const authUserId = authResult.authUserId;

  // Check if the user is valid
  const userExists: User | undefined = data.users.find(user => user.authUserId === authUserId);
  if (!userExists) {
    throw new Error('AuthUserId is not a valid user.');
  }

  // Check if the quiz exists
  const quizExists: Quiz | undefined = data.quizzes.find(quiz => quiz.quizId === quizId);
  if (!quizExists) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns.');
  }

  // Check if the quiz is owned by the user
  if (quizExists.userId !== authUserId) {
    throw new Error('Quiz is not owned by YOU!');
  }

  // Check if the question exists within the quiz
  const questionExists: Question | undefined = quizExists.questions.find(question => question.questionId === questionId);
  if (!questionExists) {
    throw new Error('Question Id does not refer to a valid question within this quiz.');
  }

  // Create a new question ID
  const newQuestionId = data.quizzes.reduce((maxId, quiz) => Math.max(maxId, ...quiz.questions.map(q => q.questionId)), 0) + 1;
  const timestamp = Date.now();

  // Duplicate the question
  const newQuestion: Question = {
    questionId: newQuestionId,
    question: questionExists.question,
    duration: questionExists.duration,
    points: questionExists.points,
    answers: questionExists.answers.map(answer => ({
      answerId: answer.answerId,
      answer: answer.answer,
      colour: answer.colour,
      correct: answer.correct
    })),
  };

  // Add the duplicated question to the quiz
  quizExists.questions.push(newQuestion);

  // Update the quiz's timeLastEdited
  quizExists.timeLastEdited = timestamp;

  // Update the data store
  setData(data);

  // Return the new question ID
  return { newQuestionId: newQuestionId };
}

/**
 * Moves a question to a new position within a specified quiz.
 *
 * @param {number} quizId - The ID of the quiz containing the question to be moved.
 * @param {number} questionId - The ID of the question to be moved.
 * @param {string} token - The authentication token of the user performing the move.
 * @param {number} newPosition - The new position for the question within the quiz.
 * @returns {object} - Returns an empty object on success.
 * @throws {Error} - Throws an error if the token is invalid, the quiz does not exist, the quiz is not owned by the user, the question does not exist, the new position is invalid, or the new position is the same as the current position.
 */
export function adminMoveQuestion(quizId: number, questionId: number, token: string, newPosition: number): object {
  // validate the existence of the user:
  let authUserId : number;

  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    // returns {error: Invalid token!}
    throw new Error('Invalid token!');
  } else {
    authUserId = authResult.authUserId;
  }

  // validate the existence of the quiz
  const data: Data = getData();

  if (data.quizzes.some(quiz => quiz.quizId === quizId) === false) {
    throw new Error('Quiz does not exist!');
  }

  // assign the found Quiz to this variable
  const quiz: Quiz = data.quizzes.find(quiz => quiz.quizId === quizId);
  const quizIndex = data.quizzes.findIndex(quiz => quiz.quizId === quizId);
  if (!quiz) {
    throw new Error('Quiz ID refers to a quiz that does not exist');
  }
  // Check ownership of the quiz
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz is not owned by YOU!');
  }

  // figure out index of question to be moved.
  const currentPosition = quiz.questions.findIndex(question => question.questionId === questionId);

  if (currentPosition < 0) {
    throw new Error('question Id does not refer to a valid quiz question!');
  }

  if (newPosition < 0 || newPosition > quiz.questions.length - 1) {
    throw new Error('valid newPosition must be provided');
  }

  if (newPosition === currentPosition) {
    throw new Error('New position equal current position!');
  }

  // move the quiz quesion:

  const removed = quiz.questions.splice(currentPosition, 1)[0];

  quiz.questions.splice(newPosition, 0, removed);

  data.quizzes[quizIndex].questions = quiz.questions;

  setData(data);

  return {};
}

/**
 * Updates an existing question within a specified quiz, including validation of various input parameters.
 *
 * @param {string} token - The authentication token of the user requesting the update.
 * @param {number} quizId - The ID of the quiz containing the question to be updated.
 * @param {number} questionId - The ID of the question to be updated.
 * @param {string} question - The updated question text.
 * @param {number} duration - The updated duration (in seconds) for answering the question.
 * @param {number} points - The updated points awarded for the question.
 * @param {Answers[]} answersArray - The updated list of possible answers, including which ones are correct.
 * @param {string} thumbnailUrl - The updated thumbnail URL for the question, applicable for version 2.
 * @param {number} version - The version of the quiz system; version 2 includes additional validations.
 * @returns {{ success?: true; error?: string }} - Returns an empty object if successful, or an object with an `error` property if validation fails.
 * @throws {Error} - Throws an error if the token is invalid, the user is not valid, the quiz or question does not exist, the user does not own the quiz, or if any input fails validation.
 */
export function adminQuizQuestionUpdate(token: string, quizId : number, questionId: number, question: string, duration: number, points: number, answersArray: Answers[], thumbnailUrl: string, version: number): { success?: true; error?: string } {
  const data: Data = getData();
  // Authenticate token
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error(authResult.error);
  }
  const authUserId = authResult.authUserId;
  // Validate user existence
  const user = data.users.find(user => user.authUserId === authUserId);
  if (!user) {
    throw new Error('AuthUserId is not a valid user.');
  }
  // Validate quiz existence
  const quiz = data.quizzes.find(quiz => quiz.quizId === quizId);
  if (!quiz) {
    throw new Error('Quiz ID does not refer to a valid quiz.');
  }
  // Validate quiz ownership
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns.');
  }
  // Find the question within the quiz
  const questionIndex = quiz.questions.findIndex(q => q.questionId === questionId);
  if (questionIndex === -1) {
    throw new Error('Question Id does not refer to a valid question within this quiz.');
  }
  // Validate question text length
  if (question.length < MIN_QUESTION_LENGTH || question.length > MAX_QUESTION_LENGTH) {
    throw new Error('Question string is less than 5 characters in length or greater than 50 characters in length.');
  }
  // Validate question duration
  if (duration <= 0) {
    throw new Error('The question duration is not a positive number.');
  }
  // Validate total duration of the quiz
  if (quiz.duration + duration > MAX_TOTAL_DURATION) {
    throw new Error('If this question were to be updated, the sum of the question durations in the quiz exceeds 3 minutes.');
  }
  // Validate question points
  if (points < MIN_POINTS || points > MAX_POINTS) {
    throw new Error('The points awarded for the question are less than 1 or greater than 10.');
  }
  // Validate Answer Length
  for (const answer of answersArray) {
    if (answer.answer.length < MIN_ANSWER_LENGTH || answer.answer.length > MAX_ANSWER_LENGTH) {
      throw new Error('The length of any answer is shorter than 1 character long, or longer than 30 characters long.');
    }
  }
  // Check for duplicate answers
  const foundArray:{answer: string, correct: boolean}[] = [];
  for (const answer of answersArray) {
    if (foundArray.some(object => object.answer === answer.answer)) {
      throw new Error('Duplicate Answer Provided!');
    } else {
      foundArray.push(answer);
    }
  }
  // Iterate thorugh answers array and check if there is at least one correct answer
  if (answersArray.some(answer => answer.correct === true) === false) {
    throw new Error('There must be at least one correct answer.');
  }
  // Ensure answersArray is an array before further validation
  if (!Array.isArray(answersArray)) {
    throw new Error('The question has more than 6 answers or less than 2 answers.');
  }
  // Validate number of answers
  if (answersArray.length < MIN_ANSWERS_COUNT || answersArray.length > MAX_ANSWERS_COUNT) {
    throw new Error('The question has more than 6 answers or less than 2 answers.');
  }
  if (version === 2) {
    // Validate thumbnail URL
    if (thumbnailUrl === '') {
      throw new Error('Thumbnail URL is an empty string.');
    }
    if (!/^https?:\/\/.*\.(jpg|jpeg|png)$/i.test(thumbnailUrl)) {
      throw new Error('Thumbnail URL must end with .jpg, .jpeg, or .png and begin with http:// or https://.');
    }
  }

  // Update the question in the quiz
  const quiz2 = quiz.questions.find(quiz => quiz.questionId === questionId);
  const questionIndex2 = quiz.questions.findIndex(q => q.questionId === questionId);
  const quizIndex = data.quizzes.findIndex(quiz => quiz.quizId === quizId);

  if (quiz2 !== undefined) {
    data.quizzes[quizIndex].questions[questionIndex2].question = question;
    data.quizzes[quizIndex].questions[questionIndex2].duration = duration;
    data.quizzes[quizIndex].questions[questionIndex2].points = points;
    data.quizzes[quizIndex].questions[questionIndex2].answers = answersArray;
    if (version === 2) {
      data.quizzes[quizIndex].questions[questionIndex2].thumbnailUrl = thumbnailUrl;
    }
    data.quizzes[quizIndex].timeLastEdited = Date.now();
    setData(data);
    return {};
  }
  // Save the updated data
  setData(data);
  return {};
}
