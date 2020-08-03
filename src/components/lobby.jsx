import React, { useState } from 'react';
import { Button, Form, FormControl } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export const Lobby = () => {
  const [gameId, setGameId] = useState('');
  const [minWordLength, setMinWordLength] = useState(3);

  const getRandom = (max) => {
    return Math.floor(Math.random() * Math.floor(max));
  };

  return (
    <div>
      <div className="play-div">
        <Link
          to={{
            pathname: '/play/' + getRandom(1000),
            state: { gameId: gameId, minWordLength: minWordLength },
          }}
        >
          <Button variant="outline-primary">Start new</Button>
        </Link>
      </div>

      <div className="join-div">
        <div className="col-sm-2">
          <FormControl
            placeholder="or enter game #"
            onChange={(e) => setGameId(e.target.value)}
          />
        </div>
        <div>
          <Link
            to={{
              pathname: '/join/' + gameId,
              state: { gameId: gameId, minWordLength: minWordLength },
            }}
          >
            <Button variant="outline-primary">Join existing</Button>
          </Link>
        </div>
      </div>

      <div className="settings">
        <div className="col-sm-3">
          <Form.Label>Minimum word length</Form.Label>
          <FormControl
            as="select"
            onChange={(e) => setMinWordLength(e.target.value)}
          >
            <option>3</option>
            <option>4</option>
            <option>5</option>
          </FormControl>
        </div>
      </div>

      <div className="instructions">
        <div>
          Herein lies a simple implementation of{' '}
          <a href="https://en.wikipedia.org/wiki/Anagrams">Snatch</a>. The rules
          are as follows:
        </div>
        <br></br>
        <div>
          <ul>
            <li>
              Flip over tiles on the board. If you are able to form a word,
              enter it and it becomes yours.
            </li>
            <li>
              Opponents' words can be "snatched" by anagramming and combining
              them with free letters.
            </li>
            <li>
              For example, if your opponent has "CAT", and there's an "L" on the
              board, you can snatch it with "TALC".
            </li>
            <li>Similarly, you can snatch your own words.</li>
            <li>Play continues until all tiles have run out.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
