import express from "express";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import "dotenv/config";
import cors from "cors";

const openai = new OpenAI();
const app = express();
const port = 3104;

app.use(cors());
app.use(express.json({ limit: "100mb" }));

app.post("/generate-reminder", async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const responseFormat = z.object({
      timeAndDateFound: z.boolean(),
      calendarFileData: z.string(),
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: zodResponseFormat(responseFormat, "response"),
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "If a time and date is found, respond with valid text for ICS files, with nothing else before or after the valid ICS event file text. Do not include ```ics or ```.",
            },
          ],
        },
        {
          role: "system",
          content: [
            {
              type: "text",
              text: `Always use this format: BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Leo Mancini Design//Parking Sign Reminder Generator//EN
METHOD:PUBLISH
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:parking-calendar@leo.gd
DTSTAMP:XXXXXXTXXXXXXZ
DTSTART;TZID=America/New_York:XXXXXXTXXXXXXZ (30 mins before the start of the parking restriction)
DTEND;TZID=America/New_York:XXXXXXTXXXXXXZ (30 mins max duration)
SUMMARY:Move car before XX:XX
DESCRIPTION:Automated reminder to move car before parking restriction starts on XXXXXXX at XX:XX
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Assume US EASTERN TIME ZONE and include US EASTERN TIME ZONE in the ICS data, assume the next closest day after ${today} (but not today), generate the text for an ICS file for 30 mins before the time of the start of the restriction to remind me to move the car before the parking restriction starts`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const result = response.choices[0].message.content;
    res.json({
      timeAndDateFound: result.timeAndDateFound,
      calendarFileData: result.calendarFileData,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
