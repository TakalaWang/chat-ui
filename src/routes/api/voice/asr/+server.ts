import { z } from "zod";
import { env } from "$env/dynamic/private";
import {
	SpeechConfig,
	AudioConfig,
	SpeechRecognizer,
	ResultReason,
	CancellationReason,
} from "microsoft-cognitiveservices-speech-sdk";

const schema = z.instanceof(ArrayBuffer);

const speechConfig = SpeechConfig.fromSubscription(env.SPEECH_KEY, env.SPEECH_REGION);
speechConfig.speechRecognitionLanguage = env.SPEECH_LANGUAGE;

export async function POST({ request }) {
	try {
		const wav = schema.parse(await request.arrayBuffer());
		const stream = new ReadableStream({
			async start(controller) {
				await recognizeSpeech(wav, controller);
				controller.close();
			},
			cancel() {
				console.log("Stream canceled by the client.");
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (err) {
		if (err instanceof Error) {
			return Response.json({ error: err.message }, { status: 500 });
		} else {
			return Response.json({ error: "An unknown error occurred" }, { status: 500 });
		}
	}
}

async function recognizeSpeech(wav: ArrayBuffer, controller: ReadableStreamDefaultController) {
	console.log("Recognizing speech...", wav.byteLength);
	const audioConfig = AudioConfig.fromWavFileInput(Buffer.from(wav));
	const speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);
	let prevText = "";

	speechRecognizer.recognizing = (s, e) => {
		if (e.result.reason === ResultReason.RecognizingSpeech) {
			const newText = e.result.text.slice(prevText.length);
			prevText = e.result.text;
			console.log(`RECOGNIZING: Text=${newText}`);
			const data = `data: ${JSON.stringify({ partial: newText })}\n\n`;
			controller.enqueue(new TextEncoder().encode(data));
		}
	};

	speechRecognizer.recognized = (s, e) => {
		if (e.result.reason === ResultReason.RecognizedSpeech) {
			prevText = "";
			console.log(`RECOGNIZED: Text=${e.result.text}`);
			const data = `data: ${JSON.stringify({ text: e.result.text })}\n\n`;
			controller.enqueue(new TextEncoder().encode(data));
		} else if (e.result.reason === ResultReason.NoMatch) {
			console.log("No speech could be recognized.");
		}
	};

	let resolve = () => {};
	const promise = new Promise<void>((r) => (resolve = r));

	speechRecognizer.sessionStopped = () => {
		console.log("Session stopped.");
		speechRecognizer.close();
		resolve();
	};

	speechRecognizer.canceled = (s, e) => {
		console.error(`CANCELED: Reason=${e.reason}`);
		if (e.reason === CancellationReason.Error) {
			console.error(`ErrorDetails=${e.errorDetails}`);
			controller.error(e.errorDetails);
		} else if (e.reason === CancellationReason.EndOfStream) {
			console.log("End of audio stream reached.");
		}
		speechRecognizer.close();
		resolve();
	};

	speechRecognizer.startContinuousRecognitionAsync();
	await promise;
}
