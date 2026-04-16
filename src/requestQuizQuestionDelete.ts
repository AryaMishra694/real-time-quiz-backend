import request from 'sync-request-curl';
import config from './config.json';
import { ErrorStatus } from './interfaces';
const port = config.port;
const url = config.url;
const SERVER_URL = `${url}:${port}`;

/**
 * Send a 'delete' request to the corresponding server route to delete a question from a quiz
 *
 * @param {string} token - token/sessionId
 * @param {number} quizid - ID of the quiz
 * @param {number} questionid - ID of the question to delete
 *
 * @returns {object | ErrorStatus} - response in javascript
 */
export function requestAdminQuizQuestionDelete(token: string, quizid: number, questionid: number): object | ErrorStatus {
  const res = request(
    'DELETE',
    SERVER_URL + `/v2/admin/quiz/${quizid}/question/${questionid}`,
    {
      headers: {
        token: token,
      },
      timeout: 5000
    }
  );

  const response = JSON.parse(res.body.toString('utf8'));

  if (res.statusCode === 200) {
    return {};
  } else {
    return {
      error: response.error,
      status: res.statusCode
    } as ErrorStatus;
  }
}
