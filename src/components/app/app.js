import 'bootstrap/dist/css/bootstrap.min.css';
import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Switch
} from "react-router-dom";
import './app.css';
import Game from '../../components/game/game';
import Lobby from '../../components/lobby/lobby';

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path='/' render={() => <Lobby />} />
        <Route path='/join/:gameId' render={(props) => 
          <Game gameId={props.match.params.gameId} params={props.location.state} />} />
        <Route path='/play/:gameId' render={(props) => 
          <Game gameId={props.match.params.gameId} params={props.location.state}
          />
        } />
      </Switch>
    </Router>
  );
}

export default App;
