var SpeechRecognition = SpeechRecognition || (typeof webkitSpeechRecognition === 'undefined' ? null : webkitSpeechRecognition);
var SpeechGrammarList = SpeechGrammarList || (typeof webkitSpeechGrammarList === 'undefined' ? null : webkitSpeechGrammarList);
var SpeechRecognitionEvent = SpeechRecognitionEvent || (typeof webkitSpeechRecognitionEvent === 'undefined' ? null : webkitSpeechRecognitionEvent);

var recognition = SpeechRecognition && new SpeechRecognition();
let max_stops = 2;

export default {
	recording: false,
	start(handler) {
		const self = this;
		max_stops = 2;
		if (!recognition) {
			return;
		}
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
		if (!recognition) {
			return;
		}
		max_stops = 0;
		recognition.stop();
	},
	toggle() {
		if (!recognition) {
			return;
		}
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
