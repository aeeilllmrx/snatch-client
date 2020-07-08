import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useEffect, useState } from "react";
import { 
  Alert, 
  Button,
  Col,
  Row,
  Container,
  Table
} from 'react-bootstrap';
import './game.css';
import Board from "../board/board";
import Player from "../player/player";
import { 
  generateLetters, 
  getBoard,
  getLowestEmptyKey, 
  getScores, 
  isValid,
  isValidCombination,
  makeCounter 
} from "../../logic/helpers";
import 'bootstrap/dist/css/bootstrap.min.css';

const io = require('socket.io-client');
const prod = true;
let server = '';
if (prod) {
  server = 'https://fathomless-badlands-00348.herokuapp.com'
} else {
  server = 'http://localhost:5000'
}

let socket = io.connect(server);
const fetch = require('node-fetch');

const Game = (props) => {
  const [tiles, setTiles] = useState({});
  const [squares, setSquares] = useState({});
  const [rows, setRows] = useState([]);
  const [p1words, setP1words] = useState([]);
  const [p2words, setP2words] = useState([]);
  const [p1score, setP1score] = useState(0);
  const [p2score, setP2score] = useState(0);
  const [dict, setDict] = useState(new Set());
  const [bag, setBag] = useState(generateLetters());
  const room = props.gameId;
  const minWordLength = props.params.minWordLength;

  /* When entering the room, fetch the dictionary and existing game state. */
  useEffect(() => {
    const fetchDict = async () => {
      try {
        const response = await fetch('/get_wordlist');
        const body = await response.json();
        if (response.status !== 200) {
          throw Error(body.message)
        }
        return body
      } catch (error) {
        console.error(error);
      }
    }

    fetchDict()
      .then(res => setDict(new Set(res.data)))
      .catch(err => console.log(err));

    socket.emit('join-send', {'room': room} );
    socket.emit('get-state-send', {'room': room});
  }, [room]);

  /* If the tiles need to change, listen to server logic. */
  useEffect(() => {
    socket.on("client-connect-receive", function(data) {
      const board = getBoard(data['squares']);
      const p1words = (data['p1words'] !== null ? data['p1words'] : [])
      const p2words = (data['p2words'] !== null ? data['p2words'] : [])
      const words = {'p1': p1words, 'p2': p2words}
      const scores = getScores(p1words, p2words);
      updateOnConnect(board, words, scores);
    })

    socket.on("flip-receive", data => {
      updateOnFlip(data);
    })

    socket.on("snatch-receive", data => {
      updateOnSnatch(data);
    })
    
    socket.on("reset-receive", data => {
      updateOnReset(data);
    })
  }, [tiles, squares]);

  /* Various helper methods for how to update game state. */
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

  /* Game logic starts here. */
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

  /* 
  Snatch logic is as follows:
  - some initial error checking
  - check if the word can be made from the tiles on the board
  - next, check if the word can be stolen from the opponent
  - finally, check if the word can be combined with one of your own words
  */
  const snatch = ((player, word) => {
    if ((word.length < minWordLength) || (!dict.has(word.toUpperCase()))) {
      return;
    }
    word = word.toUpperCase();

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

    let wordCreated = false;
    if (isValid(word, tiles)) {
      removeTiles(word);
      playerMap[player]['words'].push(word);
      wordCreated = true;
    }

    if (wordCreated !== true) {
      let [steal, leftover] = isValidCombination(word, playerMap[player]['oppWords'], tiles);
      if (steal) {
        removeTiles(leftover);
        playerMap[player]['words'].push(word)
        playerMap[player]['oppWords'].splice(playerMap[player]['oppWords'].indexOf(steal), 1);
        wordCreated = true;
      }
    }

    if (wordCreated !== true) {
      let [add, leftover] = isValidCombination(word, playerMap[player]['words'], tiles);
      if (add) {
        removeTiles(leftover);
        playerMap[player]['words'].splice(playerMap[player]['words'].indexOf(add), 1);
        playerMap[player]['words'].push(word);
        wordCreated = true;
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
      'p2score': scores['p2'],
      'room': room
    });
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
        'rows': board['rows'],
        'room': room
      });
    }
  });

  const reset = (() => {
    socket.emit('reset-send', room);
  });

  return (
    <Container fluid>
      <Row>
        <Col className="text-center p-3 mb-2 bg-info text-white">
          <h3>Player 1</h3>
          <ul>
            {p1words.map((word, index) =>
              <li style={{"fontSize":"17px"}} key={index} >{word}</li>
            )}
          </ul>
          <Player
            name='p1'
            snatch={snatch}
          />
        </Col>

        <Col xs={6} className="text-center p-3 mb-2 bg-light text-dark">
          <h2>Tiles</h2>
          <Board
            flip={flip}
          />
          <Alert
            variant="warning" show={bag.length === 0}>No more tiles!
          </Alert>

          <Table striped bordered hover className="mt-4">
            <tbody>
              {rows.map((row, i) =>
                <tr key={i}>
                  {row.map((letter, j) =>
                    <td style={{"fontSize":"20px", "lineHeight":"20px"}} key={j}>
                      <div id="cell" >{letter}</div>
                    </td>)}
                </tr>)}
            </tbody>
          </Table>
       

          <div style={{"fontSize":"17px"}}>
            Player 1 score: {p1score}
          </div>
          <div style={{"fontSize":"17px"}}>
            Player 2 score: {p2score}
          </div>

          <div className="mt-5">
            <Button variant="outline-dark" onClick={reset}>
              new game?
            </Button>
          </div>
        </Col>

        <Col className="text-center p-3 mb-2 bg-info text-white">
          <h3>Player 2</h3>
          <ul>
            {p2words.map((word, index) =>
              <li style={{"fontSize":"17px"}} key={index}>{word}</li>
            )}
          </ul>
          <Player
            name='p2'
            snatch={snatch}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default Game;
