import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();
const app = express();

// Enable CORS for all routes
app.use(
  cors({
    origin: "*", // You can specify an array of allowed origins instead of '*'
    methods: ["GET", "POST"], // Specify allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
  })
);

// Middleware to set headers for SSE
app.use((req: Request, res: Response, next: NextFunction) => {
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
        // @ts-expect-error || @ts-ignore
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
