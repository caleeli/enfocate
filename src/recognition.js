var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent

var recognition = new SpeechRecognition();
let max_stops = 2;

export default {
	recording: false,
	start(handler) {
		const self = this;
		max_stops = 2;
		recognition.start();
		recognition.onresult = function (event) {

			// event is a SpeechRecognitionEvent object.
			// It holds all the lines we have captured so far. 
			// We only need the current one.
			var current = event.resultIndex;

			// Get a transcript of what was said.
			var transcript = event.results[current][0].transcript;

			handler.onchange(transcript);
		}
		recognition.onstart = function () {
			self.recording = true;
			self.onstart_cb();
		}
		recognition.onend = function () {
			self.recording = false;
			self.onend_cb();
		}
		recognition.onerror = function (event) {
			if (event.error == 'no-speech') {
				max_stops--;
				if (max_stops < 1) {
					recognition.stop();
				}
			};
		};
	},
	stop() {
		max_stops = 0;
		recognition.stop();
	},
	toggle() {
		if (this.recording) {
			recognition.stop();
		} else {
			recognition.start();
		}
	},
	onstart(cb) {
		this.onstart_cb = cb;
	},
	onstart_cb() { },
	onend(cb) {
		this.onend_cb = cb;
	},
	onend_cb() { },
};
