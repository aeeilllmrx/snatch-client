import stemmer from 'stemmer';

// TODO: make methods functional/immutable

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
  var m = array.length,
    t,
    i;

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
    A: 13,
    B: 3,
    C: 3,
    D: 6,
    E: 18,
    F: 3,
    G: 4,
    H: 3,
    I: 12,
    J: 2,
    K: 2,
    L: 5,
    M: 3,
    N: 8,
    O: 11,
    P: 3,
    Q: 2,
    R: 9,
    S: 6,
    T: 9,
    U: 6,
    V: 3,
    W: 3,
    X: 2,
    Y: 3,
    Z: 2,
  };

  const letters = Object.entries(dist)
    .map(([key, value]) => key.repeat(value))
    .join('');

  return shuffle(letters.split(''));
}

/* 
Get the lowest integer key in a dictionary without a value.
Used to find which square to set.
*/
export function getLowestEmptyKey(dict, n) {
  for (let i = 0; i < n; i++) {
    if (!(i in dict) || dict[i] === '') {
      return i;
    }
  }
}

/* Turn a string into a letter frequency dict. */
export function makeCounter(word) {
  const counter = {};
  for (let c of word) {
    if (!(c in counter)) {
      counter[c] = 1;
    } else {
      counter[c] += 1;
    }
  }
  return counter;
}

/* 
Score each player's list of words. 
Returns a mapping from player to score. 
*/
export function getScores(p1w, p2w) {
  const playerMap = { p1: p1w, p2: p2w };
  const scores = {};

  for (let [player, words] of Object.entries(playerMap)) {
    const wordLengths = words.map((word) => word.length);

    let score = 0;
    for (let wordLength of wordLengths) {
      score += wordLength;
    }
    scores[player] = score;
  }

  return scores;
}

/* Check if a word can be formed from a set of tiles. */
export function isValid(word, tiles) {
  if (!word) {
    return false;
  }
  const wordMap = makeCounter(word);
  const letterMap = Object.fromEntries(
    Object.keys(tiles).map((k) => [k, tiles[k].length])
  );
  return contains(wordMap, letterMap);
}

/* 
Check if a word can be stolen from a list of candidates.
Returns the word to steal and the leftover letters.
*/
export function isValidCombination(word, list, tiles) {
  const wordMap = makeCounter(word);
  const stem = stemmer(word);

  for (let candidate of list) {
    let candStem = stemmer(candidate);
    let candidateMap = makeCounter(candidate);
    if (stem === candStem || !contains(candidateMap, wordMap)) {
      continue;
    }

    let remainder = '';
    for (let key in wordMap) {
      let count =
        key in candidateMap ? wordMap[key] - candidateMap[key] : wordMap[key];
      if (count > 0) {
        remainder = remainder.concat(key.repeat(count));
      }
    }

    if (isValid(remainder, tiles)) {
      return [candidate, remainder];
    }
  }
  return [false, false];
}

export function getBoard(curSquares) {
  let letters = [];
  if (curSquares !== null) {
    letters = Object.values(curSquares).filter((l) => l !== '');
  }
  const squares = {};
  const tiles = {};

  for (let i = 0; i < letters.length; i++) {
    let letter = letters[i];
    squares[i] = letter;
    if (letter in tiles) {
      tiles[letter].push(i);
    } else {
      tiles[letter] = [i];
    }
  }

  const rows = [];
  for (var i = 0; i < 7; i++) {
    let row = [];
    for (var j = 0; j < 7; j++) {
      let index = 7 * i + j;
      let letter = '';
      if (letters[index]) {
        letter = letters[index];
      }
      row.push(letter);
    }
    rows.push(row);
  }

  return {
    tiles: tiles,
    squares: squares,
    rows: rows,
  };
}
