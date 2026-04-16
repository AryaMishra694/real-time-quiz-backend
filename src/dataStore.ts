import { Data } from './interfaces';
import fs from 'fs';
import path from 'path';
// YOU SHOULD MODIFY THIS OBJECT BELOW ONLY

const filePath = path.resolve(__dirname, '../data.json');

// YOU SHOULD MODIFY THIS OBJECT ABOVE ONLY

// YOU SHOULDNT NEED TO MODIFY THE FUNCTIONS BELOW IN ITERATION 1

/*
Example usage
    let store = getData()
    console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Rando'] }

    names = store.names

    names.pop()
    names.push('Jake')

    console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Jake'] }
    setData(store)
*/

// Use get() to access the data
export function getData() : Data {
  const json = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
  const data: Data = JSON.parse(json);

  return data;
}
// Use set(newData) to pass in the entire data object, with modifications made
export function setData(newData : Data) {
  const newDataString = JSON.stringify(newData);
  fs.writeFileSync(filePath, newDataString, { encoding: 'utf8', flag: 'w' });
}
