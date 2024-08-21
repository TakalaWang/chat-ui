import { z } from "zod";
import { env } from "$env/dynamic/private";
import { SpeechConfig, SpeechSynthesizer } from "microsoft-cognitiveservices-speech-sdk";

export async function POST({ request }) {
	const { message } = z
		.object({
			message: z.string(),
		})
		.parse(await request.json());

	try {
		const audioData: ArrayBuffer = await asyncSpeech(message);
		return new Response(audioData, { headers: { "Content-Type": "audio/wav" }, status: 200 });
	} catch (err) {
		return Response.json({ message: "Async speech fail" }, { status: 404 });
	}
}

async function asyncSpeech(message: string, voice?: string): Promise<ArrayBuffer> {
	const speechConfig = SpeechConfig.fromSubscription(env.SPEECH_KEY, env.SPEECH_REGION);
	speechConfig.speechSynthesisLanguage = env.SPEECH_REGION;
	speechConfig.speechSynthesisVoiceName = voice || "en-US-AndrewNeural";

	const speechSynthesizer = new SpeechSynthesizer(speechConfig);
	return new Promise((resolve, reject) => {
		speechSynthesizer.speakTextAsync(
			message,
			(result) => {
				const { audioData } = result;
				speechSynthesizer.close();
				if (audioData) {
					resolve(audioData);
				} else {
					reject("No result from speech synthesis");
				}
			},
			(error) => {
				console.error(error);
				speechSynthesizer.close();
				reject(error);
			}
		);
	});
}
