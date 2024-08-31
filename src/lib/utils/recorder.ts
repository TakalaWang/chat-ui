import { browser } from "$app/environment";
import type { IMediaRecorder } from "extendable-media-recorder";

export class AudioRecodingNotSupportedError extends Error {
	constructor() {
		super("Audio recording is not supported in this browser");
	}
}

export class AudioRecorder {
	private _isSupported = browser ? !!navigator.mediaDevices : false;
	private _isRecording = false;
	private _stream: MediaStream | null = null;
	private _mediaRecorder: IMediaRecorder | null = null;
	private _chunks: Blob[] = [];
	private _chunkStreamingCallback: ((chunk: Blob) => unknown) | null = null;

	public isSupported() {
		return this._isSupported;
	}

	public isRecording() {
		return this._isRecording;
	}

	private checkSupported() {
		if (!this.isSupported()) {
			throw new AudioRecodingNotSupportedError();
		}
	}

	public async stream() {
		this.checkSupported();

		if (!this._stream) {
			this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		}

		return this._stream;
	}

	public async mediaRecorder() {
		this.checkSupported();

		if (!this._mediaRecorder) {
			const { MediaRecorder, register } = await import("extendable-media-recorder");
			const { connect } = await import("extendable-media-recorder-wav-encoder");
			await register(await connect());
			this._mediaRecorder = new MediaRecorder(await this.stream(), { mimeType: "audio/wav" });
			this._mediaRecorder.ondataavailable = (event) => {
				this._chunks.push(event.data);
				if (this._chunkStreamingCallback) {
					this._chunkStreamingCallback(event.data);
				}
			};
		}

		return this._mediaRecorder;
	}

	async start(streaming?: (chunk: Blob) => unknown) {
		this.checkSupported();

		if (this.isRecording()) {
			throw new Error("Already recording");
		}

		this._chunks = [];
		const mediaRecorder = await this.mediaRecorder();
		mediaRecorder.start();

		if (streaming) {
			this._chunkStreamingCallback = streaming;
		}

		this._isRecording = true;
	}

	async stop() {
		this.checkSupported();

		if (!this.isRecording()) {
			throw new Error("Not recording");
		}

		const mediaRecorder = await this.mediaRecorder();
		const stopped = new Promise((resolve) => (mediaRecorder.onstop = resolve));
		mediaRecorder.stop();
		await stopped;

		if (this._chunkStreamingCallback) {
			this._chunkStreamingCallback = null;
		}

		this._isRecording = false;

		return new Blob(this._chunks, { type: "audio/wav" });
	}
}

export const recorder = new AudioRecorder();
