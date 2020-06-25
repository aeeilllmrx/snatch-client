/*
Given two letter frequency maps, determine if the first
is a subset of the second. E.g. Counter(TREE) is a subset
of Counter(STREET) but not of Counter(TERM). 
*/
export function contains(x, y) {
  for (let key in x) {
    if (!(key in y)) {
      return false;
    } else {
      if (x[key] > y[key]) {
        return false;
      }
    }
  }
  return true;
}

/* Randomize order of items in an array. */
function shuffle(array) {
  // Fisher-Yates, from https://bost.ocks.org/mike/shuffle/
  var m = array.length, t, i;

  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

/* Generate letter distribution for game tiles. */
export function generateLetters() {
  const dist = {
    "A": 5,
    "B": 2,
    "C": 4,
    "D": 4,
    "E": 12,
    "F": 4,
    "G": 2,
    "H": 5,
    "I": 5,
    "J": 1,
    "K": 1,
    "L": 5,
    "M": 4,
    "N": 5,
    "O": 6,
    "P": 3,
    "Q": 1,
    "R": 5,
    "S": 5,
    "T": 7,
    "U": 4,
    "V": 2,
    "W": 3,
    "X": 1,
    "Y": 3,
    "Z": 1
  }

  let letters = ''
  for (let [key, value] of Object.entries(dist)) {
    letters = letters.concat(key.repeat(value))
  }
  return shuffle(letters.split(''));
}

/* 
Get the lowest integer key in a dictionary without a value.
Used to find which square to set.
*/
export function getLowestEmptyKey(dict, n) {
  for (let i = 0; i < n; i++) {
    if (!(i in dict) || dict[i] === '') {
      return i
    }
  }
}

/* Turn a string into a letter frequency dict. */
export function makeCounter(word) {
  const counter = {}
  for (let c of word) {
    if (!(c in counter)) {
      counter[c] = 1
    } else {
      counter[c] += 1
    }
  }
  return counter;
}