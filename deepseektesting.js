import { HfInference } from "@huggingface/inference";
import dotenv from 'dotenv';
dotenv.config();


const client = new HfInference(process.env.HUGGING_FACE_API_KEY1);

const chatCompletion = await client.chatCompletion({
	model: "deepseek-ai/DeepSeek-R1",
	messages: [
		{
			role: "user",
			content: "What is the capital of France?"
		}
	],
	provider: "together",
	max_tokens: 500,
});

let result=chatCompletion.choices[0].message.content;

// Remove <think> section and everything inside it
result = result.replace(/<think>[\s\S]*?<\/think>/g, "").trim();


console.log("Cleaned AI Response:", result);
