import { z } from "zod";
import { ObjectId } from "mongodb";
import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { authCondition } from "$lib/server/auth";
import { collections } from "$lib/server/database";
import { SpeechConfig, SpeechSynthesizer } from "microsoft-cognitiveservices-speech-sdk";

export async function POST({ request, params, locals }) {
	const { voiceId } = z.object({ voiceId: z.string().optional() }).parse(await request.json());

	const conv =
		params.id.length === 7
			? await collections.sharedConversations.findOne({
					_id: params.id,
			  })
			: await collections.conversations.findOne({
					_id: new ObjectId(params.id),
					...authCondition(locals),
			  });

	if (conv === null) {
		error(404, "Conversation not found");
	}

	const message = conv.messages.find((m) => m.id === params.messageId);
	if (!message) {
		return Response.json({ message: "Message not found" }, { status: 404 });
	}

	try {
		const audioData: ArrayBuffer = await asyncSpeech(message.content, voiceId);
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
