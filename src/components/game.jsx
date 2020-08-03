import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Row, Container, Table } from 'react-bootstrap';
import { Board } from './board';
import { Player } from './player';
import {
  generateLetters,
  getBoard,
  getLowestEmptyKey,
  getScores,
  isValid,
  isValidCombination,
  makeCounter,
} from '../logic/helpers';
import 'bootstrap/dist/css/bootstrap.min.css';
import io from 'socket.io-client';
import fetch from 'node-fetch';

const prod = true;
const server = prod
  ? 'https://fathomless-badlands-00348.herokuapp.com'
  : 'http://localhost:5000';
const socket = io.connect(server);

export const Game = (props) => {
  const [room] = useState(props.gameId);
  const [dict, setDict] = useState(new Set());
  const [state, setState] = useState({
    tiles: {},
    squares: {},
    rows: [],
    p1words: [],
    p2words: [],
    p1score: 0,
    p2score: 0,
    bag: generateLetters(),
    minWordLength: props.params.minWordLength,
  });

  /* When entering the room, fetch the dictionary and existing game state. */
  useEffect(() => {
    const fetchDict = async () => {
      try {
        const response = await fetch('/get_wordlist');
        const body = await response.json();
        if (response.status !== 200) {
          throw Error(body.message);
        }
        return body;
      } catch (error) {
        console.error(error);
      }
    };

    fetchDict()
      .then((res) => setDict(new Set(res.data)))
      .catch((err) => console.log(err));

    socket.emit('join-send', { room: room });
    socket.emit('get-state-send', { room: room });
  }, [room]);

  /* If the tiles need to change, listen to server logic. */
  useEffect(() => {
    socket.on('client-connect-receive', function (data) {
      const board = getBoard(data.squares);
      const p1words = data.p1words !== null ? data.p1words : [];
      const p2words = data.p2words !== null ? data.p2words : [];
      const words = { p1: p1words, p2: p2words };
      const scores = getScores(p1words, p2words);
      updateOnConnect(board, words, scores);
    });

    socket.on('flip-receive', (data) => {
      updateOnFlip(data);
    });

    socket.on('snatch-receive', (data) => {
      updateOnSnatch(data);
    });

    socket.on('reset-receive', (data) => {
      updateOnReset(data);
    });
  }, [state.tiles]);

  /* Various helper methods for how to update game state. */
  const updateOnConnect = (board, words, scores) => {
    setState((state) => {
      return {
        ...state,
        tiles: board.tiles,
        squares: board.squares,
        rows: board.rows,
        p1words: words.p1,
        p2words: words.p2,
        p1score: scores.p1,
        p2score: scores.p2,
      };
    });
  };

  const updateOnFlip = (data) => {
    setState((state) => {
      return {
        ...state,
        tiles: data.tiles,
        squares: data.squares,
        rows: data.rows,
      };
    });
  };

  const updateOnSnatch = (data) => {
    setState((state) => {
      return {
        ...state,
        tiles: data.tiles,
        squares: data.squares,
        rows: data.rows,
        p1words: data.p1words,
        p2words: data.p2words,
        p1score: data.p1score,
        p2score: data.p2score,
      };
    });
  };

  const updateOnReset = () => {
    setState((state) => {
      return {
        ...state,
        tiles: {},
        squares: {},
        rows: [],
        p1words: [],
        p2words: [],
        p1score: 0,
        p2score: 0,
        bag: generateLetters(),
      };
    });
  };

  /* Game logic starts here. */
  const removeTiles = (word) => {
    const counter = makeCounter(word);
    Object.entries(counter).forEach(([letter, count]) => {
      Array(count)
        .fill()
        .forEach((_) => {
          let square = state.tiles[letter].pop();
          delete state.squares[square];
        });
    });
  };

  /* 
  Snatch logic is as follows:
  - some initial error checking
  - check if the word can be made from the tiles on the board
  - next, check if the word can be stolen from the opponent
  - finally, check if the word can be combined with one of your own words
  */
  const snatch = (player, word) => {
    if (word.length < state.minWordLength || !dict.has(word.toUpperCase())) {
      return;
    }
    word = word.toUpperCase();

    const playerMap = {
      p1: {
        words: state.p1words,
        oppWords: state.p2words,
      },
      p2: {
        words: state.p2words,
        oppWords: state.p1words,
      },
    };

    let wordCreated = false;
    if (isValid(word, state.tiles)) {
      removeTiles(word);
      playerMap[player].words.push(word);
      wordCreated = true;
    }

    if (wordCreated !== true) {
      let [steal, leftover] = isValidCombination(
        word,
        playerMap[player].oppWords,
        state.tiles
      );
      if (steal) {
        removeTiles(leftover);
        playerMap[player].words.push(word);
        playerMap[player].oppWords.splice(
          playerMap[player].oppWords.indexOf(steal),
          1
        );
        wordCreated = true;
      }
    }

    if (wordCreated !== true) {
      let [add, leftover] = isValidCombination(
        word,
        playerMap[player].words,
        state.tiles
      );
      if (add) {
        removeTiles(leftover);
        playerMap[player].words.splice(playerMap[player].words.indexOf(add), 1);
        playerMap[player].words.push(word);
        wordCreated = true;
      }
    }

    const board = getBoard(state.squares);
    const scores = getScores(state.p1words, state.p2words);

    socket.emit('snatch-send', {
      tiles: board.tiles,
      squares: board.squares,
      rows: board.rows,
      p1words: state.p1words,
      p2words: state.p2words,
      p1score: scores.p1,
      p2score: scores.p2,
      room: room,
    });
  };

  const flip = () => {
    let bag = state.bag;
    let squares = state.squares;
    let tiles = state.tiles;
    if (bag.length > 0) {
      const letter = bag.pop();
      setState((state) => {
        return { ...state, bag: bag };
      });
      const index = getLowestEmptyKey(squares, 100);
      if (letter in tiles) {
        tiles[letter].push(index);
      } else {
        tiles[letter] = [index];
      }

      squares[index] = letter;
      const board = getBoard(squares);

      socket.emit('flip-send', {
        tiles: board.tiles,
        squares: board.squares,
        rows: board.rows,
        room: room,
      });
    }
  };

  const reset = () => {
    socket.emit('reset-send', room);
  };

  return (
    <Container fluid>
      <Row>
        <Col className="text-center p-3 mb-2 bg-info text-white">
          <h3>Player 1</h3>
          <ul>
            {state.p1words.map((word, index) => (
              <li key={index}>{word}</li>
            ))}
          </ul>
          <Player name="p1" snatch={snatch} />
        </Col>

        <Col xs={6} className="text-center p-3 mb-2 bg-light text-dark">
          <h2>Tiles</h2>
          <Board flip={flip} />
          <Alert variant="warning" show={state.bag.length === 0}>
            No more tiles!
          </Alert>

          <Table striped bordered hover className="mt-4">
            <tbody>
              {state.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((letter, j) => (
                    <td key={j}>
                      <div id="cell">{letter}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>

          <div>Player 1 score: {state.p1score}</div>
          <div>Player 2 score: {state.p2score}</div>

          <div className="mt-5">
            <Button variant="outline-dark" onClick={reset}>
              new game?
            </Button>
          </div>
        </Col>

        <Col className="text-center p-3 mb-2 bg-info text-white">
          <h3>Player 2</h3>
          <ul>
            {state.p2words.map((word, index) => (
              <li key={index}>{word}</li>
            ))}
          </ul>
          <Player name="p2" snatch={snatch} />
        </Col>
      </Row>
    </Container>
  );
};
