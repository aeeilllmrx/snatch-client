import React from "react";
import { Alert } from 'react-bootstrap';

import stemmer from 'stemmer';

import Board from "./components/board/board"
import Player from "./components/player/player"
import { contains, generateLetters, getLowestEmptyKey, makeCounter } from "./helpers"

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tiles: {}, // map from letter to the squares it appears on
      squares: {}, // map from each square to the letter it contains
      p1words: [],
      p2words: [],
      p1score: 0,
      p2score: 0,
      bag: generateLetters(),
      rows: [],
      dict: []
    };

    this.flip = this.flip.bind(this);
    this.isValid = this.isValid.bind(this);
    this.isValidCombination = this.isValidCombination.bind(this);
    this.removeTiles = this.removeTiles.bind(this);
    this.setBoard = this.setBoard.bind(this);
    this.snatch = this.snatch.bind(this);
  }

  componentDidMount() {
    // Call our fetch function below once the component mounts
    this.callBackendAPI()
      .then(res => this.setState({ dict: new Set(res.data) }))
      .catch(err => console.log(err));
  }

  // Fetches our GET route from the Express server.
  // Note the route we are fetching matches the GET route from server.js
  callBackendAPI = async () => {
    const response = await fetch('/get_wordlist');
    const body = await response.json();

    if (response.status !== 200) {
      throw Error(body.message)
    }
    return body;
  };

  isValid(word) {
    const wordMap = makeCounter(word);
    const tiles = this.state.tiles
    const letterMap = Object.fromEntries(
      Object.keys(tiles).map(k => [k, tiles[k].length])
    )
    return contains(wordMap, letterMap);
  }

  isValidCombination(word, list) {
    const wordMap = makeCounter(word);
    const tiles = this.state.tiles
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
  }

  removeTiles(word) {
    const squares = this.state.squares;
    const tiles = this.state.tiles;

    const counter = makeCounter(word);
    for (let letter in counter) {
      const count = counter[letter];

      for (let i = 0; i < count; i++) {
        let square = tiles[letter].pop()
        delete squares[square];
      }
      
      if (tiles[letter].length === 0) {
        delete tiles[letter];
      }
    }

    this.setState(state => ({
      squares: squares,
      tiles: tiles
    }))

    this.setBoard();
  }

  snatch(player, word) {
    if (word.length === 0) {
      return;
    }
    if (!this.state.dict.has(word.toUpperCase())) {
      return;
    }

    word = word.toUpperCase();
    const p1words = this.state.p1words;
    const p2words = this.state.p2words;

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
    if (this.isValid(word)) {
      console.log("word is valid");
      this.removeTiles(word);

      playerMap[player]['words'].push(word);
    } else {
      // next, try to steal from opponent
      let [ steal, leftoverMap ] = this.isValidCombination(word, playerMap[player]['oppWords']);
      if (steal) {
        console.log("word is valid steal");
        let leftover = ''
        for (let [key, value] of Object.entries(leftoverMap)) {
          leftover = leftover.concat(key.repeat(value))
        }
        this.removeTiles(leftover);
        
        playerMap[player]['words'].push(word)
        playerMap[player]['oppWords'].splice(playerMap[player]['oppWords'].indexOf(steal), 1);
      } else {
        // finally, try to add on to yourself
        let [ addOn, leftoverMap ] = this.isValidCombination(word, playerMap[player]['words']);
        if (addOn) {
          console.log("word is valid add-on");
          let leftover = ''
          for (let [key, value] of Object.entries(leftoverMap)) {
            leftover = leftover.concat(key.repeat(value))
          }
          this.removeTiles(leftover);
          
          playerMap[player]['words'].splice(playerMap[player]['words'].indexOf(steal), 1);
          playerMap[player]['words'].push(word)
        }
      }
    }

    this.setState(state => ({
      p1words: p1words,
      p2words: p2words
    }));

    this.setScores();
  }

  setBoard() {
    const letters = Object.values(this.state.squares).filter(l => l !== '');

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
        let cellID = `cell${i}-${j}`;
        let index = 7 * i + j;
        let letter = ''
        if (letters[index]) {
          letter = letters[index];
        }
        row.push(
          <td key={cellID}> 
            <div id="cell" >{letter}</div>
          </td>
        )
      }
      rows.push(<tr key={i}>{row}</tr>)
    }

    this.setState(state => ({
      squares: squares,
      tiles: tiles,
      rows: rows
    }))
  }

  setScores() {
    const playerMap = {'p1': this.state.p1words, 'p2': this.state.p2words }
    const newScores = {};

    for (let [player, words] of Object.entries(playerMap)) {
      const wordLengths = words.map(word => word.length);
    
      let score = 0;
      for (let wordLength of wordLengths) {
        score += (wordLength - 3);
      }

      newScores[player] = score;
    }

    this.setState(state => ({
      p1score: newScores['p1'],
      p2score: newScores['p2']
    }))

  }

  flip() {
    const bag = this.state.bag;
    const tiles = this.state.tiles;
    const squares = this.state.squares;
    if (bag.length > 0) {
      const letter = this.state.bag.pop()
      const index = getLowestEmptyKey(this.state.squares, 100);
      if (letter in tiles) {
        tiles[letter].push(index);
      } else {
        tiles[letter] = [index];
      }

      squares[index] = letter;
      this.setState(state => ({
        tiles: tiles,
        squares: squares
      }))
    }

    this.setBoard();
  }
        
  render() {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col" align="center">
            <h3>Player 1</h3>
            <span> Words </span>
            <ul>
              {this.state.p1words.map((word, index) =>
                <li key={index}>{word}</li>
              )}
            </ul>
            <Player
              name='p1'
              snatch={this.snatch.bind(this)}
              setBoard={this.setBoard.bind(this)}
            />
          </div>

          <div className="col-5" align="center">
            <h3>Tiles</h3>
            <Board
              flip={this.flip.bind(this)}
            />
            <Alert 
              variant="warning" show={this.state.bag.length === 0}>No more tiles!
            </Alert>

            <div className="board">
              <table className="table table-bordered table-striped">
                <tbody>
                  {this.state.rows}
                </tbody>
              </table>
            </div> 

            <div>
              Player 1 score: {this.state.p1score}
            </div>
            <div>
              Player 2 score: {this.state.p2score}
            </div>
          </div>
          
          <div className="col" align="center">
            <h3>Player 2</h3>
            <span> Words </span>
            <ul>
              {this.state.p2words.map((word, index) =>
                <li key={index}>{word}</li>
              )}
            </ul>
            <Player
              name='p2'
              snatch={this.snatch.bind(this)}
              setBoard={this.setBoard.bind(this)}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
