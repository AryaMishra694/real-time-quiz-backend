import { getAuthUserIdFromToken, containsInvalidCharacters } from './helperFunction.ts';
import { getData, setData } from './dataStore.ts';
import {
  User,
  Data,
  Quiz,
  ErrorMsg,
  State,
} from './interfaces.ts';

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 30;
const MAX_DESCRIPTION_LENGTH = 100;

/**
  * Provide a list of all quizzes that are owned by the currently logged in user.
  *
  * @param {number} authUserId - Unique user id number that is used to find user within database
  * @returns { { quizzes: [ { quizId: 1, name: 'My Quiz', } ] } }  - returns an object
  */
export function adminQuizList (token: string): {quizzes: {quizId: number, name: string}[]} | ErrorMsg {
  let authUserId: number;

  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  } else {
    authUserId = authResult.authUserId;
  }

  const dataStore = getData();
  // const quizzes_found = dataStore.quizzes.filter(found => found.authUserId === authUserId)
  const quizzesFound = dataStore.quizzes.filter(found => found.userId === authUserId);
  if (quizzesFound.length === 0) {
    return { quizzes: quizzesFound };
  }
  const quizzesFoundReturn = quizzesFound.map(quiz => ({
    name: quiz.name,
    quizId: quiz.quizId,
  }));

  return {
    quizzes: quizzesFoundReturn
  };
}

/**
  * Get all of the relevant information about the current quiz.
  *
  * @param {number} authUserId - a unique user id in order to find the a specific user within the
  * database
  * @param {number} quizId - a unique id associated with a specific quiz, used to find the quiz
  *
  * @returns {quizId: 1, name: 'My Quiz',
  *           timeCreated: 1683125870,
  *           timeLastEdited: 1683125871,
  *           description: 'This is my quiz',} - description of condition for return
  */
export function adminQuizInfo(token: string, quizId: number, version: number): Quiz {
  const data: Data = getData();

  let authUserId: number;

  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  } else {
    authUserId = authResult.authUserId;
  }

  // Validate the user ID
  const user = data.users.find(user => user.authUserId === authUserId);
  if (!user) {
    throw new Error('AuthUserId is not a valid user.');
  }

  // Validate the quiz ID
  const quiz = data.quizzes.find(quiz => quiz.quizId === quizId);
  if (!quiz || quiz.deleted) {
    throw new Error('Quiz ID does not refer to a valid quiz.');
  }

  // Check if the quiz belongs to the user making the request
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns.');
  }

  const timestamp = Date.now();
  const questions = quiz.questions ?? [];

  if (version === 1) {
    return {
      quizId: quiz.quizId,
      name: quiz.name,
      timeCreated: timestamp,
      timeLastEdited: timestamp,
      description: quiz.description,
      numQuestions: questions.length,
      questions: questions.map(q => ({
        questionId: q.questionId,
        question: q.question,
        duration: q.duration,
        points: q.points,
        answers: q.answers.map(a => ({
          answerId: a.answerId,
          answer: a.answer,
          colour: a.colour,
          correct: a.correct
        }))
      })),
      duration: questions.reduce((acc, q) => acc + q.duration, 0)
    };
  }

  return {
    quizId: quiz.quizId,
    name: quiz.name,
    timeCreated: timestamp,
    timeLastEdited: timestamp,
    description: quiz.description,
    numQuestions: questions.length,
    questions: questions.map(q => ({
      questionId: q.questionId,
      question: q.question,
      duration: q.duration,
      points: q.points,
      answers: q.answers.map(a => ({
        answerId: a.answerId,
        answer: a.answer,
        colour: a.colour,
        correct: a.correct
      })),
    })),
    duration: questions.reduce((acc, q) => acc + q.duration, 0),
    thumbnailUrl: quiz.thumbnailUrl || ''
  };
}

// ITERATION 2 : adminQuizCreateV1 , modified with error exception
/**
  * Given basic details about a new quiz, create one for the logged in user
  *
  * @param {number} authUserId - the valid author id  creating the quiz
  * @param {string} name -  refers to the quiz name
  * @param {string} description - description of the quiz
  * @returns {object} - object with quiz id is returned upon successful verification of the author
*/
export function adminQuizCreateV1(token:string, name: string, description: string): { quizId: number } | ErrorMsg {
  const data: Data = getData();
  // Validate the token and get the authUserId
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  }
  const authUserId = authResult.authUserId;
  // To check if the user is valid
  const userExists: User | undefined = data.users.find(user => user.authUserId === authUserId);
  if (!userExists) {
    throw new Error('AuthUserId is not a valid user.');
  }

  // To check if the name contains only valid characters
  const validNameRegex = /^[a-zA-Z0-9 ]+$/;
  if (!validNameRegex.test(name)) {
    throw new Error('Name contains invalid characters, (alphanumeric and spaces only).');
  }

  // To check if the name length is between 3 and 30 characters
  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    throw new Error('Name length should be between 3 to 30 characters long.');
  }

  // To check if the name is already used by the user
  const nameExistsForUser: Quiz | undefined = data.quizzes.find(quiz => quiz.userId === authUserId && quiz.name === name);
  if (nameExistsForUser) {
    throw new Error('Name is already used by the current logged-in user for another quiz.');
  }

  // To check if the description length is more than 100 characters
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error('Description is more than 100 characters in length.');
  }

  // Capture start time before creating the quiz
  const beforeTime = Date.now();
  // To create new quiz, quiz ID depends on index of quizzes array
  let newQuizId = data.quizzes.length + 1;
  // Check for conflicts with quiz IDs in the trash
  while (data.trash.some(trashItem => trashItem.quizId === newQuizId)) {
    newQuizId += 1;
  }
  const timestamp = Date.now();
  data.quizzes.push({
    quizId: newQuizId,
    userId: authUserId,
    name: name,
    timeCreated: timestamp,
    timeLastEdited: timestamp,
    description: description,
    questions: []
  });

  // Update the newly created quiz object inside data
  setData(data);
  // Capture end time after creating the quiz
  const afterTime = Date.now();
  // Internal test to validate timestamp within a 1-second range
  const createdQuiz = data.quizzes.find(quiz => quiz.quizId === newQuizId);
  if (createdQuiz) {
    if (createdQuiz.timeCreated < beforeTime || createdQuiz.timeCreated > afterTime + 1000) {
      console.error('Timestamp is out of the expected range');
    }
  } else {
    console.error('Failed to find created quiz for timestamp validation');
  }
  // Function returns stored QuizID after successful quiz creation
  return { quizId: newQuizId };
}

/**
 * Creates a new quiz with the given name and description, associating it with the authenticated user.
 *
 * @param {string} token - The authentication token of the user creating the quiz.
 * @param {string} name - The name of the quiz. Must be alphanumeric and between 3 to 30 characters long.
 * @param {string} description - The description of the quiz. Must be 100 characters or less.
 * @returns {{ quizId: number } | ErrorMsg} - Returns an object with the new quiz ID if creation is successful, or throws an error if any validation fails.
 * @throws {Error} - Throws an error if the token is invalid, the user is not valid, the quiz name contains invalid characters, the name length is out of range, the name is already used by the user, or the description is too long.
 */
export function adminQuizCreateV2(token:string, name: string, description: string): { quizId: number } | ErrorMsg {
  const data: Data = getData();

  // Validate the token and get the authUserId
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  }
  const authUserId = authResult.authUserId;
  // To check if the user is valid
  const userExists: User | undefined = data.users.find(user => user.authUserId === authUserId);
  if (!userExists) {
    throw new Error('AuthUserId is not a valid user.');
  }

  // To check if the name contains only valid characters
  const validNameRegex = /^[a-zA-Z0-9 ]+$/;
  if (!validNameRegex.test(name)) {
    throw new Error('Name contains invalid characters, (alphanumeric and spaces only).');
  }

  // To check if the name length is between 3 and 30 characters
  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
    throw new Error('Name length should be between 3 to 30 characters long.');
  }

  // To check if the name is already used by the user
  const nameExistsForUser: Quiz | undefined = data.quizzes.find(quiz => quiz.userId === authUserId && quiz.name === name);
  if (nameExistsForUser) {
    throw new Error('Name is already used by the current logged-in user for another quiz.');
  }

  // To check if the description length is more than 100 characters
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error('Description is more than 100 characters in length.');
  }

  // Capture start time before creating the quiz
  const beforeTime = Date.now();
  // To create new quiz, quiz ID depends on index of quizzes array
  let newQuizId = data.quizzes.length + 1;
  // Check for conflicts with quiz IDs in the trash
  while (data.trash.some(trashItem => trashItem.quizId === newQuizId)) {
    newQuizId += 1;
  }
  const timestamp = Date.now();
  data.quizzes.push({
    quizId: newQuizId,
    userId: authUserId,
    name: name,
    timeCreated: timestamp,
    timeLastEdited: timestamp,
    description: description,
    questions: []
  });

  // Update the newly created quiz object inside data
  setData(data);
  // Capture end time after creating the quiz
  const afterTime = Date.now();
  // Internal test to validate timestamp within a 1-second range
  const createdQuiz = data.quizzes.find(quiz => quiz.quizId === newQuizId);
  if (createdQuiz) {
    if (createdQuiz.timeCreated < beforeTime || createdQuiz.timeCreated > afterTime + 1000) {
      console.error('Timestamp is out of the expected range');
    }
  } else {
    console.error('Failed to find created quiz for timestamp validation');
  }
  // Function returns stored QuizID after successful quiz creation
  return { quizId: newQuizId };
}

/**
  * Given a particular quiz, permanently remove the quiz
  *
  * @param {number} authUserId - the valid user who is requesting for quiz removal, send to trash
  * @param {number} quizId - the quiz id that needs to be removed
  * @returns {empty object} - if the deletion is successful, empty object is returned
  */
// ITERATION 2 : AdminQuizRemoveV1 - added error exception
export function adminQuizRemoveV1(token: string, quizId: number): object {
  // Fetch data containing users and quizzes details
  const data: Data = getData();

  // Validate the token and get the authUserId
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    // Error: Invalid token!
    throw new Error(authResult.error);
  }
  const authUserId = authResult.authUserId;

  // Checking input types
  if (typeof authUserId !== 'number' || typeof quizId !== 'number') {
    throw new Error('Invalid input type');
  }

  // Validate user existence
  const user: User | undefined = data.users.find((u) => u.authUserId === authUserId);
  if (!user) {
    throw new Error('AuthUserId is not a valid user');
  }

  // Validate quiz existence
  const quizIndex: number = data.quizzes.findIndex((q) => q.quizId === quizId);
  if (quizIndex === -1) {
    throw new Error('Quiz ID does not refer to a valid quiz');
  }

  // Validate quiz ownership
  const quiz: Quiz = data.quizzes[quizIndex];
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns');
  }
  // Move the quiz to the trash
  data.trash.push(quiz);

  // Remove the quiz from the quizzes array
  data.quizzes.splice(quizIndex, 1);

  // Update the timeLastEdited
  const timestamp = Date.now();
  quiz.timeLastEdited = timestamp;

  setData(data);
  return {};
}

/**
 * Permanently removes a quiz and moves it to the trash, provided the quiz is not currently in use.
 *
 * @param {string} token - The authentication token of the user requesting the quiz removal.
 * @param {number} quizId - The ID of the quiz to be removed.
 * @returns {object} - Returns an empty object if the removal is successful, or throws an error if any validation fails.
 * @throws {Error} - Throws an error if the token is invalid, the user is not valid, the quiz ID does not exist, the user does not own the quiz, or if any session associated with the quiz is not in the END state.
 */
export function adminQuizRemoveV2(token: string, quizId: number): object {
  const data: Data = getData();

  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!'); // Ensure this matches the server route check
  }
  const authUserId = authResult.authUserId;

  if (typeof authUserId !== 'number' || typeof quizId !== 'number') {
    throw new Error('Invalid input type');
  }

  const user: User | undefined = data.users.find((u) => u.authUserId === authUserId);
  if (!user) {
    throw new Error('AuthUserId is not a valid user'); // Ensure this matches the server route check
  }

  const quizIndex: number = data.quizzes.findIndex((q) => q.quizId === quizId);
  if (quizIndex === -1) {
    throw new Error('Quiz ID does not refer to a valid quiz'); // Ensure this matches the server route check
  }

  const quiz: Quiz = data.quizzes[quizIndex];
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns'); // Ensure this matches the server route check
  }

  const sessions = data.QuizSessions.filter(session => session.quiz.quizId === quizId);
  if (sessions.some(session => session.state !== State.END)) {
    throw new Error('A session for this quiz is not in END state'); // Ensure this matches the server route check
  }

  data.trash.push(quiz);
  data.quizzes.splice(quizIndex, 1);

  const timestamp = Date.now();
  quiz.timeLastEdited = timestamp;

  setData(data);
  return {};
}

/**
  * Update the description of the relevant quiz
  *
  * @param {number} authUserId - A unique user id to identify the specific user within the database.
  * @param {number} quizId - A unique id associated with a specific quiz, used to find the quiz.
  * @param {string} description - The new description to be set for the quiz.
  * @returns {void} - This function does not return a value.
  */
export function adminQuizDescriptionUpdate(token: string, quizId: number, description: string): object {
  const data: Data = getData();

  // Validate and extract user ID from the token
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  }
  const authUserId: number = authResult.authUserId;

  // Validate the user ID
  const user = data.users.find(user => user.authUserId === authUserId);
  if (!user) {
    throw new Error('AuthUserId is not a valid user.');
  }

  // Validate the description
  if (typeof description !== 'string') {
    throw new Error('Description must be a string.');
  }

  if (description.length > 100) {
    throw new Error('Description is too long.');
  }

  // Validate the quiz ID
  const quiz = data.quizzes.find(quiz => quiz.quizId === quizId);
  if (!quiz || quiz.deleted) {
    throw new Error('Quiz ID does not refer to a valid quiz.');
  }

  // Check ownership of the quiz
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns.');
  }

  // Update the quiz description
  const index = data.quizzes.findIndex(quiz => quiz.quizId === quizId);
  data.quizzes[index].description = description;
  data.quizzes[index].timeLastEdited = Date.now();
  setData(data);
  return {};
}

/**
  * Updates the name of the specified quiz.
  *
  * @param {number} authUserId - The ID of the authenticated user making the request.
  * @param {number} quizId - The ID of the quiz to be updated.
  * @param {string} name - The new name for the quiz.
  * @returns { {success: true} | ErrorMsg } - Function returns an object indicating success or an error.
  */
export function adminQuizNameUpdate(token : string, quizId : number, name : string): {success?:true, error?: string} {
  const data : Data = getData();

  // validate the name length
  if (name.length < MIN_NAME_LENGTH) {
    throw new Error('Name contains too few characters.');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error('Name contains too many characters.');
  } else if (containsInvalidCharacters(name)) {
    throw new Error('Name contains invalid characters.');
  }

  let authUserId : number;
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error(authResult.error);
  } else {
    authUserId = authResult.authUserId;
  }

  // validate user existence
  function isValidUser(authUserId : number) {
    const user = data.users.find(user => user.authUserId === authUserId);
    return user;
  }
  if (!isValidUser(authUserId)) {
    throw new Error('AuthUserId is not a valid user.');
  }

  // validate quiz existence
  function isValidQuiz(quizId : number) {
    const quiz = data.quizzes.find(quizzes => quizzes.quizId === quizId);
    return quiz;
  }
  if (!isValidQuiz(quizId)) {
    throw new Error('Quiz ID does not refer to a valid quiz.');
  }

  // validate whether quiz belongs to the user

  function isQuizOwnedCorrectUser(authUserId : number, quizId : number) {
    const quiz = data.quizzes.find(quizzes => quizzes.quizId === quizId);
    if (quiz.userId === authUserId) {
      return true;
    }
    return false;
  }

  if (!isQuizOwnedCorrectUser(authUserId, quizId)) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns.');
  }

  // Check if name is already taken by user in previous quiz
  function isDuplicateName(authUserId : number, quizId : number, name : string) {
    const result = adminQuizList(token);
    if ('quizzes' in result) {
      const allQuizzes = result.quizzes;
      for (const i of allQuizzes) {
        if (i.name === name) {
          return true;
        }
      }
      return false;
    }
  }
  if (isDuplicateName(authUserId, quizId, name)) {
    throw new Error('Name is already used by the current logged in user for another quiz.');
  }

  // All validations are done, now basic implementation of function
  // Update quiz name
  const index = data.quizzes.findIndex(quiz => quiz.quizId === quizId);

  if (index !== -1) {
    data.quizzes[index].name = name;
    data.quizzes[index].timeLastEdited = Date.now();
    setData(data);
    return {};
  }
  setData(data);
  return {};
}

/**
 * Restores a quiz from the trash to the active quizzes list.
 *
 * @param {string} token - The authentication token of the user performing the restoration.
 * @param {number} quizId - The ID of the quiz to be restored.
 * @returns {object | ErrorMsg} - Returns an empty object on success or an error message if the operation fails.
 * @throws {Error} - Throws an error if the token is invalid, the quiz does not exist, the quiz is not in the trash, the user is not the owner, or the quiz name already exists in the active quizzes.
 */
export function adminQuizRestore(token: string, quizId: number): object | ErrorMsg {
  const data: Data = getData();
  let authUserId : number;
  // Token is empty or invalid
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error(authResult.error);
  } else {
    authUserId = authResult.authUserId;
  }
  // Quiz doesnt exist and QuizID refers to quiz not in trash
  const quizexistintrasharray = data.trash.findIndex(quiz => quiz.quizId === quizId);
  const quizexistinquizarray = data.quizzes.findIndex(quiz => quiz.quizId === quizId);
  if (quizexistinquizarray === -1 && quizexistintrasharray === -1) {
    throw new Error('Quiz ID refers to a quiz that does not exist');
  }
  if (quizexistintrasharray === -1 && !(quizexistinquizarray === -1)) {
    throw new Error('Quiz ID refers to a quiz that is not currently in the trash');
  }
  // Valid Token, but user is not an owner of this quiz
  const quiz = data.trash[quizexistintrasharray];
  if (quiz.userId !== authUserId) {
    throw new Error('User is not the owner of this quiz');
  }
  // Quiz name of the restored quiz is already used by another active quiz
  const quizNameExists = data.quizzes.find(q => q.name === quiz.name);
  if (quizNameExists) {
    throw new Error('Quiz name of the restored quiz is already used by another active quiz');
  }
  // Restore Quiz from trashes to quizzes array
  const [restoredQuiz] = data.trash.splice(quizexistintrasharray, 1);
  restoredQuiz.timeLastEdited = Date.now();
  data.quizzes.push(restoredQuiz);
  setData(data);
  return {};
}

/**
 * Updates the thumbnail URL for a quiz.
 * @param token - The authentication token of the user making the request.
 * @param quizId - The ID of the quiz to update.
 * @param imgUrl - The new image URL for the quiz thumbnail.
 * @returns object - An empty object upon success.
 * @throws Error if the token is invalid, the URL is invalid, or the quiz ID is invalid.
 */
export function adminQuizThumbnailUpdate(token: string, quizId: number, imgUrl: string): object {
  const data: Data = getData();
  // Validate and extract user ID from the token
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error('Invalid token!');
  }
  const authUserId = authResult.authUserId;

  // Validate the URL
  if (typeof imgUrl !== 'string') {
    throw new Error('Image URL must be a string.');
  }
  if (!imgUrl.startsWith('http://') && !imgUrl.startsWith('https://')) {
    throw new Error('Image URL must start with "http://" or "https://".');
  }
  if (!imgUrl.match(/\.(jpg|jpeg|png)$/i)) {
    throw new Error('Image URL must end with one of the following file types: jpg, jpeg, png.');
  }

  // Validate the quiz ID
  const quiz = data.quizzes.find(q => q.quizId === quizId);
  if (!quiz) {
    throw new Error('Quiz ID does not refer to a valid quiz.');
  }
  // Check ownership of the quiz
  if (quiz.userId !== authUserId) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns.');
  }

  // Update the quiz thumbnail and timestamp
  quiz.thumbnailUrl = imgUrl;
  quiz.timeLastEdited = Math.floor(Date.now() / 1000);
  setData(data);

  return {};
}
