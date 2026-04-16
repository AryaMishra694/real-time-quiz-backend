import express, { json, Request, Response } from 'express';
import morgan from 'morgan';
import config from './config.json';
import cors from 'cors';
import YAML from 'yaml';
import sui from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import process from 'process';
import {
  adminAuthLogin,
  adminAuthRegister,
  adminUserPasswordUpdate,
  adminUserDetails,
  adminAuthLogout,
  adminUserDetailsUpdate
} from './auth.ts';

import {
  adminQuizRemoveV1,
  adminQuizRemoveV2,
  adminQuizCreateV1,
  adminQuizCreateV2,
  adminQuizList,
  adminQuizInfo,
  adminQuizDescriptionUpdate,
  adminQuizNameUpdate,
  adminQuizRestore,
  adminQuizThumbnailUpdate,
} from './quiz.ts';

import {
  emptyTrash,
  adminViewTrash,
  clear
} from './other.ts';

import {
  startSession,
  adminSessionChatSend,
  // adminQuizSessionUpdate,
  adminQuizSessionStatus,
  adminQuizSessionResultsCSV,
  ViewQuizSessions,
  adminSessionFinalResultInGame,
  adminSessionFinalResult
} from './session.ts';

import {
  PlayerJoin,
  QuizSessionPlayerStatus,
  PlayerSubmitAnswer,
  getPlayerCurrentQuestionDetail,
  playerChatGet,
  getQuestionResults
} from './player.ts';

import {
  adminQuestionCreate,
  adminQuestionCreateV2,
  QuizQuestionDeleteV1,
  QuizQuestionDeleteV2,
  transferQuiz,
  adminQuizDuplicateQuestionV1,
  adminQuizDuplicateQuestionV2,
  adminMoveQuestion,
  adminQuizQuestionUpdate,
} from './question.ts';

// Set up web app
const app = express();
// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());
// for logging errors (print to terminal)
app.use(morgan('dev'));
// for producing the docs that define the API
const file = fs.readFileSync(path.join(process.cwd(), 'swagger.yaml'), 'utf8');
app.get('/', (req: Request, res: Response) => res.redirect('/docs'));
app.use('/docs', sui.serve, sui.setup(YAML.parse(file), { swaggerOptions: { docExpansion: config.expandDocs ? 'full' : 'list' } }));

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || '127.0.0.1';

// ====================================================================
//  ================= WORK IS DONE BELOW THIS LINE ===================
// ====================================================================

// Example get request
// app.get('/echo', (req: Request, res: Response) => {
//   const result = echo(req.query.echo as string);
//   if ('error' in result) {
//     res.status(400);
//   }

// Server route for adminAuthRegister
app.post('/v1/admin/auth/register', (req: Request, res: Response) => {
  const { email, password, nameFirst, nameLast } = req.body;
  try {
    const result = adminAuthRegister(email, password, nameFirst, nameLast);
    return res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Email address is already used by another user.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Email is not valid.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'First name contains invalid characters.' || error.message === 'Last name contains invalid characters.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Password must be at least 8 characters long.' || error.message === 'Password must contain at least one number and one letter.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'First name must be between 2 and 20 characters.' || error.message === 'Last name must be between 2 and 20 characters.') {
      return res.status(400).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
});

//  ITERATION 2 : Server route for adminAuthLoginV1
app.post('/v1/admin/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Call the adminAuthLogin function with the provided email and password
    const result = adminAuthLogin(email, password);

    // Successful login, return the token for the user
    return res.status(200).json({ token: result.token });
  } catch (error) {
    // Check if the error message is about the email or password
    if (error.message === 'Invalid email, please try again') {
      return res.status(400).json({ error: 'Invalid email, please try again' });
    }
    if (error.message === 'Invalid password') {
      return res.status(400).json({ error: 'Invalid password' });
    }
    // For any other error, return a generic error message
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
});

// Server route for clear
app.delete('/v1/clear', (req: Request, res: Response) => {
  clear();
  return res.status(200).json({});
});

//  ITERATION 2: Server route  for adminQuizCreateV1
app.post('/v1/admin/quiz', (req: Request, res: Response) => {
  const { token, name, description } = req.body;
  try {
    // Call the adminQuizCreate function to handle token validation and quiz creation
    const response = adminQuizCreateV1(token, name, description);
    // Return successful response, quizId is returned
    return res.status(200).json(response);
  } catch (e) {
    // Handle error responses
    if (e.message === 'Invalid token!' || e.message === 'AuthUserId is not a valid user.') {
      return res.status(401).json({ error: e.message });
    } else {
      return res.status(400).json({ error: e.message });
    }
  }
});

// Server Route for AdminAuthLogout
app.post('/v1/admin/auth/logout', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const result = adminAuthLogout(token);
    return res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    }
  }
  return res.status(500).json({ error: 'An unexpected error occurred.' });
});

// Server route for adminUserPasswordUpdate
app.put('/v1/admin/user/password', (req: Request, res: Response) => {
  try {
    const { token, oldPassword, newPassword } = req.body;
    const response = adminUserPasswordUpdate(token, oldPassword, newPassword);
    res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else {
      return res.status(400).json({ error: error.message });
    }
  }
  // const { token, oldPassword, newPassword } = req.body;

  // const response = adminUserPasswordUpdate(token, oldPassword, newPassword);

  // if ('error' in response) {
  //   if (response.error === 'Invalid token!') {
  //     return res.status(401).json(response);
  //   } else {
  //     return res.status(400).json(response);
  //   }
  // }

  // res.status(200).json(response);
});

//  ITERATION 2 : adminQuizRemove's HTTP route
app.delete('/v1/admin/quiz/:quizid', (req: Request, res: Response) => {
  try {
    // Extract the token from the query string parameters
    const { token } = req.query;

    // Extract the quiz ID from the request parameters and convert it to a number
    const { quizid } = req.params;
    const quizIdNumber = Number(quizid);

    // Call the adminQuizRemove function to handle token validation and quiz removal
    const response = adminQuizRemoveV1(token as string, quizIdNumber);

    // Return successful response if quiz removal was successful
    res.status(200).json(response);
  } catch (e) {
    // Handle errors and send appropriate response
    if (e.message === 'Invalid token!' || e.message === 'AuthUserId is not a valid user') {
      res.status(401).json({ error: e.message });
    } else if (e.message === 'Quiz ID does not refer to a valid quiz' ||
               e.message === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(403).json({ error: e.message });
    } else {
      // Handle any other unexpected errors
      res.status(400).json({ error: e.message });
    }
  }
});

app.get('/v1/admin/quiz/trash', (req: Request, res: Response) => {
  const token = req.query.token as string;
  try {
    const response = adminViewTrash(token);
    res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    }
  }
  return res.status(500).json('Internal server error');
});

// Server Route for adminQuizDescriptionUpdate - ITERATION 2
app.put('/v1/admin/quiz/:quizid/description', (req: Request, res: Response) => {
  const token = req.body.token as string;
  const description = req.body.description as string;
  const { quizid } = req.params;

  // Convert quizid from string in URL to number
  const quizIdNumber = Number(quizid);

  try {
    // Call the business logic function
    adminQuizDescriptionUpdate(token, quizIdNumber, description);
    // Send success response
    res.status(200).json({});
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      res.status(401).json({ error: error.message });
    } else if (error.message === 'Description is too long.' ||
               error.message === 'Description must be a string.') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a valid quiz.' ||
               error.message === 'Quiz ID does not refer to a quiz that this user owns.') {
      res.status(403).json({ error: error.message });
    } else {
      // Catch-all for any other unexpected errors
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// lists quizzes owned by the specific user
app.get('/v1/admin/quiz/list', (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (typeof token !== 'string') {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    const response = adminQuizList(token);
    return res.status(200).json(response);
  } catch (e) {
    if (e.message === 'Invalid token!') {
      return res.status(401).json({ error: e.message });
    }
  }
  return res.status(500).json({ error: 'Internal Server Error' });
});

// Server route for adminQuizInfo - ITERATION 2
app.get('/v1/admin/quiz/:quizid', (req: Request, res: Response) => {
  const token = req.query.token as string;
  const { quizid } = req.params;

  // Convert quizid from string in URL to number
  const quizIdNumber = Number(quizid);

  try {
    const result = adminQuizInfo(token, quizIdNumber, 1);
    res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      res.status(401).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a valid quiz.' ||
               error.message === 'AuthUserId is not a valid user.' ||
               error.message === 'Quiz ID does not refer to a quiz that this user owns.') {
      res.status(403).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Server Route for adminuserdetails
app.get('/v1/admin/user/details', (req: Request, res: Response) => {
  const token = req.query.token;
  if (typeof token !== 'string') {
    return res.status(401).json({ error: 'Invalid token format' });
  }
  try {
    const result = adminUserDetails(token);
    return res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'User not found.') {
      return res.status(404).json({ error: error.message });
    }
  }
});

// Server route for adminQuizNameUpdate
app.put('/v1/admin/quiz/:quizid/name', (req: Request, res: Response) => {
  const { token, name } = req.body;
  const quizId = parseInt(req.params.quizid);

  try {
    const result = adminQuizNameUpdate(token, quizId, name);
    return res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Name contains too few characters.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Name contains too many characters.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Name contains invalid characters.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a valid quiz.') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a quiz that this user owns.') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Name is already used by the current logged in user for another quiz.') {
      return res.status(400).json({ error: error.message });
    }
  }
});

// Server route for adminUserDetailsUpdate
app.put('/v1/admin/user/details', (req: Request, res: Response) => {
  try {
    const { token, email, nameFirst, nameLast } = req.body;
    const response = adminUserDetailsUpdate(token, email, nameFirst, nameLast);
    return res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'User does not exist!') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Invalid email!') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Email is already used by another user') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'First or Last Name is too long or short. Must be between 2 to 20 letters') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'First name contains invalid characters.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Last name contains invalid characters.') {
      return res.status(400).json({ error: error.message });
    }
  }
  return res.status(500).json('internal server error');
});

// Route for updating a quiz question name
app.put('/v1/admin/quiz/:quizId/question/:questionId', (req: Request, res: Response) => {
  const { quizId, questionId } = req.params;
  const { token, questionBody } = req.body;
  const questionIdnum = parseInt(questionId);
  const quizIdnum = parseInt(quizId);
  try {
    const result = adminQuizQuestionUpdate(token, quizIdnum, questionIdnum, questionBody.question, questionBody.duration, questionBody.points, questionBody.answers, questionBody.thumbnailUrl, 1);
    res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a quiz that this user owns.') {
      return res.status(403).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Server route for Quiz Transfer - Iteration 2
app.post('/v1/admin/quiz/:quizid/transfer', (req: Request, res: Response) => {
  const token = req.body.token;
  const { quizid } = req.params;
  const quizIdNumber = Number(quizid);
  const userEmail = req.body.userEmail;

  try {
    // Call the business logic function
    const result = transferQuiz(token, quizIdNumber, userEmail);
    res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      res.status(401).json({ error: error.message });
    } else if (error.message === 'userEmail is not a real user.' ||
               error.message === 'userEmail is the current logged in user.' ||
               error.message === 'Quiz ID refers to a quiz that has a name that is already used by the target user.') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a valid quiz.') {
      res.status(403).json({ error: error.message });
    }
  }
});

// Server route for emptyTrash - Iteration 2
app.delete('/v1/admin/quiz/trash/empty', (req: Request, res: Response) => {
  const token = req.query.token as string;
  const quizIds = JSON.parse(req.query.quizIds as string) as number[];

  try {
    const results = quizIds.map(quizId => emptyTrash(token, quizId));
    return res.status(200).json(results);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a valid quiz.' ||
      error.message === 'Quiz ID does not refer to a quiz that this user owns.') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Quiz ID is not currently in the trash.') {
      return res.status(400).json({ error: error.message });
    }
  }
});

//  ITERATION 2 : QuizQuestionDelete's V1  HTTP route
app.delete('/v1/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  // Extract the token from the query parameters
  const token = req.query.token as string;
  // Extract the quizid and questionid from the request parameters
  const { quizid, questionid } = req.params;
  // Convert quizid and questionid from string in URL to number
  const quizIdNumber = Number(quizid);
  const questionIdNumber = Number(questionid);
  try {
    // Call the QuizQuestionDelete function
    QuizQuestionDeleteV1(token, quizIdNumber, questionIdNumber);
    // Return successful response, empty object is returned, question removal done
    return res.status(200).json({});
  } catch (e) {
    // Handle error responses
    if (e.message === 'Invalid token!' || e.message === 'AuthUserId is not a valid user') {
      return res.status(401).json({ error: e.message });
    } else if (e.message === 'Question ID does not refer to a valid question within this quiz' || e.message === 'Any session for this quiz is not in END state') {
      return res.status(400).json({ error: e.message });
    } else if (e.message === 'Quiz ID does not refer to a quiz that this user owns' || e.message === 'Quiz ID does not refer to a valid quiz') {
      return res.status(403).json({ error: e.message });
    } else {
      return res.status(400).json({ error: e.message });
    }
  }
});

// adminQuizQuestionCreate 's HTTP route
app.post('/v1/admin/quiz/:quizId/question', (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quizIdNum = parseInt(quizId);
    const { questionBody, token } = req.body;
    // const token = req.headers.token as string

    const response = adminQuestionCreate(
      token,
      questionBody.question,
      questionBody.duration,
      questionBody.points,
      questionBody.answers,
      quizIdNum
    );
    return res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Quiz does not exist!') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Quiz is not owned by YOU!') {
      return res.status(403).json({ error: error.message }); // 403 for unauthorized access
    } else if (error.message === 'Duplicate Answer Provided!') {
      return res.status(400).json({ error: error.message }); // 400 for duplicate answers
    } else if (error.message === 'Question must be between 5 and 50 characters!') {
      return res.status(400).json({ error: error.message }); // 400 for invalid question length
    } else if (error.message === 'must have at least 2 answers, and no more than 6 answers!') {
      return res.status(400).json({ error: error.message }); // 400 for invalid answers count
    } else if (error.message === 'answers must be more than 1 characters and less than 30 characters') {
      return res.status(400).json({ error: error.message }); // 400 for invalid answer length
    } else if (error.message === 'There must be at least one correct answer') {
      return res.status(400).json({ error: error.message }); // 400 for no correct answer
    } else if (error === 'Question duration too long!, total Quiz Duration cannot exceed 3 minutes!') {
      return res.status(400).json({ error: error.message }); // 400 for duration exceeding limit
    } else if (error === 'Time cannot be negative!') {
      return res.status(400).json({ error: error.message }); // 400 for negative duration
    } else if (error.message === 'points must be between 1 and 10 points!') {
      return res.status(400).json({ error: error.message }); // 400 for invalid points
    }
  }
  return res.status(500).json('Internal server error has occurred');
});

// ITERATION 2 :  adminQuizQuestionDuplicateV1 's HTTP route
app.post('/v1/admin/quiz/:quizid/question/:questionid/duplicate', (req: Request, res: Response) => {
  try {
    // Extract the token from the request body
    const { token } = req.body;
    const { quizid, questionid } = req.params;
    // Convert quizid and questionid from string in URL to number
    const quizIdNumber = Number(quizid);
    const questionIdNumber = Number(questionid);

    // Call the adminQuizDuplicateQuestionV1 function to handle token validation and question duplication
    const response = adminQuizDuplicateQuestionV1(token, quizIdNumber, questionIdNumber);

    // Return successful response if duplication was successful
    res.status(200).json(response);
  } catch (e) {
    // Handle errors and send appropriate response
    if (e.message === 'Invalid token!' || e.message === 'AuthUserId is not a valid user.') {
      res.status(401).json({ error: e.message });
    } else if (e.message === 'Quiz ID does not refer to a valid quiz.' ||
               e.message === 'Quiz ID does not refer to a quiz that this user owns.' ||
               e.message === 'Quiz is not owned by YOU!') {
      res.status(403).json({ error: e.message });
    } else if (e.message === 'Question Id does not refer to a valid question within this quiz.') {
      res.status(400).json({ error: e.message });
    } else {
      // Handle any other unexpected errors
      res.status(400).json({ error: e.message });
    }
  }
});

app.put('/v1/admin/quiz/:quizid/question/:questionid/move', (req: Request, res: Response) => {
  try {
    const quizId = parseInt(req.params.quizid);
    const questionId = parseInt(req.params.questionid);

    const { token, newPosition } = req.body;

    const response = adminMoveQuestion(quizId, questionId, token, newPosition);
    return res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Quiz is not owned by YOU!' || error.message === 'Quiz ID refers to a quiz that does not exist') {
      return res.status(403).json({ error: error.message });
    } else {
      return res.status(400).json({ error: error.message });
    }
  }

  // const quizId = parseInt(req.params.quizid);
  // const questionId = parseInt(req.params.questionid);
  // console.log(quizId);

  // const { token, newPosition } = req.body;

  // const response = adminMoveQuestionV1(quizId, questionId, token, newPosition);

  // if ('error' in response) {
  //   if (response.error === 'Invalid token!') {
  //     return res.status(401).json(response);
  //   } else if (response.error === 'Quiz is not owned by YOU!' || response.error === 'Quiz ID refers to a quiz that does not exist') {
  //     return res.status(403).json(response);
  //   } else {
  //     return res.status(400).json(response);
  //   }
  // }
  // return res.status(200).json(response);
});

app.post('/v1/admin/quiz/:quizId/restore', (req: Request, res: Response) => {
  const { quizId } = req.params;
  const quizIdNum = parseInt(quizId);
  const { token } = req.body;
  try {
    const response = adminQuizRestore(token, quizIdNum);
    return res.status(200).json(response);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'User is not the owner of this quiz' || error.message === 'Quiz ID refers to a quiz that does not exist') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Quiz ID refers to a quiz that is not currently in the trash' || error.message === 'Quiz name of the restored quiz is already used by another active quiz') {
      return res.status(400).json({ error: error.message });
    }
  }
});

app.put('/v2/admin/user/details', (req: Request, res: Response) => {
  try {
    const { email, nameFirst, nameLast } = req.body;
    const token = req.headers.token as string;
    const response = adminUserDetailsUpdate(token, email, nameFirst, nameLast);
    return res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'User does not exist!') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Invalid email!') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Email is already used by another user') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'First or Last Name is too long or short. Must be between 2 to 20 letters') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'First name contains invalid characters.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Last name contains invalid characters.') {
      return res.status(400).json({ error: error.message });
    }
  }
  return res.status(500).json('internal server error');
});

/// ////////////////////// V2 Server Routes from IT2 FOR ITERATION 3 /////////////////////////////

// ITERATION 3: Server route for adminViewTrash
app.get('/v2/admin/quiz/trash', (req: Request, res: Response) => {
  try {
    const token = req.headers.token as string;
    const response = adminViewTrash(token);
    res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    }
  }
  return res.status(500).json('Internal server error');
});

// ITERATION 3 : Server route for AdminQuizListV2
app.get('/v2/admin/quiz/list', (req: Request, res: Response) => {
  try {
    const token = req.headers.token as string;
    const response = adminQuizList(token);
    return res.status(200).json(response);
  } catch (e) {
    if (e.message === 'Invalid token!') {
      return res.status(401).json({ error: e.message });
    }
  }

  return res.status(500).json({ error: 'Internal Server Error' });
});

// Server route for adminQuizInfo - ITERATION 3
app.get('/v2/admin/quiz/:quizid', (req: Request, res: Response) => {
  const token = req.header('token') as string;
  const { quizid } = req.params;
  const quizIdNumber = Number(quizid);

  try {
    const result = adminQuizInfo(token, quizIdNumber, 2);
    res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      res.status(401).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a valid quiz.' ||
               error.message === 'AuthUserId is not a valid user.' ||
               error.message === 'Quiz ID does not refer to a quiz that this user owns.') {
      res.status(403).json({ error: error.message });
    }
  }
});

// ITERATION 3 : Server route for AdminQuestionCreateV2
app.post('/v2/admin/quiz/:quizId/question', (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quizIdNum = parseInt(quizId);
    const { questionBody } = req.body;
    const token = req.headers.token as string;

    const response = adminQuestionCreateV2(
      token,
      questionBody.question,
      questionBody.duration,
      questionBody.points,
      questionBody.answers,
      quizIdNum,
      questionBody.thumbnailUrl
    );
    return res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Quiz does not exist!') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Quiz is not owned by YOU!') {
      return res.status(403).json({ error: error.message }); // 403 for unauthorized access
    } else if (error.message === 'Duplicate Answer Provided!') {
      return res.status(400).json({ error: error.message }); // 400 for duplicate answers
    } else if (error.message === 'Question must be between 5 and 50 characters!') {
      return res.status(400).json({ error: error.message }); // 400 for invalid question length
    } else if (error.message === 'must have at least 2 answers, and no more than 6 answers!') {
      return res.status(400).json({ error: error.message }); // 400 for invalid answers count
    } else if (error.message === 'answers must be more than 1 characters and less than 30 characters') {
      return res.status(400).json({ error: error.message }); // 400 for invalid answer length
    } else if (error.message === 'There must be at least one correct answer') {
      return res.status(400).json({ error: error.message }); // 400 for no correct answer
    } else if (error === 'Question duration too long!, total Quiz Duration cannot exceed 3 minutes!') {
      return res.status(400).json({ error: error.message }); // 400 for duration exceeding limit
    } else if (error === 'Time cannot be negative!') {
      return res.status(400).json({ error: error.message }); // 400 for negative duration
    } else if (error.message === 'points must be between 1 and 10 points!') {
      return res.status(400).json({ error: error.message }); // 400 for invalid points
    } else if (error.message === 'thumbnail URL cannot be an empty string') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'The provded thumbnail does not start with http:// or https://') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'The provided thumbnail does not end with jpg, jpeg or png') {
      return res.status(400).json({ error: error.message });
    }
  }
  return res.status(500).json('Internal server error has occurred');
});

// ITERATION 3 : Server route for AdminQuizRemoveV2
app.delete('/v2/admin/quiz/:quizid', (req: Request, res: Response) => {
  try {
    // Extract the token from the request headers
    const token = req.headers.token as string;

    // Extract the quiz ID from the request parameters and convert it to a number
    const { quizid } = req.params;
    const quizIdNumber = Number(quizid);

    // Call the adminQuizRemove function to handle token validation and quiz removal
    const response = adminQuizRemoveV2(token, quizIdNumber);

    // Return successful response if quiz removal was successful
    res.status(200).json(response);
  } catch (e) {
    // Handle errors and send appropriate response
    if (e.message === 'A session for this quiz is not in END state') {
      res.status(400).json({ error: e.message });
    } else if (e.message === 'Invalid token!' || e.message === 'AuthUserId is not a valid user') {
      res.status(401).json({ error: e.message });
    } else if (e.message === 'Quiz ID does not refer to a valid quiz' ||
               e.message === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(403).json({ error: e.message });
    } else {
      // Handle any other unexpected errors
      res.status(400).json({ error: e.message });
    }
  }
});

// ITERATION 3 : Server route for QuizQuestionDuplicateV2
app.post('/v2/admin/quiz/:quizid/question/:questionid/duplicate', (req: Request, res: Response) => {
  try {
    // Extract the token from the request headers
    const token = req.headers.token as string;
    const { quizid, questionid } = req.params;
    // Convert quizid and questionid from string in URL to number
    const quizIdNumber = Number(quizid);
    const questionIdNumber = Number(questionid);

    // Call the adminQuizDuplicateQuestionV1 function to handle token validation and question duplication
    const response = adminQuizDuplicateQuestionV2(token, quizIdNumber, questionIdNumber);

    // Return successful response if duplication was successful
    res.status(200).json(response);
  } catch (e) {
    // Handle errors and send appropriate response
    if (e.message === 'Invalid token!' || e.message === 'AuthUserId is not a valid user.') {
      res.status(401).json({ error: e.message });
    } else if (e.message === 'Quiz ID does not refer to a valid quiz.' ||
               e.message === 'Quiz ID does not refer to a quiz that this user owns.' ||
               e.message === 'Quiz is not owned by YOU!') {
      res.status(403).json({ error: e.message });
    } else if (e.message === 'Question Id does not refer to a valid question within this quiz.') {
      res.status(400).json({ error: e.message });
    } else {
      // Handle any other unexpected errors
      res.status(400).json({ error: e.message });
    }
  }
});

// ITERATION 3 : Server route for adminQuizCreateV2
app.post('/v2/admin/quiz', (req: Request, res: Response) => {
  const token = req.header('token') as string;
  const { name, description } = req.body;
  try {
    // Call the adminQuizCreate function to handle token validation and quiz creation
    const response = adminQuizCreateV2(token, name, description);
    // Return successful response, quizId is returned
    return res.status(200).json(response);
  } catch (e) {
    // Handle error responses
    if (e.message === 'Invalid token!' || e.message === 'AuthUserId is not a valid user.') {
      return res.status(401).json({ error: e.message });
    } else {
      return res.status(400).json({ error: e.message });
    }
  }
});

// ITERATION 3 : QuizQuestionDelete 's V2 server route
app.delete('/v2/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  // Extract the token from the header
  const token = req.headers.token as string;
  // Extract the quizid and questionid from the request parameters
  const { quizid, questionid } = req.params;
  // Convert quizid and questionid from string in URL to number
  const quizIdNumber = Number(quizid);
  const questionIdNumber = Number(questionid);
  try {
    // Call the QuizQuestionDelete function
    QuizQuestionDeleteV2(token, quizIdNumber, questionIdNumber);
    // Return successful response, empty object is returned, question removal done
    return res.status(200).json({});
  } catch (e) {
    // Handle error responses
    if (e.message === 'Invalid token!' || e.message === 'AuthUserId is not a valid user') {
      return res.status(401).json({ error: e.message });
    } else if (e.message === 'Question ID does not refer to a valid question within this quiz' || e.message === 'There is still an active session for this quiz that is not in the END state') {
      return res.status(400).json({ error: e.message });
    } else if (e.message === 'Quiz ID does not refer to a quiz that this user owns' || e.message === 'Quiz ID does not refer to a valid quiz') {
      return res.status(403).json({ error: e.message });
    } else {
      return res.status(400).json({ error: e.message });
    }
  }
});
/// ///////////////////////////////// ITERATION 3 : NEW SERVER ROUTES ////////////////////////////////////
// ITERATION 3: Server route for adminSessionChatSend
app.post('/v1/player/:playerid/chat', (req: Request, res: Response) => {
  // Extract the player ID from the request parameters
  const { playerid } = req.params;
  // Extract the message from the request body
  const { message } = req.body;
  // Convert player ID to number
  const playerIdNumber = Number(playerid);

  try {
    // Call the adminSessionChatSend function
    const result = adminSessionChatSend(playerIdNumber, message);

    // Return successful response
    return res.status(200).json(result);
  } catch (e) {
    // Handle error responses
    if (e.message === 'Session with player does not exist.') {
      return res.status(400).json({ error: e.message });
    } else if (e.message === 'Message length must be greater than 0 and less than 101 characters.') {
      return res.status(400).json({ error: e.message });
    } else if (e.message === 'Player does not exist in the session.') {
      return res.status(400).json({ error: e.message });
    }
  }
});

/// ////////////////  NEW INTERATION 3 V2 SERVER ROUTES  ///////////////////

// Server route for adminQuizDescriptionUpdate - Iteration 3
app.put('/v2/admin/quiz/:quizid/description', (req: Request, res: Response) => {
  const token = req.headers.token as string; // Token should be in the header for v2
  const description = req.body.description as string;
  const { quizid } = req.params;

  // Convert quizid from string in URL to number
  const quizIdNumber = Number(quizid);

  try {
    // Call the business logic function
    adminQuizDescriptionUpdate(token, quizIdNumber, description);
    // Send success response
    res.status(200).json({});
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      res.status(401).json({ error: error.message });
    } else if (error.message === 'Description is too long.' ||
               error.message === 'Description must be a string.') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a valid quiz.' ||
               error.message === 'Quiz ID does not refer to a quiz that this user owns.') {
      res.status(403).json({ error: error.message });
    }
  }
});

// Server route for empty trash - Iteration 3
app.delete('/v2/admin/quiz/trash/empty', (req: Request, res: Response) => {
  const token = req.headers.token as string;
  const quizIds = JSON.parse(req.query.quizIds as string) as number[];

  try {
    const results = quizIds.map(quizId => emptyTrash(token, quizId));
    return res.status(200).json(results);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a valid quiz.' ||
      error.message === 'Quiz ID does not refer to a quiz that this user owns.') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Quiz ID is not currently in the trash.') {
      return res.status(400).json({ error: error.message });
    }
  }
});

// Server route for transfer Quiz - Iteration 3
app.post('/v2/admin/quiz/:quizid/transfer', (req: Request, res: Response) => {
  const token = req.headers.token as string;
  const { quizid } = req.params;
  const quizIdNumber = Number(quizid);
  const userEmail = req.body.userEmail;

  try {
    // Call the business logic function
    transferQuiz(token, quizIdNumber, userEmail);
    // Send success response
    res.status(200).json({});
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      res.status(401).json({ error: error.message });
    } else if (error.message === 'userEmail is not a real user.' ||
               error.message === 'userEmail is the current logged in user.' ||
               error.message === 'Quiz ID refers to a quiz that has a name that is already used by the target user.') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a valid quiz.') {
      res.status(403).json({ error: error.message });
    }
  }
});

// Server route for session start - Iteration 3
app.post('/v1/admin/quiz/:quizid/session/start', (req: Request, res: Response) => {
  // Extract the token from the header
  const token = req.headers.token as string;
  // Extract  autoStartNum from the request body
  const { autoStartNum } = req.body;
  // Extract the quiz ID from the request parameter, convert from string  in URL to number
  const { quizid } = req.params;
  const quizIdNumber = Number(quizid);

  try {
    const result = startSession(token, quizIdNumber, autoStartNum);
    // Return successful response with the session ID
    return res.status(200).json(result);
    // Handle error responses
  } catch (e) {
    if (e.message === 'Invalid token!' || e.message === 'AuthUserId is not a valid user') {
      return res.status(401).json({ error: e.message });
    } else if (e.message === 'Quiz ID does not refer to a valid quiz' ||
               e.message === 'Quiz ID does not refer to a quiz that this user owns') {
      return res.status(403).json({ error: e.message });
    } else if (e.message === 'autoStartNum is a number greater than 50' ||
               e.message === '10 sessions that are not in END state currently exist for this quiz' ||
               e.message === 'The quiz does not have any questions in it' ||
               e.message === 'The quiz is in trash') {
      return res.status(400).json({ error: e.message });
    } else {
      return res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
});

// Server route for adminAuthLogin - Iteration 3
app.post('/v2/admin/auth/logout', (req: Request, res: Response) => {
  try {
    const token = req.header('token') as string;
    const result = adminAuthLogout(token);
    return res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    }
  }
  return res.status(500).json({ error: 'An unexpected error occurred.' });
});

// Server route for adminQuizRestore - Iteration 3
app.post('/v2/admin/quiz/:quizId/restore', (req: Request, res: Response) => {
  const { quizId } = req.params;
  const quizIdNum = parseInt(quizId);
  const token = req.headers.token as string;
  try {
    const response = adminQuizRestore(token, quizIdNum);
    return res.status(200).json(response);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'User is not the owner of this quiz' || error.message === 'Quiz ID refers to a quiz that does not exist') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Quiz ID refers to a quiz that is not currently in the trash' || error.message === 'Quiz name of the restored quiz is already used by another active quiz') {
      return res.status(400).json({ error: error.message });
    }
  }
});

// Server route for adminUserDetails - Iteration 3
app.get('/v2/admin/user/details', (req: Request, res: Response) => {
  const token = req.header('token');
  if (typeof token !== 'string') {
    return res.status(401).json({ error: 'Invalid token format' });
  }
  try {
    const result = adminUserDetails(token);
    return res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'User not found.') {
      return res.status(404).json({ error: error.message });
    }
  }
});

app.put('/v2/admin/quiz/:quizid/name', (req: Request, res: Response) => {
  const token = req.header('token') as string;
  const { name } = req.body;
  const quizId = parseInt(req.params.quizid);

  try {
    const result = adminQuizNameUpdate(token, quizId, name);
    return res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Name contains too few characters.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Name contains too many characters.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Name contains invalid characters.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a valid quiz.') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a quiz that this user owns.') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Name is already used by the current logged in user for another quiz.') {
      return res.status(400).json({ error: error.message });
    }
  }
});

app.put('/v2/admin/quiz/:quizId/question/:questionId', (req: Request, res: Response) => {
  const { quizId, questionId } = req.params;
  const token = req.header('token') as string;
  const { questionBody } = req.body;
  const questionIdnum = parseInt(questionId);
  const quizIdnum = parseInt(quizId);
  try {
    const result = adminQuizQuestionUpdate(token, quizIdnum, questionIdnum, questionBody.question, questionBody.duration, questionBody.points, questionBody.answers, questionBody.thumbnailUrl, 2);
    res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a quiz that this user owns.') {
      return res.status(403).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

app.put('/v2/admin/quiz/:quizid/question/:questionid/move', (req: Request, res: Response) => {
  try {
    const quizId = parseInt(req.params.quizid);
    const questionId = parseInt(req.params.questionid);

    const { newPosition } = req.body;
    const token = req.headers.token as string;
    const response = adminMoveQuestion(quizId, questionId, token, newPosition);
    return res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Quiz is not owned by YOU!' || error.message === 'Quiz ID refers to a quiz that does not exist') {
      return res.status(403).json({ error: error.message });
    } else {
      return res.status(400).json({ error: error.message });
    }
  }
});

app.put('/v2/admin/user/password', (req: Request, res: Response) => {
  try {
    const token = req.headers.token as string;
    const { oldPassword, newPassword } = req.body;
    const response = adminUserPasswordUpdate(token, oldPassword, newPassword);
    res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else {
      return res.status(400).json({ error: error.message });
    }
  }
  // const { token, oldPassword, newPassword } = req.body;

  // const response = adminUserPasswordUpdate(token, oldPassword, newPassword);

  // if ('error' in response) {
  //   if (response.error === 'Invalid token!') {
  //     return res.status(401).json(response);
  //   } else {
  //     return res.status(400).json(response);
  //   }
  // }

  // res.status(200).json(response);
});

app.post('/v1/player/join', (req: Request, res: Response) => {
  try {
    const { sessionId, name } = req.body;
    const response = PlayerJoin(sessionId, name);
    return res.status(200).json(response);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Session Id does not refer to a valid session') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Session is not in LOBBY state') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Name of user entered is not unique') {
      return res.status(400).json({ error: error.message });
    }
  }
  return res.status(500).json({ error: 'An unexpected error occurred.' });
});

/*
app.put('/v1/admin/quiz/:quizid/session/:sessionid', (req: Request, res: Response) => {
  try {
    const token = req.headers.token as string;
    const action = req.body.action as string;
    const quizId = parseInt(req.params.quizid);
    const sessionId = parseInt(req.params.sessionid);
    const response = adminQuizSessionUpdate(quizId, sessionId, token, action);
    res.status(200).json(response);
  } catch (e) {
    if (e.message === 'Invalid token!') {
      res.status(401).json({ error: e.message });
    } else if (e.message === 'You do not own this quiz') {
      res.status(403).json({ error: e.message });
    } else {
      res.status(400).json({ error: e.message });
    }
  }
});
*/

// Server route to update quiz thumbnail - Iteration 3
app.put('/v1/admin/quiz/:quizid/thumbnail', (req: Request, res: Response) => {
  try {
    const quizId = parseInt(req.params.quizid);
    const imgUrl = req.body.imgUrl;
    const token = req.headers.token as string;
    const response = adminQuizThumbnailUpdate(token, quizId, imgUrl);
    res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Invalid token!') {
      res.status(401).json({ error: error.message });
    } else if (error.message === 'Image URL must be a string.') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Image URL must start with "http://" or "https://".') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Image URL must end with one of the following file types: jpg, jpeg, png.') {
      res.status(400).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a valid quiz.') {
      res.status(403).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a quiz that this user owns.') {
      res.status(403).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
});

// Server route for get guest player status - Iteration 3
app.get('/v1/player/:playerId', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerId);
  try {
    const result = QuizSessionPlayerStatus(playerId);
    res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Player does not exist in any session') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
});

// Server route for admin user session status - Iteration 3
app.get('/v1/admin/quiz/:quizid/session/:sessionid', (req: Request, res: Response) => {
  try {
    const quizId = parseInt(req.params.quizid);
    const sessionId = parseInt(req.params.sessionid);
    const token = req.headers.token as string;
    const response = adminQuizSessionStatus(token, quizId, sessionId);
    res.status(200).json(response);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Session ID does not refer to a valid session within this quiz') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a quiz that this user owns.' || error.message === 'Quiz ID does not refer to a valid quiz.') {
      return res.status(403).json({ error: error.message });
    } else {
      return res.status(400).json({ error: error.message });
    }
  }
});

app.put('/v1/player/:playerid/question/:questionposition/answer', (req: Request, res: Response) => {
  const { playerid, questionposition } = req.params;
  const { answerIds } = req.body;
  const playerId = parseInt(playerid);
  const questionPosition = parseInt(questionposition);

  try {
    PlayerSubmitAnswer(playerId, questionPosition, answerIds);
    return res.status(200).json({});
  } catch (e) {
    if (e.message === 'Player ID does not exist') {
      return res.status(400).json({ error: e.message });
    } else if (e.message === 'Question position is not valid for the session this player is in') {
      return res.status(400).json({ error: e.message });
    } else if (e.message === 'Session is not in QUESTION_OPEN state') {
      return res.status(400).json({ error: e.message });
    } else if (e.message === 'Session is not yet up to this question') {
      return res.status(400).json({ error: e.message });
    } else if (e.message === 'Answer IDs are not valid for this question') {
      return res.status(400).json({ error: e.message });
    } else if (e.message === 'Duplicate answer IDs provided') {
      return res.status(400).json({ error: e.message });
    } else if (e.message === 'Less than 1 answer ID was submitted') {
      return res.status(400).json({ error: e.message });
    } else {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

app.get('/v1/player/:playerid/question/:questionposition', (req: Request, res: Response) => {
  const { playerid, questionposition } = req.params;
  const playerIdNum = parseInt(playerid);
  const questionPositionNum = parseInt(questionposition);

  try {
    const result = getPlayerCurrentQuestionDetail(playerIdNum, questionPositionNum);
    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Player ID does not exist') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Question position is not valid for the session this player is in') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Session is not currently on this question') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Session is in LOBBY, QUESTION_COUNTDOWN, FINAL_RESULTS or END state') {
      return res.status(400).json({ error: error.message });
    }
  }
});

// Server route for adminQuizSessionResultsCSV -Iteration 3
app.get('/v1/admin/quiz/:quizId/session/:sessionId/results/csv', (req: Request, res: Response) => {
  const { quizId, sessionId } = req.params;
  const quizIdNum = parseInt(quizId);
  const sessionIdNum = parseInt(sessionId);
  const token = req.headers.token as string;
  try {
    const response = adminQuizSessionResultsCSV(token, quizIdNum, sessionIdNum);
    return res.status(200).json(response);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!' || error.message === 'AuthUserId is not a valid user') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Quiz ID does not refer to a quiz that this user owns' || error.message === 'Quiz ID does not refer to a valid quiz') {
      return res.status(403).json({ error: error.message });
    } else if (error.message === 'Session Id does not refer to a valid session within this quiz' || error.message === 'Session is not in FINAL_RESULTS state') {
      return res.status(400).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.get('/v1/player/:playerId/chat', (req: Request, res: Response) => {
  const PlayerId = parseInt(req.params.playerId);
  try {
    const result = playerChatGet(PlayerId);
    res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Player ID does not exist') {
      return res.status(400).json({ error: error.message });
    }
  }
  return res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.get('/v1/admin/quiz/:quizId/sessions', (req: Request, res: Response) => {
  const { quizId } = req.params;
  const quizIdNum = parseInt(quizId);
  const token = req.header('token');
  try {
    const result = ViewQuizSessions(token, quizIdNum);
    res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Invalid token!') {
      return res.status(401).json({ error: error.message });
    } else if (error.message === 'Valid token is provided, but user is not an owner of this quiz or quiz does not exist') {
      return res.status(403).json({ error: error.message });
    }
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.get('/v1/admin/quiz/:quizid/session/:sessionid/results', (req: Request, res: Response) => {
  try {
    const quizId = parseInt(req.params.quizid);
    const sessionId = parseInt(req.params.sessionid);
    const token = req.headers.token as string;
    const response = adminSessionFinalResultInGame(quizId, sessionId, token);
    res.status(200).json(response);
  } catch (e) {
    if (e.message === 'Invalid token!') {
      res.status(401).json({ error: e.message });
    } else if (e.message === 'You do not own this quiz!') {
      res.status(403).json({ error: e.message });
    } else {
      res.status(400).json({ error: e.message });
    }
  }
});

app.get('/v1/player/:playerId/question/:questionPosition/results', (req: Request, res: Response) => {
  const { playerId, questionPosition } = req.params;
  const playerIdNum = parseInt(playerId);
  const questionPositionNum = parseInt(questionPosition);

  try {
    const result = getQuestionResults(playerIdNum, questionPositionNum);
    res.status(200).json(result);
  } catch (e) {
    const error = e as Error;
    if (error.message === 'Player ID does not exist') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Question position is not valid for the session this player is in') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Session is not in ANSWER_SHOW state') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Session is not currently on this question') {
      return res.status(400).json({ error: error.message });
    }
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Server route for 'GET' player final results
app.get('/v1/player/:playerId/results', (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const response = adminSessionFinalResult(playerId);
    return res.status(200).json(response);
  } catch (error) {
    if (error.message === 'Player does not exist.') {
      return res.status(400).json({ error: error.message });
    } else if (error.message === 'Session is not in FINAL_RESULTS state.') {
      return res.status(400).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
});

// ====================================================================
//  ================= WORK IS DONE ABOVE THIS LINE ===================
// ====================================================================

app.use((req: Request, res: Response) => {
  const error = `
    Route not found - This could be because:
      0. You have defined routes below (not above) this middleware in server.ts
      1. You have not implemented the route ${req.method} ${req.path}
      2. There is a typo in either your test or server, e.g. /posts/list in one
         and, incorrectly, /post/list in the other
      3. You are using ts-node (instead of ts-node-dev) to start your server and
         have forgotten to manually restart to load the new changes
      4. You've forgotten a leading slash (/), e.g. you have posts/list instead
         of /posts/list in your server.ts or test file
  `;
  res.status(404).json({ error });
});

// start server
const server = app.listen(PORT, HOST, () => {
  // DO NOT CHANGE THIS LINE
  console.log(`⚡️ Server started on port ${PORT} at ${HOST}`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  server.close(() => {
    console.log('Shutting down server gracefully.');
    process.exit();
  });
});
