import { GoogleGenerativeAI } from "@google/generative-ai";
import readlineSync from 'readline-sync';
import dotenv from 'dotenv';
dotenv.config();


// Dummy weather function
function getWeatherDetails(city = '') {
    if (city.toLowerCase() === 'delhi') return '10C';
    if (city.toLowerCase() === 'mumbai') return '20C';
    if (city.toLowerCase() === 'bangalore') return '30C';
    if (city.toLowerCase() === 'chennai') return '40C';
    return "Weather data not available";
}

const tools = { 
    "getWeatherDetails": getWeatherDetails
};

const SYSTEM_PROMPT = `
you are an Ai assistant with START, PLAN, ACTION, Observation, and Output state.
wait for the user prompt and first plan using available tools.
After planning, take actions with appropriate tools and wait for observation based on action.
Once you get the observations, return the AI response based on START prompt and observations.

strictly follow the json output format

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

// Initialize Google Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize messages array for maintaining conversation history
let messages = [{ role: 'system', content: SYSTEM_PROMPT }];

async function getResponse() {
    while (true) {
        const query = readlineSync.question("Enter your query (type 'exit' to stop): ");
        
        if (query.toLowerCase() === 'exit') {
            console.log("Ending the conversation. Goodbye!");
            break; // Break the loop if user wants to exit
        }

        const q = {
            type: 'user',
            user: query
        };
        
        // Add user query to message history
        messages.push({
            role: "user",
            content: JSON.stringify(q)
        });

        // Loop to process the response based on the system's actions
        try {
            // Generate content from Gemini API
            const response = await genAI.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent(JSON.stringify(messages));
            
            // Log raw response text for debugging
            console.log("Raw AI Response:", response.response.text());

            // Clean up raw response to remove Markdown formatting
            let respText = response.response.text();
            respText = respText.replace(/```json|```/g, '').trim(); // Remove ```json and closing ```

            if (!respText) {
                console.log("Empty response received, continuing...");
                continue; // Skip if the response is empty
            }

            // Try parsing the response
            const resp = JSON.parse(respText);

            console.log("AI Response:", resp);

            // Add system response to message history
            messages.push({
                role: "system",
                content: JSON.stringify(resp)
            });

            // Handle the response based on the type
            if (resp.type === 'output') {
                console.log("AI Output:", resp.output);
            } else if (resp.type === 'action') {
                const { function: fn, input } = resp;
                // Execute the function based on the response action
                if (fn === 'getWeatherDetails') {
                    const weather = tools.getWeatherDetails(input);  // Call the weather function
                    messages.push({
                        role: "system",
                        content: JSON.stringify({
                            type: "observation",
                            observation: weather
                        })
                    });
                }
            } else if (resp.type === 'plan') {
                console.log("Plan generated: ", resp.plan);
                // Extract the city from the plan
                const city = resp.plan.split('for ')[1].toLowerCase();
                // Trigger the action for getWeatherDetails
                const weather = tools.getWeatherDetails(city);
                messages.push({
                    role: "system",
                    content: JSON.stringify({
                        type: "observation",
                        observation: weather
                    })
                });

                // Generate the final output
                const outputResponse = await genAI.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent(JSON.stringify(messages));
                let outputText = outputResponse.response.text();
                outputText = outputText.replace(/```json|```/g, '').trim();
                const output = JSON.parse(outputText);

                if (output.type === 'output') {
                    console.log("AI Output:", output.output);
                }
            }
        } catch (error) {
            console.error("Error:", error.message || error);
        }
    }
}

// Start the process
getResponse();