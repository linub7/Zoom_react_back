const express = require('express');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const twilio = require('twilio');
const errorHandler = require('./middlewares/error');
const { readdirSync } = require('fs');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

const server = http.createServer(app);

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

readdirSync('./routes').map((r) =>
  app.use('/api/v1', require('./routes/' + r))
);

const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

app.use(errorHandler);

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
