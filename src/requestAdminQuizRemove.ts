import request from 'sync-request-curl';
import config from './config.json';
const port = config.port;
const url = config.url;
const SERVER_URL = `${url}:${port}`;
import {
  ErrorStatus
} from './interfaces.ts';

/**
   * Send a 'delete' request to the corresponding server route to remove the quiz
   *
   * @param {string} token - token/sessionId
   * @param {number} quizId - quiz Id
   *
   * @returns {{ empty object| ErrorStatus }} - response in javascript
   *
   */
export function requestAdminQuizRemoveV2(token: string, quizId: number): object | ErrorStatus {
  const res = request(
    'DELETE',
      `${SERVER_URL}/v2/admin/quiz/${quizId}`,
      {
        headers: {
          token: token
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
    };
  }
}
