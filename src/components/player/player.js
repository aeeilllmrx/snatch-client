import React, { useState } from "react";

const Player = ({ name, snatch }) => {
  const [word, setWord] = useState('');

  const handleSubmit = ((event) => {
    event.preventDefault();
    snatch(name, word);
    setWord('');
  });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          <input 
            type="text" 
            value={word} 
            onChange={e => setWord(e.target.value)}
          />
        </label>
        <input type="submit" value="Snatch" />
      </form>
    </div>
  );
}

export default Player;

