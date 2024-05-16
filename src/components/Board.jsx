import { useState, useEffect } from 'react'

const ROWS = 9;
const COLS = 9;
const TOTAL_CELLS = ROWS*COLS;


function getIndex(x,y) {
	return y*COLS + x;
}

function getCoords(i) {
	const y = Math.floor(i/COLS)
	const x = i % COLS;
	return [x,y];
}


function generate_mines() {
  return new Array(TOTAL_CELLS).fill().map( () => Math.random() < 0.1 );
}


function get_color(count) {
	if (count < 1) throw "get_color() expected count >= 1" // NOTE: 0 is not rendered
	switch(count) {
		case 1: return 'blue';
		case 2: return 'green';
		case 3: return 'red';
		case 4: return 'navy';
		case 5: return 'maroon';
		case 6: return 'teal';
		case 7: return 'gray';  // can't find
		case 8: return 'black'; // seems to differ by version?
	}
}


export default function Board() {

  function Cell(props) {
    const {index} = props;
  
    let value, style;

    if (visible[index]) {
      if (mines[index]) {
        style = {
          backgroundColor: 'red',
        }
        value = 'x';

      } else {
        // count cell
        style = {
          backgroundColor: '#ccc',
        }
        const count = counts[index];
        if(count>0){
          value = count;
          console.log(count);
          style={
            color: get_color(count)
          }
        } else {
          value = ''; // zero count cell is blank
        }
      }

    } else { 
      // unrevealed cell
      style = {
        backgroundColor: "#aaa",
        color: flags[index] ? 'red' : '',
      }

      value = flags[index] ? 'F' : '';
    }

    
    return (
      <td 
        key={index} 
        onMouseDown={(e)=>click_cell(e, index)}
        style={style}
      >
        {value}
      </td>
    )
  }
  
  /////////
  // data

  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);

  const [mines, setMines] = useState( generate_mines() );
  const [visible, setVisible] = useState( Array(TOTAL_CELLS).fill(false) );
  const [counts, setCounts] = useState( Array(TOTAL_CELLS).fill(0) ); // TODO update counts
  const [flags, setFlags] = useState( Array(TOTAL_CELLS).fill(false) ); 

  useEffect( () => {
    init_counts();
  }, [mines]); // mines in dependencies array means we recalculate the counts when mines array changes
  
  // Quality of life enhancement: First click must not land on a mine. 
  // (We'll simply move the mine)
  const [firstClick, setFirstClick ] = useState(true);
  // TODO handle firstClick

  /////////////
  /// logic


  function reset_state() {
    // TODO: duplication of code above. Tidy up?

    setMines( generate_mines() );
    setVisible(Array(TOTAL_CELLS).fill(false));
    setFlags(Array(TOTAL_CELLS).fill(false));
    setCounts(Array(TOTAL_CELLS).fill(0)); // TODO update counts

    setFirstClick(true);
    setGameOver(false);
    setWin(false);
  }

  
  function count_mines() {
    let count = 0;
    for(let i = 0; i < TOTAL_CELLS; i++) {
      if(mines[i]) {
        count++;
      }
    }
    return count;
  }


  function init_counts() {
    console.log('init_counts')

    function check_mine(x, y) {
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) {
        return false;
      }
      const index = getIndex(x,y);
      return mines[index];
    }

    const newCounts = [];
    for(let x = 0; x < COLS; x++) {
      for(let y = 0; y < ROWS; y++) {
        let count = 0;

        if (check_mine(x-1, y-1)) count++; // up left
        if (check_mine(x,   y-1)) count++; // up
        if (check_mine(x+1, y-1)) count++; // up right
        if (check_mine(x-1, y  )) count++; // left
        if (check_mine(x+1, y  )) count++; // right
        if (check_mine(x-1, y+1)) count++; // down left
        if (check_mine(x,   y+1)) count++; // down
        if (check_mine(x+1, y+1)) count++; // down right

        const index = getIndex(x,y);
        newCounts[index] = count;
      }
    }
    setCounts(newCounts);
  }

  ///

  function flood_fill(x, y) {
    // console.log('flood_fill', x, y)
    let newVisible = [...visible];
    flood_fill_real(newVisible,x,y)
    setVisible(newVisible);
  }

  function flood_fill_real(newVisible, x, y) {
    // console.log('flood_fill_real', x, y)
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) {
      return;
    }
    const index = getIndex(x,y);
    // console.log('index',index)
    if (newVisible[index]) return;
    
    newVisible[index] = true;

    if (counts[index] > 0) return; // only recurse if zero (blank) cell

    flood_fill_real(newVisible, x-1, y-1)
    flood_fill_real(newVisible, x,   y-1)
    flood_fill_real(newVisible, x+1, y-1)
    flood_fill_real(newVisible, x-1, y  )
    flood_fill_real(newVisible, x+1, y  )
    flood_fill_real(newVisible, x-1, y+1)
    flood_fill_real(newVisible, x,   y+1)
    flood_fill_real(newVisible, x+1, y+1)
  }


  function move_mine(index) {
    console.log('move_mine')

    // mines[index] = false;
    const newMines = [...mines];
    newMines[index] = false;

    // find first free slot
    for(let i = 0; i < TOTAL_CELLS; i++){
      if (i == index) continue; // don't put it back where we found it!
      if (newMines[i] == false) {
        newMines[i] = true;
        setMines(newMines);
        init_counts();
        console.log('mine moved:');
        console.log(getCoords(index))
        console.log(getCoords(i));
        return;
      }
    }
  }

  ///

  function check_win() {
    // the game is won when all non mine tiles are uncovered
    // In other words, when the visible grid is the inverse of the mines grid
  
    for(let i = 0; i < TOTAL_CELLS; i++){
      if (visible[i] == mines[i]) {
        return false;
      }
    
    }
    // at this point, all elements of visible and mines are opposite
    // therefore all non-mine tiles are uncovered
    return true;
  }


  ///

  function end_game(win) {
    
    // reveal all tiles
    const newVisible = [...visible];
    for(let i = 0; i < TOTAL_CELLS; i++){
      newVisible[i] = true;
    }
    setVisible(newVisible);
    setGameOver(true);
    setWin(win);
  }


  ///

  function click_cell(event, index) {
    if(event.button == 0) {
      left_click_cell(index);
    }
    if(event.button == 2) {
      right_click_cell(index);
    }
 
  }

  function left_click_cell(index){

    let isMine = mines[index];
    if(firstClick && isMine) {
      move_mine(index);
      isMine = false;
    }
  
    setFirstClick(false);
  
    if (isMine) {
      end_game(false);
      // alert('game over');
    } else {
      const [x,y] = getCoords(index);
      flood_fill(x,y);
      // TODO: 
      // There's a bug here.
      // our `visible` array isn't updated
      // until the next time the component renders.
      // So check_win is operating on stale data.
      // We could update it manually, but that's
      // considered an anti-pattern in React land.
      // I'm not sure what the idiomatic solution is.
      if(check_win()) {
        // alert('you win')
        end_game(true);
      }
    }
  }

  function right_click_cell(index){
    // TODO
    if(visible[index]) return; // only add flag on unrevealed tiles 
    const newFlags = [...flags];
    newFlags[index] = !newFlags[index];
    setFlags(newFlags);
  }

  

  /////////////
  // render

  // split 1D array into rows for rendering
  // TODO is there a cleaner way?
  
  let grid = [];

  for(let r = 0; r < ROWS; r++) {
    const start = COLS * r;
    const end = COLS * (r+1);
    grid.push(mines.slice(start, end));
  }


  const gameOverText = win ? 'You Win!' : 'Game Over!';

  // NOTE: r_i*COLS+c_i is the index in the 1D arrays
  return (
    <div id="board">
      <table>
        <tbody>
         {grid.map((row,r_i) => 
          <tr key={r_i}>
            {row.map((cell,c_i) => 
              <Cell key={r_i*COLS+c_i}
                index={r_i*COLS+c_i} 
              />)}
          </tr>)}
        </tbody>
      </table>
      <br/>
      <h2>{gameOver ? gameOverText : `Mines: ${count_mines()}`}</h2>
      <h3 
        style={{opacity: gameOver ? 1 : 0}}
        onClick={()=>reset_state()}
      >Click to Restart</h3>
    </div>
  )
}