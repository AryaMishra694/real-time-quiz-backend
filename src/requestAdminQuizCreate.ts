import request from 'sync-request-curl';
import config from './config.json';
import { QuizCreateResponse, ErrorStatus } from './interfaces';
const port = config.port;
const url = config.url;
const SERVER_URL = `${url}:${port}`;

/**
 * Send a 'post' request to the corresponding server route to create a new quiz
 *
 * @param {string} token - token/sessionId
 * @param {string} name - quiz name
 * @param {string} description - quiz description
 *
 * @returns {{ QuizCreateResponse | ErrorStatus }} - response in javascript
 */
export function requestAdminQuizCreate(token: string, name: string, description: string): QuizCreateResponse | ErrorStatus {
  const res = request(
    'POST',
    SERVER_URL + '/v2/admin/quiz',
    {
      headers: {
        token: token,
      },
      json: {
        name: name,
        description: description
      },
      timeout: 5000
    }
  );

  const response = JSON.parse(res.body.toString('utf8'));

  if (res.statusCode === 200) {
    return response as QuizCreateResponse;
  } else {
    return {
      error: response.error,
      status: res.statusCode
    } as ErrorStatus;
  }
}
