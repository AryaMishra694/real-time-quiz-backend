import request from 'sync-request-curl';
import config from './config.json';
import { QuizQuestionDupResponse, ErrorStatus } from './interfaces';
const port = config.port;
const url = config.url;
const SERVER_URL = `${url}:${port}`;

/**
 * Send a 'post' request to the corresponding server route to duplicate a question from a quiz
 *
 * @param {string} token - token/sessionId
 * @param {number} quizid - ID of the quiz
 * @param {number} questionid - ID of the question to duplicate
 *
 * @returns {QuizQuestionDupResponse | ErrorStatus} - response in javascript
 */
export function requestQuizQuestionDuplicate(token: string, quizid: number, questionid: number): QuizQuestionDupResponse | ErrorStatus {
  const res = request(
    'POST',
    SERVER_URL + `/v2/admin/quiz/${quizid}/question/${questionid}/duplicate`,
    {
      headers: {
        token: token,
      },
      timeout: 5000
    }
  );

  const response = JSON.parse(res.body.toString('utf8'));

  if (res.statusCode === 200) {
    return response as QuizQuestionDupResponse;
  } else {
    return {
      error: response.error,
      status: res.statusCode
    } as ErrorStatus;
  }
}
