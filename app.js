const express = require("express");
const cors = require("cors");
const app = express();
const port = 3015;
const fs = require("fs");

const google = require("@google/genai");
const GoogleGenAI = google.GoogleGenAI;

const ai = new GoogleGenAI({
  apiKey: "AIzaSyAc6IU_5utbXkEg4xHKW2XPn-A6O1YKIGw",
});

const NIKI_BOT_TELEGRAM_TOKEN = "7605364570:AAEmYL90YnMY1tIhCbgKtk4hOM2fRpVYEpA";
const NIKI_BOT_CHAT_ID = "1550770814";

const DATA_FILE = "./data.json";

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8") || "[]");

  res.json({
    success: true,
    data,
  });
});

app.post("/birthday", async (req, res) => {
  const { name, prompt, day, month, year } = req.body;

  if (!prompt || !day || !month || !year || !name)
    return res.json({
      success: false,
      message: "Please fill out all of the fields",
    });

  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8") || "[]");

  data.push({
    name,
    prompt,
    birthday: `${month}-${day}-${year}`,
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  return res.json({ sucess: true, message: "saved" });
});

const sendMessage = async (message = "Could not send message") => {
  const res = await fetch(
    `https://api.telegram.org/bot${NIKI_BOT_TELEGRAM_TOKEN}/sendMessage?chat_id=${NIKI_BOT_CHAT_ID}&text=${message}`
  );

  console.log("res", res);
};

const ONE_HOUR = 1000 * 60 * 60;

const mainLoop = () => {
  setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();

    if (hour !== 17) return;

    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8") || "[]");

    const birthdaysToday = data.filter((birthdayObj) => {
      const date = new Date(birthdayObj.birthday);
      const month = date.getMonth();
      const dayInMonth = date.getDate();

      return now.getMonth() === month && now.getDate() === dayInMonth;
    });

    if (!birthdaysToday.length) return;

    try {
      for await (const birthdayObj of birthdaysToday) {
        const name = birthdayObj.name;

        const prompt = `My friend's name is ${name}. They've got a birthday today. 
        Please give me a birthday greeting for them, using this prompt: ${birthdayObj.prompt}. Note that I 
        only want the greeting as plain text in hebrew, no other message from you.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
        });

        sendMessage(response.text);
      }
    } catch (e) {
      return {
        success: false,
        message: e?.message || "Sorry, something went wrong, please try again",
      };
    }
  }, ONE_HOUR);
};

app.listen(port, () => {
  console.log(`Brithday reminder server listening on port ${port}`);
  mainLoop();
});
