const express = require('express');
const cors = require('cors');
require('dotenv').config();
const prisma = require('./db/prisma');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware to set headers for SSE
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  next();
});

// Route for subscribing
app.get('/subscribe/:id', (req, res) => {
  // Function to send a message at regular intervals
  const sendEvent = async () => {
    const id = req.params.id;

    // Fetch data from MongoDB
    // const data = await Tournament.findOne({ _id: req.params.id });
    const data = await prisma.tournament.findFirst({
        where: { id: id },
        include: {
          teams: {
            include: {
              players: true,
            },
          },
          matches: true
        },
      });
    if (data && data.password) {
        delete data.password;
    }

    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send an event every 2 seconds
  const intervalId = setInterval(sendEvent, 2000);

  // Clean up when the client disconnects
  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
