import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { Game } from './game';
import { Lobby } from './lobby';

export function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" render={() => <Lobby />} />
        <Route
          path="/join/:gameId"
          render={(props) => (
            <Game
              gameId={props.match.params.gameId}
              params={props.location.state}
            />
          )}
        />
        <Route
          path="/play/:gameId"
          render={(props) => (
            <Game
              gameId={props.match.params.gameId}
              params={props.location.state}
            />
          )}
        />
      </Switch>
    </Router>
  );
}
