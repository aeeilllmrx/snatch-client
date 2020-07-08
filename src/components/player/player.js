import React, { useState } from "react";
import { Button, Form } from 'react-bootstrap';


const Player = ({ name, snatch }) => {
  const [word, setWord] = useState('');

  const handleSubmit = ((event) => {
    event.preventDefault();
    snatch(name, word);
    setWord('');
  });

  return (
    <div>
      <Form onSubmit={handleSubmit}>
        <Form.Control 
          type="text" 
          value={word} 
          onChange={e => setWord(e.target.value)}
        />
        <Button variant="secondary" type="submit">Snatch</Button>
      </Form>
    </div>
  );
}

export default Player;

