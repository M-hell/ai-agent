import { HfInference } from "@huggingface/inference";
import axios from "axios";
import readlineSync from 'readline-sync';
import dotenv from 'dotenv';
dotenv.config();

// Weather API Function
async function getWeatherDetails(city = '') {
    const options = {
        method: 'GET',
        url: 'https://yahoo-weather5.p.rapidapi.com/weather',
        params: {
            location: city,
            format: 'json',
            u: 'f'
        },
        headers: {
            'x-rapidapi-key': process.env.RAPID_API_KEY,
            'x-rapidapi-host': 'yahoo-weather5.p.rapidapi.com'
        }
    };

    try {
        const response = await axios.request(options);
        const temperature = response.data.forecasts[0].low; // Extracts temperature
        return `${temperature}C`; // Returns temperature as a string
    } catch (error) {
        console.error("Weather API Error:", error.message);
        return "Error fetching weather data.";
    }
}

const tools = {
    "getWeatherDetails": getWeatherDetails
};

const SYSTEM_PROMPT = `
you are an AI assistant with START, PLAN, ACTION, Observation, and Output states.
wait for the user prompt and first plan using available tools.
After planning, take actions with appropriate tools and wait for observation based on action.
Once you get the observations, return the AI response based on START prompt and observations.

strictly follow the json output format as in examples

Available tools:
- function getWeatherDetails(city: string): string
getWeatherDetails function will return the weather details of the city passed as an argument.

Example:
START
{"type":"user","user":"what is the sum of weather of delhi and mumbai"}
{"type":"plan","plan":"I will call the getWeatherDetails function for delhi"}
{"type":"action","function":"getWeatherDetails","input":"delhi"}
{"type":"observation","observation":"10C"}
{"type":"plan","plan":"I will call the getWeatherDetails function for mumbai"}
{"type":"action","function":"getWeatherDetails","input":"mumbai"}
{"type":"observation","observation":"20C"}
{"type":"output","output":"The sum of weather of delhi and mumbai is 30C"}
`;

const client = new HfInference(process.env.HUGGING_FACE_API_KEY1);
const messages = [{ role: "system", content: SYSTEM_PROMPT }];

while (true) {
    const query = readlineSync.question(">> ");

    const userQuery = {
        type: "user",
        user: query,
    };

    messages.push({ role: 'user', content: JSON.stringify(userQuery) });

    while (true) {
        const chat = await client.chatCompletion({
            model: "deepseek-ai/DeepSeek-R1",
            messages: messages,
            response_format: { type: "json_object" },
            provider: "together",
            max_tokens: 500,
        });

        let result = chat.choices[0].message.content;

        // Remove unwanted sections if any
        result = result.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

        // Extract JSON objects separately
        const jsonMatches = result.match(/\{[\s\S]*?\}/g);

        if (!jsonMatches) {
            console.error("No valid JSON found in the AI response.");
            break;
        }

        for (const jsonStr of jsonMatches) {
            try {
                const parsedJson = JSON.parse(jsonStr);
                console.log("Parsed AI Response:", parsedJson);

                messages.push({ role: 'assistant', content: jsonStr });

                if (parsedJson.type === "output") {
                    console.log(`🤖: ${parsedJson.output}`);
                    break;
                } else if (parsedJson.type === "action") {
                    const fn = tools[parsedJson.function];
                    if (fn) {
                        const observation = await fn(parsedJson.input);
                        const obs = { type: "observation", observation: observation };
                        messages.push({ role: 'developer', content: JSON.stringify(obs) });
                    } else {
                        console.error(`Error: Function ${parsedJson.function} not found.`);
                    }
                }
            } catch (error) {
                console.error("Error parsing JSON:", error.message);
            }
        }
    }
}
