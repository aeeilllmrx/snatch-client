import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useEffect, useState } from "react";
import { Alert, Button } from 'react-bootstrap';
import stemmer from 'stemmer';
import './App.css';
import Board from "./components/board/board";
import Player from "./components/player/player";
import { contains, generateLetters, getLowestEmptyKey, makeCounter } from "./helpers";

const io = require('socket.io-client');
const socket = io('http://fathomless-badlands-00348.herokuapp.com');


function App() {
  const [tiles, setTiles] = useState({});
  const [squares, setSquares] = useState({});
  const [rows, setRows] = useState([]);
  const [p1words, setP1words] = useState([]);
  const [p2words, setP2words] = useState([]);
  const [p1score, setP1score] = useState(0);
  const [p2score, setP2score] = useState(0);
  const [dict, setDict] = useState([]);
  const [bag, setBag] = useState(generateLetters());

  // set dict on mount
  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/get_wordlist');
      const body = await response.json();
      if (response.status !== 200) {
        throw Error(body.message)
      }
      return body
    }

    fetchData()
      .then(res => setDict(new Set(res.data)))
      .catch(err => console.log(err));
  }, []);

  // when a user connects to an existing game, show the latest data
  const updateOnConnect = ((board, words, scores) => {
    setTiles(board['tiles']);
    setSquares(board['squares']);
    setRows(board['rows']);

    setP1words(words['p1']);
    setP2words(words['p2']);

    setP1score(scores['p1']);
    setP2score(scores['p2']);
  });

  const updateOnFlip = ((data) => {
    setTiles(data['tiles']);
    setSquares(data['squares']);
    setRows(data['rows']);
  });

  const updateOnSnatch = ((data) => {
    setTiles(data['tiles']);
    setSquares(data['squares']);
    setRows(data['rows']);
    setP1words(data['p1words']);
    setP2words(data['p2words']);
    setP1score(data['p1score']);
    setP2score(data['p2score']);
  });

  const updateOnReset = (() => {
    setTiles({});
    setSquares({});
    setRows([]);
    setP1words([]);
    setP2words([]);
    setP1score(0);
    setP2score(0);
    setBag(generateLetters());
  });

  // always update on flip, snatch, and new client
  useEffect(() => {
    socket.on("client-connect-receive", data => {
      const board = getBoard(data['squares']);
      const words = {'p1': data['p1words'], 'p2': data['p2words']}
      const scores = getScores(data['p1words'], data['p2words']);
      updateOnConnect(board, words, scores);
    })

    socket.on("flip-receive", data => {
      updateOnFlip(data);
    })

    socket.on("snatch-receive", data => {
      updateOnSnatch(data);
    })

    socket.on("reset-receive", () => {
      updateOnReset();
    })
  }, []);

  const isValid = ((word) => {
    const wordMap = makeCounter(word);
    const letterMap = Object.fromEntries(
      Object.keys(tiles).map(k => [k, tiles[k].length])
    )
    return contains(wordMap, letterMap);
  });

  const isValidCombination = ((word, list) => {
    const wordMap = makeCounter(word);
    const letterMap = Object.fromEntries(
      Object.keys(tiles).map(k => [k, tiles[k].length])
    )
    const stem = stemmer(word);

    for (let candidate of list) {
      let candStem = stemmer(candidate);
      if (stem === candStem) {
        return [false, false];
      }
      let candidateMap = makeCounter(candidate);
      let remainder = {}
      for (let key in wordMap) {
        let count = (key in candidateMap ?
          wordMap[key] - candidateMap[key] : wordMap[key]);
        if (count > 0) {
          remainder[key] = count;
        }
      }
      if (contains(remainder, letterMap)) {
        return [candidate, remainder];
      }
    }
    return [false, false];
  });

  const removeTiles = ((word) => {
    const counter = makeCounter(word);
    for (let letter in counter) {
      const count = counter[letter];

      for (let i = 0; i < count; i++) {
        let square = tiles[letter].pop()
        delete squares[square];
      }
    }
  });

  const snatch = ((player, word) => {
    if (word.length < 3) {
      return;
    }
    if (!dict.has(word.toUpperCase())) {
      return;
    }

    word = word.toUpperCase();

    // create a map to state objects so we can generalize the logic
    const playerMap = {
      'p1': {
        'words': p1words,
        'oppWords': p2words
       },
       'p2': {
        'words': p2words,
        'oppWords': p1words
       }
    }

    // first, see if the word can be made from the board
    if (isValid(word)) {
      console.log("word is valid");
      removeTiles(word);
      playerMap[player]['words'].push(word);
    } else {
      // next, try to steal from opponent
      let [ steal, leftoverMap ] = isValidCombination(word, playerMap[player]['oppWords']);
      if (steal) {
        console.log("word is valid steal");
        let leftover = ''
        for (let [key, value] of Object.entries(leftoverMap)) {
          leftover = leftover.concat(key.repeat(value))
        }
        removeTiles(leftover);
        playerMap[player]['words'].push(word)
        playerMap[player]['oppWords'].splice(playerMap[player]['oppWords'].indexOf(steal), 1);
      } else {
        // finally, try to add on to yourself
        let [ addOn, leftoverMap ] = isValidCombination(word, playerMap[player]['words']);
        if (addOn) {
          console.log("word is valid add-on");
          let leftover = ''
          for (let [key, value] of Object.entries(leftoverMap)) {
            leftover = leftover.concat(key.repeat(value))
          }
          removeTiles(leftover);
          playerMap[player]['words'].splice(playerMap[player]['words'].indexOf(steal), 1);
          playerMap[player]['words'].push(word)
        }
      }
    }

    const board = getBoard(squares);
    const scores = getScores(p1words, p2words);

    socket.emit('snatch-send', {
      'tiles': board['tiles'],
      'squares': board['squares'],
      'rows': board['rows'],
      'p1words': p1words,
      'p2words': p2words,
      'p1score': scores['p1'],
      'p2score': scores['p2']
    });
  });

  const getBoard = ((sq) => {
    const letters = Object.values(sq).filter(l => l !== '');
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
    for (var i = 0; i < 7; i++){
      let row = []
      for (var j = 0; j < 7; j++){
        let index = 7 * i + j;
        let letter = ''
        if (letters[index]) {
          letter = letters[index];
        }
        row.push(letter);
      }
      rows.push(row);
    }

    return {
      'tiles': tiles,
      'squares': squares,
      'rows': rows
    }
  });

  const getScores = ((p1w, p2w) => {
    const playerMap = {'p1': p1w, 'p2': p2w }
    const newScores = {};

    for (let [player, words] of Object.entries(playerMap)) {
      const wordLengths = words.map(word => word.length);

      let score = 0;
      for (let wordLength of wordLengths) {
        score += (wordLength - 3);
      }
      newScores[player] = score;
    }

    return newScores;
  });

  const flip = (() => {
    if (bag.length > 0) {
      const letter = bag.pop();
      setBag(bag);
      const index = getLowestEmptyKey(squares, 100);
      if (letter in tiles) {
        tiles[letter].push(index);
      } else {
        tiles[letter] = [index];
      }

      squares[index] = letter;

      const board = getBoard(squares);

      socket.emit('flip-send', {
        'tiles': board['tiles'],
        'squares': board['squares'],
        'rows': board['rows']
      });
    }
  });

  const reset = (() => {
    socket.emit('reset-send', {});
  });


  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col" align="center">
          <h3>Player 1</h3>
          <span> Words </span>
          <ul>
            {p1words.map((word, index) =>
              <li key={index}>{word}</li>
            )}
          </ul>
          <Player
            name='p1'
            snatch={snatch}
          />
        </div>

        <div className="col-5" align="center">
          <h3>Tiles</h3>
          <Board
            flip={flip}
          />
          <Alert
            variant="warning" show={bag.length === 0}>No more tiles!
          </Alert>

          <div className="board">
            <table className="table table-bordered table-striped">
              <tbody>
                {rows.map((row, i) =>
                  <tr key={i}>
                    {row.map((letter, j) =>
                      <td key={j}>
                        <div id="cell" >{letter}</div>
                      </td>)}
                  </tr>)}
              </tbody>
            </table>
          </div>

          <div>
            Player 1 score: {p1score}
          </div>
          <div>
            Player 2 score: {p2score}
          </div>

          <div id="new-game">
            <Button variant="outline-dark" onClick={reset}>
              new game?
            </Button>
          </div>
        </div>

        <div className="col" align="center">
          <h3>Player 2</h3>
          <span> Words </span>
          <ul>
            {p2words.map((word, index) =>
              <li key={index}>{word}</li>
            )}
          </ul>
          <Player
            name='p2'
            snatch={snatch}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
