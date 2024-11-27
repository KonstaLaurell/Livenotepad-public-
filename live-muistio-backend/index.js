const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'your_secret_key';

app.use(cors());
app.use(bodyParser.json());


mongoose.connect('mongodb://localhost:27017/notepadApps', { useNewUrlParser: true, useUnifiedTopology: true });


const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  notes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }], 
});
const User = mongoose.model('User', userSchema);

const noteSchema = new mongoose.Schema({
  name:  { type:String, required: true},
  note: { type: String, default:""},
  user: { type:String },
  version: { type: Number, default: 1}
})
const Note = mongoose.model('Note', noteSchema);


const convertUsernameToLowerCase = (req, res, next) => {
  if (req.body.username) {
    req.body.username = req.body.username.toLowerCase();
  }
  next();
};


app.post('/register', convertUsernameToLowerCase, async (req, res) => {
  const { username, password } = req.body;
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(409).send('Username already exists');
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword });
  await newUser.save();
  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
  res.status(201).json({ token });
});


app.post('/login', convertUsernameToLowerCase, async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).send('Invalid credentials');
  }
  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
});

const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error'));
      }
      socket.user = decoded;
      next();
    });
  } else {
    next(new Error('Authentication error'));
  }
};

// Create a new note
app.post('/note', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Access denied');

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const { name, note } = req.body;

    let user = await User.findOne({ username: decoded.username.toLowerCase() });
    if (!user) return res.status(404).send('User not found');

    const newNote = new Note({ name, note, user: user.username });
    await newNote.save();

    user.notes.push(newNote._id);
    await user.save();

    io.to(user.username).emit('newNote', newNote);

    res.status(201).json({ note: newNote });
  } catch (err) {
    res.status(400).send('Invalid token');
  }
});

app.get('/notes', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Access denied');

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findOne({ username: decoded.username.toLowerCase() }).populate('notes');
    if (!user) return res.status(404).send('User not found');


    return res.status(200).json({ notes: user.notes });
  } catch (err) {
    return res.status(400).send('Invalid token');
  }
});


app.put('/note/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Access denied');

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const { id } = req.params;
    const { note, version } = req.body;

    const existingNote = await Note.findById(id);
    if (!existingNote) return res.status(404).send('Note not found');

    if (existingNote.user !== decoded.username) {
      return res.status(403).send('Unauthorized');
    }

    if (existingNote.version !== version) {
      return res.status(409).json({ message: 'Version conflict', note: existingNote.note, version: existingNote.version });
    }

    existingNote.note = note;
    existingNote.version += 1;
    await existingNote.save();

    res.status(200).json({ note: existingNote });
  } catch (err) {
    res.status(400).send('Invalid token');
  }
});

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const io = new Server(server, {
  cors: {
    origin: "https://localhost",
    methods: ["GET", "POST"]
  }
});

io.use(authenticateSocket);

const userLocks = {};

io.on('connection', async (socket) => {
  console.log('New client connected', socket.user.username);

  try {
    const user = await User.findOne({ username: socket.user.username.toLowerCase() }).populate('notes');
    if (!user) {
      socket.disconnect();
      return;
    }

    socket.join(user.username);


    socket.emit('allNotes', user.notes);

    socket.on('textChange', async (data) => {
      const { noteId, newText, version } = data;

      if (userLocks[noteId]) {
        return;
      }
      userLocks[noteId] = true;

      try {
        const currentNote = await Note.findById(noteId);
        if (currentNote.version !== version) {
          socket.emit('conflict', { note: currentNote.note, version: currentNote.version });
          userLocks[noteId] = false;
          return;
        }

        currentNote.note = newText;
        currentNote.version += 1;
        await currentNote.save();

        console.log(`Note ${currentNote.name} updated by ${currentNote.user}:`, newText);
        io.to(user.username).emit('updateNote', { noteId: currentNote._id, text: newText, version: currentNote.version });
      } finally {
        userLocks[noteId] = false;
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.user.username);
    });
  } catch (err) {
    console.error(err);
    socket.disconnect();
  }
});
