import React from 'react';
import {Button} from 'react-bootstrap';

class Board extends React.Component {
  render() {
    const { flip } = this.props;

    return (
      <div>
        <Button variant="outline-primary" onClick={flip}>
          add tile
        </Button>
      </div>
    );
  }
}

export default Board;
