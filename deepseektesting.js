import { HfInference } from "@huggingface/inference";
import dotenv from 'dotenv';
dotenv.config();


const client = new HfInference(process.env.HUGGING_FACE_API_KEY);

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

console.log(chatCompletion.choices[0].message.content);
