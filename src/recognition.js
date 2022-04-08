var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent

var recognition = new SpeechRecognition();
var value = "";
let max_stops = 2;

export default {
	start(handler) {
		value = "";
		max_stops = 2;
		console.log("init recognition");
		recognition.start();
		recognition.onresult = function (event) {

			// event is a SpeechRecognitionEvent object.
			// It holds all the lines we have captured so far. 
			// We only need the current one.
			var current = event.resultIndex;

			console.log(event.results[current]);

			// Get a transcript of what was said.
			var transcript = event.results[current][0].transcript;
			console.log(transcript);

			// Add the current transcript to the contents of our Note.
			// var mobileRepeatBug = (current == 1 && transcript == event.results[0][0].transcript);
			// console.log(mobileRepeatBug);
			//if (!mobileRepeatBug) {
			console.log("into resolve");
			value += " " + transcript;
			console.log(value);
			handler.onchange(value);
			//}
		}
		recognition.onend = function () {
			console.log("end recognition");
			if (max_stops > 0) {
				recognition.start();
			} else {
				handler.completed(value);
			}
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
		console.log("stop recognition");
		max_stops = 0;
		recognition.stop();
	}
};
