import { base } from "$app/paths";
import { error } from "$lib/stores/errors";
import { writable } from "svelte/store";

export const isPlaying = writable(false);
export const waitingForAudio = writable(false);

export async function playVoice(
	conversationId: string,
	messageId: string,
	voiceId?: string
): Promise<HTMLAudioElement | undefined> {
	try {
		waitingForAudio.set(true);
		const res = await fetch(`${base}/conversation/${conversationId}/message/${messageId}/play`, {
			method: "POST",
			body: JSON.stringify({ voiceId }),
		});

		if (!res.ok) {
			waitingForAudio.set(false);
			error.set("Error while async TTS.");
			return;
		}

		const audioData = await res.arrayBuffer();
		const blob = new Blob([audioData], { type: "audio/wav" });
		const url = URL.createObjectURL(blob);
		const audio = new Audio(url);

		audio.addEventListener("play", () => {
			isPlaying.set(true);
		});
		audio.addEventListener("pause", () => {
			isPlaying.set(false);
		});
		audio.addEventListener("ended", () => {
			isPlaying.set(false);
		});

		return audio;
	} catch (err) {
		error.set("Error while async TTS.");
		return;
	} finally {
		waitingForAudio.set(false);
	}
}
