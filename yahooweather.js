import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();

const options = {
  method: 'GET',
  url: 'https://yahoo-weather5.p.rapidapi.com/weather',
  params: {
    location: 'delhi',
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
	console.log(response.data.forecasts[0].low);
} catch (error) {
	console.error(error);
}