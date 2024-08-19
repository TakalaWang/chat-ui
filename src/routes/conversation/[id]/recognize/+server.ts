import { z } from "zod";
import { env } from "$env/dynamic/private";
import {
	SpeechConfig,
	AudioInputStream,
	AudioConfig,
	SpeechRecognizer,
} from "microsoft-cognitiveservices-speech-sdk";

export async function POST({ request }) {
	const recordData = await request.arrayBuffer();

	z.instanceof(ArrayBuffer).parse(recordData);

	try {
		const text: string = await recognizeSpeech(recordData);
		console.log("Recognized text: ", text);
		return new Response(text, { headers: { "Content-Type": "text/plain" }, status: 200 });
	} catch (err) {
		return Response.json({ message: "Async speech fail" }, { status: 404 });
	}
}

async function recognizeSpeech(recordData: ArrayBuffer): Promise<string> {
	const speechConfig = SpeechConfig.fromSubscription(env.SPEECH_KEY, env.SPEECH_REGION);
	speechConfig.speechRecognitionLanguage = env.SPEEECH_LANGUAGE;
	const pushStream = AudioInputStream.createPushStream();
	pushStream.write(recordData);
	pushStream.close();
	const audioConfig = AudioConfig.fromStreamInput(pushStream);
	const speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);

	return new Promise((resolve, reject) => {
		speechRecognizer.recognizeOnceAsync(
			(result) => {
				const { text } = result;
				console.log("Recognized: ", text);
				speechRecognizer.close();
				if (text) {
					resolve(text);
				} else {
					reject("No result from speech synthesis");
				}
			},
			(error) => {
				console.error(error);
				speechRecognizer.close();
				reject(error);
			}
		);
	});
}
