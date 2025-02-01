var root = document.body;

function fetchRace(random_number) {
  return fetch("../data/races.json")
    .then((res) => res.json())
    .then((data) => {
      var all_races = data["sentences"];
      // Adjust random number to be within bounds if needed
      const adjusted_number = ((random_number - 1) % all_races.length) + 1;
      const race = all_races.find((race) => race.id === adjusted_number);
      if (!race) {
        console.log(
          "Race not found for number:",
          adjusted_number,
          "Available races:",
          all_races.length
        );
        throw new Error("Race not found");
      }
      return race.text;
    })
    .catch((error) => {
      console.log("Could not obtain race: ", error);
      return 'public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}';
    });
}

function getWpmAccuracy(time_in_seconds, total_characters, words_tracker) {
  if (time_in_seconds <= 0) return [0, 0];

  const minutes = time_in_seconds / 60;
  const typed_chars =
    words_tracker.correct_words + words_tracker.incorrect_words;
  const raw_wpm = typed_chars / 5 / minutes;

  const accuracy =
    typed_chars > 0 ? (words_tracker.correct_words / typed_chars) * 100 : 0;
  const net_wpm = raw_wpm * (accuracy / 100);

  return [Math.round(net_wpm), Math.round(accuracy)];
}

function handleKeyStroke(
  current_words,
  curr,
  keystroke,
  words_tracker,
  char_states
) {
  if (keystroke === "Enter") {
    // Find the next newline character
    while (curr < current_words.length && current_words[curr] !== "\n") {
      if (char_states[curr] !== "correct") {
        return [curr, false];
      }
      curr++;
    }
    if (curr < current_words.length && current_words[curr] === "\n") {
      words_tracker.correct_words += 1;
      char_states[curr] = "correct";
      return [curr + 1, true];
    }
    return [curr, false];
  }

  if (keystroke === "Backspace") {
    if (curr > 0) {
      const prev_state = char_states[curr - 1];
      if (prev_state === "correct") words_tracker.correct_words--;
      if (prev_state === "incorrect") words_tracker.incorrect_words--;
      char_states[curr - 1] = "pending";
      return [curr - 1, null];
    }
    return [curr, null];
  }

  if (curr >= current_words.length) return [curr, false];

  // Skip over indentation spaces
  if (
    (current_words[curr] === " " && curr === 0) ||
    current_words[curr - 1] === "\n"
  ) {
    while (curr < current_words.length && current_words[curr] === " ") {
      char_states[curr] = "correct";
      curr++;
    }
  }

  if (curr >= current_words.length) return [curr, false];

  const correct_key = current_words[curr] === keystroke;
  if (correct_key) {
    words_tracker.correct_words += 1;
    char_states[curr] = "correct";
  } else {
    words_tracker.incorrect_words += 1;
    char_states[curr] = "incorrect";
  }
  return [curr + 1, correct_key];
}

function span_it(str) {
  return str
    .split("\n")
    .map((line) => {
      // Count leading spaces for indentation
      const indentMatch = line.match(/^( *)/);
      const indentCount = indentMatch ? indentMatch[0].length : 0;
      const indentSpan = "&nbsp;".repeat(indentCount);

      const lineContent = `<span class="code-line">${indentSpan}${line
        .slice(indentCount)
        .split("")
        .map((char) => {
          if (char === " ") return '<span class="race-char">&nbsp;</span>';
          return `<span class="race-char">${char}</span>`;
        })
        .join("")}</span>`;

      // Add an invisible newline character
      return `${lineContent}<span class="race-char newline-char">\n</span>`;
    })
    .join("");
}

const Race = {
  race: "Loading...",
  random: Math.ceil(Math.random() * 10),
  curr: 0,
  words_tracker: { correct_words: 0, incorrect_words: 0 },
  char_states: [],
  start_time: null,
  elapsed_time: 0,
  is_finished: false,
  has_started: false,
  wpm: 0,
  accuracy: 0,
  timer_interval: null,
  time_limit: 30, // Default time limit (30 seconds)
  is_time_limit_set: true, // Automatically set to true for default time limit
  selected_time_limit: 30, // Default selected time limit

  oncreate: function (vnode) {
    document.body.style.backgroundColor = "#1e1e1e";
    document.body.style.color = "#d4d4d4";

    fetchRace(this.random).then((raceText) => {
      this.race = span_it(raceText);
      this.raceTextArray = raceText
        .split("\n")
        .map((line) => line.trimStart())
        .join("\n")
        .split("");
      this.char_states = new Array(this.raceTextArray.length).fill("pending");

      this.keyHandler = (event) => {
        if (event.key === " ") {
          event.preventDefault();
        }

        if (
          !this.has_started &&
          (event.key.length === 1 || event.key === "Enter")
        ) {
          // Remove the check for is_time_limit_set
          this.has_started = true;
          this.start_time = performance.now();

          this.timer_interval = setInterval(() => {
            if (!this.is_finished) {
              this.elapsed_time = (performance.now() - this.start_time) / 1000;

              // Stop the test if the time limit is reached
              if (this.elapsed_time >= this.time_limit) {
                this.is_finished = true;
                clearInterval(this.timer_interval);
                [this.wpm, this.accuracy] = getWpmAccuracy(
                  this.elapsed_time,
                  this.raceTextArray.length,
                  this.words_tracker
                );
                m.redraw();
              } else {
                [this.wpm, this.accuracy] = getWpmAccuracy(
                  this.elapsed_time,
                  this.raceTextArray.length,
                  this.words_tracker
                );
                m.redraw();
              }
            }
          }, 100);
        }

        if (
          !this.is_finished &&
          (event.key.length === 1 ||
            event.key === "Enter" ||
            event.key === "Backspace")
        ) {
          let [new_curr, correct_key] = handleKeyStroke(
            this.raceTextArray,
            this.curr,
            event.key,
            this.words_tracker,
            this.char_states
          );

          const raceElement = document.querySelector("p.race-text");
          const spans = raceElement.querySelectorAll(".race-char:not(.indent)");

          for (let i = 0; i < spans.length; i++) {
            if (i < new_curr) {
              spans[i].className = `race-char ${this.char_states[i]}`;
            } else if (i === new_curr) {
              spans[i].className = "race-char current";
            } else {
              spans[i].className = "race-char";
            }
          }

          this.curr = new_curr;

          if (this.curr >= this.raceTextArray.length) {
            this.is_finished = true;
            clearInterval(this.timer_interval);
            const final_time = Math.max(
              0.1,
              (performance.now() - this.start_time) / 1000
            );
            [this.wpm, this.accuracy] = getWpmAccuracy(
              final_time,
              this.raceTextArray.length,
              this.words_tracker
            );
          }

          m.redraw();
        }
      };

      window.addEventListener("keydown", this.keyHandler);
      m.redraw();
    });
  },

  onremove: function (vnode) {
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler);
    }
    if (this.timer_interval) {
      clearInterval(this.timer_interval);
    }
    document.body.style.backgroundColor = "";
    document.body.style.color = "";
  },

  view: function (vnode) {
    return m("div.race-container", [
      // Remove the time-limit-selector UI
      m("div.stats-bar", [
        m("div.stat", [
          m("div.stat-label", "wpm"),
          m("div.stat-value", this.wpm),
        ]),
        m("div.stat", [
          m("div.stat-label", "acc"),
          m("div.stat-value", `${this.accuracy}%`),
        ]),
        m("div.stat", [
          m("div.stat-label", "time"),
          m("div.stat-value", `${this.elapsed_time.toFixed(1)}s`),
        ]),
      ]),

      m("p.race-text", m.trust(this.race)),

      this.is_finished &&
        m("div.results", [
          m("div.result-card", [
            m("h2", "Test Complete"),
            m("div.result-stat", [
              m("span", "WPM: "),
              m("span.value", this.wpm),
            ]),
            m("div.result-stat", [
              m("span", "Accuracy: "),
              m("span.value", `${this.accuracy}%`),
            ]),
            m("div.result-stat", [
              m("span", "Time: "),
              m("span.value", `${this.elapsed_time.toFixed(1)}s`),
            ]),
          ]),
        ]),
    ]);
  },
};

const style = document.createElement("style");
style.textContent = `
  .time-limit-selector {
    text-align: center;
    margin-bottom: 20px;
  }

  .time-limit-selector h3 {
    margin-bottom: 10px;
    color: #d4d4d4;
  }

  .time-limit-selector button {
    background: #2d2d2d;
    color: #d4d4d4;
    border: none;
    padding: 10px 20px;
    margin: 5px;
    border-radius: 5px;
    cursor: pointer;
    font-family: "Fira Code", "Roboto Mono", monospace;
  }

  .time-limit-selector button:disabled {
    background: #646669;
    cursor: not-allowed;
  }

  .time-limit-selector button:hover:not(:disabled) {
    background: #3d3d3d;
  }

  .time-limit-selector button.selected {
    background: #7ec699; /* Green background for selected button */
    color: #1e1e1e; /* Dark text for better contrast */
  }

  .time-limit-selector button.selected:hover {
    background: #6bbd8a; /* Slightly darker green on hover */
  }

  .race-container {
    max-width: 1000px;
    margin: 60px auto;
    padding: 20px;
    font-family: "Fira Code", "Roboto Mono", monospace;
  }

  .stats-bar {
    display: flex;
    gap: 30px;
    margin-bottom: 40px;
    justify-content: center;
  }

  .stat {
    text-align: center;
  }

  .stat-label {
    color: #646669;
    font-size: 14px;
    margin-bottom: 5px;
  }

  .stat-value {
    font-size: 24px;
  }

  .race-text {
    font-size: 16px;
    line-height: 1.5;
    white-space: pre;
    overflow-x: auto;
    padding: 20px;
    background: #2d2d2d;
    border-radius: 8px;
    margin: 20px 0;
    font-family: "Fira Code", "Roboto Mono", monospace;
  }

  .indent {
    color: #333;
    user-select: none;
  }

  .code-line {
    display: block;
    height: 1.5em;
    line-height: 1.5em;
    position: relative;
  }

  .race-char {
    position: relative;
    font-family: inherit;
    color: #646669;
    transition: color 0.1s;
  }

  .race-char.current {
    color: #d1d0c5;
    border-left: 2px solid #d1d0c5;
    margin-left: -2px;
  }

  .race-char.correct {
    color: #7ec699;
  }

  .race-char.incorrect {
    color: #ff5370;
    text-decoration: underline;
  }

  .race-char.newline-char {
    position: relative;
    opacity: 0;
    height: 0;
  }

  .results {
    display: flex;
    justify-content: center;
    margin-top: 40px;
  }

  .result-card {
    background: #2c2e31;
    padding: 30px;
    border-radius: 10px;
    text-align: center;
  }

  .result-card h2 {
    margin: 0 0 20px 0;
    color: #d1d0c5;
  }

  .result-stat {
    margin: 10px 0;
    font-size: 18px;
  }

  .result-stat .value {
    color: #7ec699;
    font-weight: bold;
  }
`;

document.head.appendChild(style);

m.mount(root, Race);

export { Race };
