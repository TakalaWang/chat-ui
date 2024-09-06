import { base } from "$app/paths";
import { error } from "$lib/stores/errors";

export async function playVoice(conversationId: string, messageId: string, voiceId?: string) {
	try {
		const res = await fetch(`${base}/conversation/${conversationId}/message/${messageId}/play`, {
			method: "POST",
			body: JSON.stringify({ voiceId }),
		});

		if (!res.ok) {
			error.set("Error while async TTS.");
			return;
		}

		const audioData = await res.arrayBuffer();
		const blob = new Blob([audioData], { type: "audio/wav" });
		const url = URL.createObjectURL(blob);
		const audio = new Audio(url);
		audio.play();
	} catch (err) {
		error.set("Error while async TTS.");
		return;
	}
}
