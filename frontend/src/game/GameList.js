import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Paper,
  Box,
  Button,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { getAllGames, deleteGame } from './gameService';

const GameList = () => {
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadGames = async () => {
    try {
      const gamesData = await getAllGames();
      setGames(gamesData);
    } catch (err) {
      setError('Failed to load games');
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteGame(id);
      setGames(games.filter(game => game.id !== id));
    } catch (err) {
      setError('Failed to delete game');
    }
  };

  const handlePlay = (id) => {
    navigate(`/play/${id}`);
  };

  const handleNewGame = () => {
    navigate('/play/new');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Your Games</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleNewGame}
        >
          New Game
        </Button>
      </Box>
      
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Paper elevation={2}>
        <List>
          {games.length === 0 ? (
            <ListItem>
              <ListItemText primary="No saved games found" />
            </ListItem>
          ) : (
            games.map((game) => (
              <ListItem
                key={game.id}
                secondaryAction={
                  <>
                    <IconButton
                      edge="end"
                      aria-label="play"
                      onClick={() => handlePlay(game.id)}
                      sx={{ mr: 1 }}
                    >
                      <PlayArrowIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDelete(game.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
              >
                <ListItemText
                  primary={`Game #${game.id}`}
                  secondary={
                    <>
                      <Typography variant="body2" component="span" display="block">
                        Last played: {new Date(game.updated_at).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" component="span" display="block">
                        Created: {new Date(game.created_at).toLocaleString()}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        component="span" 
                        color={game.is_completed ? "success.main" : "info.main"}
                      >
                        Status: {game.is_completed ? "Completed" : "In Progress"}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default GameList; 