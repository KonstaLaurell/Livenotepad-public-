import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import Login from './Login';
import Register from './Register';
import { Container, TextField, Box, Typography, Snackbar, Button, List, ListItem, ListItemButton, ListItemText, Divider } from '@mui/material';
import debounce from 'lodash.debounce';

const App = () => {
  const [token, setToken] = useState('');
  const [socket, setSocket] = useState(null);
  const [notes, setNotes] = useState([]); 
  const [selectedNoteId, setSelectedNoteId] = useState(null); 
  const [text, setText] = useState('');
  const [version, setVersion] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newNoteName, setNewNoteName] = useState('');

  useEffect(() => {
    if (token) {
      const newSocket = io('https://localhost', {
        auth: { token }
      });
      newSocket.on('newNote', (newNote) => {
        setNotes((prevNotes) => [...prevNotes, newNote]);
        setSelectedNoteId(newNote._id);
        setText(newNote.note);
        setVersion(newNote.version);
      });
      
      newSocket.on('allNotes', (notes) => {
        setNotes(notes);
      });

      newSocket.on('updateNote', ({ noteId, text, version }) => {
        if (noteId === selectedNoteId) {
          setText(text);
          setVersion(version);
        }

        setNotes((prevNotes) =>
          prevNotes.map((note) =>
            note._id === noteId ? { ...note, note: text, version } : note
          )
        );
      });

      newSocket.on('conflict', ({ note, version }) => {
        setConflict(true);
        setText(note);
        setVersion(version);
      });

      newSocket.on('newNote', (newNote) => {
        setNotes((prevNotes) => [...prevNotes, newNote]);
        setSelectedNoteId(newNote._id);
        setText(newNote.note);
        setVersion(newNote.version);
      });

      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, [token, selectedNoteId]);

  const debouncedTextChange = useCallback(
    debounce((newText) => {
      if (socket && selectedNoteId) {
        socket.emit('textChange', { noteId: selectedNoteId, newText, version });
      }
    }, 300),
    [socket, version, selectedNoteId]
  );

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    debouncedTextChange(newText);
  };

  const handleCloseConflict = () => {
    setConflict(false);
  };

  const handleNoteSelection = (noteId) => {
    const selectedNote = notes.find((note) => note._id === noteId);
    setSelectedNoteId(noteId);
    setText(selectedNote.note);
    setVersion(selectedNote.version);
  };

  const handleNewNoteNameChange = (e) => {
    setNewNoteName(e.target.value);
  };

  const createNewNote = async () => {
    if (!newNoteName.trim()) return;
    
    const response = await fetch('https://localhost/note', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: newNoteName, note: '' })
    });

    if (response.ok) {
      setNewNoteName(''); 
    } else {

    }
  };

  if (!token) {
    return isRegistering ? (
      <Box display="flex" flexDirection="column" alignItems="center" mt={5}>
        <Register setToken={setToken} />
        <Button onClick={() => setIsRegistering(!isRegistering)} sx={{ mt: 3 }}>
          Already have an account? Login
        </Button>
      </Box>
    ) : (
      <Box display="flex" flexDirection="column" alignItems="center" mt={5}>
        <Login setToken={setToken} />
        <Button onClick={() => setIsRegistering(!isRegistering)} sx={{ mt: 3 }}>
          Need an account? Register
        </Button>
      </Box>
    );
  }

  return (
    <Container>
      <Box display="flex" flexDirection="column" alignItems="center" mt={5}>
        <Typography variant="h4" component="h1" gutterBottom>
          Text Editor
        </Typography>
      </Box>

      <Box display="flex" mt={5}>
        <Box width="25%" pr={2}>
          <List component="nav" >
            {notes.map((note) => (
              <ListItem key={note._id} disablePadding>
                <ListItemButton
                  selected={note._id === selectedNoteId}
                  onClick={() => handleNoteSelection(note._id)}
                >
                  <ListItemText primary={note.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          <Box mt={2}>
            <TextField
              placeholder="New Note Name"
              value={newNoteName}
              onChange={handleNewNoteNameChange}
              fullWidth
              sx={{ mb: 2 }}
            />
            <Button variant="contained" onClick={createNewNote} fullWidth>
              Create Note
            </Button>
          </Box>
        </Box>


        <Box width="75%">
          <TextField
            key={selectedNoteId}
            fullWidth
            multiline
            rows={25}
            variant="outlined"
            value={text}
            onChange={handleTextChange}
            sx={{ width: '100%', maxWidth: '800px', minHeight: '400px' }}
          />
        </Box>
      </Box>

      <Snackbar
        open={conflict}
        message="Conflict detected! Text has been updated."
        onClose={handleCloseConflict}
        autoHideDuration={6000}
      />
    </Container>
  );
};

export default App;
