import React from 'react';
import {Button} from 'react-bootstrap';

const Board = ({ flip }) => {
  return (
    <div>
      <Button variant="outline-primary" onClick={flip}>
        add tile
      </Button>
    </div>
  );
}

export default Board;
