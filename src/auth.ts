// Imports for all implementations
import { getData, setData } from './dataStore.ts';
// import bcrypt from 'bcrypt';
import { clear } from './other.ts';
import { generateToken, getAuthUserIdFromToken } from './helperFunction.ts';
import {
  User,
  Data,
  Session,
  ErrorMsg
} from './interfaces.ts';
// import bcrypt from 'bcrypt';

const MIN_PASSWORD_LENGTH = 8;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 20;

/**
  * Registers a user with an email, password, first name, and last name, then returns their
  * authUserId value.
  *
  * @param {string} email - The email address of the user.
  * @param {string} password - The password for the user's account.
  * @param {string} nameFirst - The first name of the user.
  * @param {string} nameLast - The last name of the user.
  *
  * @returns {Object} - An object containing the authUserId of the registered user.
  */
import validator from 'validator';

export function adminAuthRegister(email: string, password: string, nameFirst: string, nameLast: string): ErrorMsg | { token: string } {
  const data = getData(); // Retrieve data from the data store
  // We have checked whether data is empty and if it is, and has no objects,
  // then we implement the clear function to set up basic structure.
  if (Object.keys(data).length === 0) {
    clear();
  }

  for (const user of data.users) {
    if (user.email === email) {
      throw new Error('Email address is already used by another user.');
    }
  }

  if (validator.isEmail(email) === false) {
    throw new Error('Email is not valid.');
  }

  if (!/^[a-zA-Z\s'-]+$/.test(nameFirst)) {
    throw new Error('First name contains invalid characters.');
  }

  if (!/^[a-zA-Z\s'-]+$/.test(nameLast)) {
    throw new Error('Last name contains invalid characters.');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error('Password must be at least 8 characters long.');
  }

  if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    throw new Error('Password must contain at least one number and one letter.');
  }

  if (nameFirst.length < MIN_NAME_LENGTH || nameFirst.length > MAX_NAME_LENGTH) {
    throw new Error('First name must be between 2 and 20 characters.');
  }

  if (nameLast.length < MIN_NAME_LENGTH || nameLast.length > MAX_NAME_LENGTH) {
    throw new Error('Last name must be between 2 and 20 characters.');
  }

  const newUser: User = {
    email: email,
    password: password,
    nameFirst: nameFirst,
    nameLast: nameLast,
    authUserId: data.users.length,
    numSuccessfulLogins: 1,
    numFailedPasswordsSinceLastLogin: 0,
    old_passwords: []
  };
  data.users.push(newUser);
  // token generation and adding session object to sessions array
  let token : string = generateToken();
  while (data.sessions.some(session => session.token === token) === true) {
    token = generateToken();
  }

  const session : Session = {
    token: token,
    authUserId: newUser.authUserId,
  };
  data.sessions.push(session);
  setData(data);
  return {
    token: token,
  };
}

/**
  * Given a registered user's email and password, return their authUserId value
  *
  * @param {string} email - The email address of the registered user.
  * @param {string} password - The password of the registered user.
  * @returns {{authUserId: number}} - An object containing the authUserId of the user.
  */
export function adminAuthLogin(email: string, password: string): { token: string } {
  const data: Data = getData();

  // Find the user by email
  const user: User | undefined = data.users.find(user => user.email === email);
  if (!user) {
    throw new Error('Invalid email, please try again');
  }

  if (user.password !== password) {
    user.numFailedPasswordsSinceLastLogin += 1;
    throw new Error('Invalid password');
  }

  // If successful login, update user statistics
  user.numSuccessfulLogins += 1;
  user.numFailedPasswordsSinceLastLogin = 0;

  // Token generation and adding session object to sessions array
  let token: string = generateToken();
  // Ensuring uniqueness
  while (data.sessions.some(session => session.token === token)) {
    token = generateToken();
  }

  const session: Session = {
    token: token,
    authUserId: user.authUserId
  };
  data.sessions.push(session);
  setData(data);

  return { token: token };
}

/**
  * Given an admin user's authUserId, returns details about the user.
  * The "name" is the concatenation of the first and last names with a single space between them.
  *
  * @param {number} authUserId - The ID of the authenticated admin user.
  * @returns {Object} - An object containing details about the user, including userId,
  * name, email, numSuccessfulLogins, and numFailedPasswordsSinceLastLogin.
  */

export function adminUserDetails(token: string) {
  const data = getData();
  let authUserId : number;
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error(authResult.error);
  } else {
    authUserId = authResult.authUserId;
  }
  const Founduser = data.users.find(user => user.authUserId === authUserId);

  if (!Founduser) {
    throw new Error('User not found.');
  }

  return {
    user:
        {
          userId: Founduser.authUserId,
          name: `${Founduser.nameFirst} ${Founduser.nameLast}`,
          email: Founduser.email,
          numSuccessfulLogins: Founduser.numSuccessfulLogins,
          numFailedPasswordsSinceLastLogin: Founduser.numFailedPasswordsSinceLastLogin,
        }
  };
}

/**
  * Given an admin user's authUserId and a set of properties, update the properties of this logged
  * in admin user
  *
  * @param {number} authUserID - unique ID used to find the user within the data structure
  * @param {string} email - the new email to be added
  * @param {string} nameFirst - the new first name to be added
  * @param {string} nameLast - the new last name to be added
  * @return {void} - this function does not return anything
  */
export function adminUserDetailsUpdate (token: string, email: string, nameFirst: string, nameLast: string): object | ErrorMsg {
  // finding whether or not a authUserId exists within the database
  let authUserID : number;
  const dataStore = getData();
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    // returns {error: Invalid token!}
    throw new Error('Invalid token!');
  } else {
    authUserID = authResult.authUserId;
  }

  if (getData().users.some(x => x.authUserId === authUserID) === false) {
    throw new Error('User does not exist!');
  }

  // checking whether an email is valid
  if (validator.isEmail(email) === false) {
    throw new Error('Invalid email!');
  }

  // checkign whether email is used by another user

  if (dataStore.users.find(user => user.email === email)) {
    throw new Error('Email is already used by another user');
  }

  // checking the length of a first name or last name
  if (nameFirst.length < MIN_NAME_LENGTH || nameFirst.length > MAX_NAME_LENGTH || nameLast.length < MIN_NAME_LENGTH || nameLast.length > MAX_NAME_LENGTH) {
    throw new Error('First or Last Name is too long or short. Must be between 2 to 20 letters');
  }

  if (!/^[a-zA-Z\s'-]+$/.test(nameFirst)) {
    throw new Error('First name contains invalid characters.');
  }

  if (!/^[a-zA-Z\s'-]+$/.test(nameLast)) {
    throw new Error('Last name contains invalid characters.');
  }

  // let index = dataStore.users.indexOf(user => user.authUserId === authUserID)
  dataStore.users[authUserID].email = email;
  dataStore.users[authUserID].nameFirst = nameFirst;
  dataStore.users[authUserID].nameLast = nameLast;

  setData(dataStore);

  return {};
}

/**
  * Given details relating to a password change, update the password of a logged in user.
  *
  * @param {number} authUserId - unique user id that is used to find the user within the data
  * structure
  * @param {string} oldPassword - the oldPassword of the user
  * @param {string} newPassword - the newPassword of the user
  * @return {void} - this function does not return anything
  */
export function adminUserPasswordUpdate (token :string, oldPassword :string, newPassword: string): object | ErrorMsg {
  let authUserId : number;

  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    // returns {error: Invalid token!}
    throw new Error('Invalid token!');
  } else {
    authUserId = authResult.authUserId;
  }

  if (getData().users.some(users => users.authUserId === authUserId) === false) {
    throw new Error('This user does not exist!');
  }

  // creates a deep copy of the dataStore, ensuring that we will not modify the original
  const dataStore : Data = getData();

  // finds index of user within the users array
  const index = dataStore.users.findIndex(users => users.authUserId === authUserId);

  // intialise the empty array for old_passwords
  if (!Object.prototype.hasOwnProperty.call(dataStore.users[index], 'old_passwords')) {
    dataStore.users[index].old_passwords = [];
  }

  // Check whether the current password matches the password used to verify identity
  if (dataStore.users[index].password !== oldPassword) {
    throw new Error('Password incorrect!');
  }

  // Check whether the new password matches the old password
  if (newPassword === oldPassword) {
    throw new Error('new password is the same as current password');
  }

  // check whether the new password is the correct length and contains at least a letter and a number
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error('password is too short');
  }
  // Regular expression to check for at least one letter
  const hasLetter = /[a-zA-Z]/;
  // Regular expression to check for at least one number
  const hasNumber = /\d/;

  if (!hasLetter.test(newPassword)) {
    throw new Error('password does not contain at least one letter');
  }

  if (!hasNumber.test(newPassword)) {
    throw new Error('password does not contain at least one number');
  }

  // check whether the new password has already been used in the past (depends if the used_passwords array is empty or not)
  if ('old_passwords' in dataStore.users[index]) {
    if (dataStore.users[index].old_passwords.find(password => password === newPassword)) {
      throw new Error('This password has already been used');
    }
  }
  dataStore.users[index].old_passwords.push(oldPassword);
  dataStore.users[index].password = newPassword;

  setData(dataStore);

  return {};
}

export function adminAuthLogout(token: string): object | ErrorMsg {
  const data: Data = getData();
  const authResult = getAuthUserIdFromToken(token);
  if ('error' in authResult) {
    throw new Error(authResult.error);
  } else {
    const removetoken = data.sessions.findIndex(session => session.token === token);
    data.sessions.splice(removetoken, 1);
    setData(data);
    return {};
  }
}
