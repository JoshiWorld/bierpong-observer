import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();
const app = express();

// Middleware to set CORS headers and SSE headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  ); // Replace with your frontend domain
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true"); // Allow credentials
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  next();
});

// Route for subscribing
app.get("/subscribe/:id", (req: Request, res: Response) => {
  const sendEvent = async () => {
    const id = req.params.id;

    try {
      const data = await prisma.tournament.findFirst({
        where: { id: id },
        include: {
          teams: {
            include: {
              players: true,
              team1Matches: true,
              team2Matches: true,
              winnerMatches: true,
              looserMatches: true,
            },
          },
          matches: {
            include: {
              team1: true,
              team2: true,
              winner: true,
              looser: true,
            },
          },
          groups: {
            include: {
              teams: true,
              matches: {
                include: {
                  team1: true,
                  team2: true,
                  winner: true,
                  looser: true,
                },
              },
            },
          },
        },
      });

      if (data && data.password) {
        // @ts-expect-error
        delete data.password;
      }

      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error("Error fetching data:", error);
      res.write(
        `data: ${JSON.stringify({ error: "Error fetching data" })}\n\n`
      );
    }
  };

  // Send an event every 2 seconds
  const intervalId = setInterval(sendEvent, 2000);

  // Clean up when the client disconnects
  req.on("close", () => {
    clearInterval(intervalId);
    res.end();
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
