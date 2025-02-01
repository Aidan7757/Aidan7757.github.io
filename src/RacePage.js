import m from "mithril";

var root = document.body;

function fetchRace(random_number) {
  fetch("../data/races.json")
    .then((res) => res.json())
    .then((data) => {
      return data["sentences"].filter(function (x) {
        return x.id == random_number;
      });
    })
    .catch((error) => {
      console.log("Could not obtain race.");
    });
}

export var RaceWords = {
  view: function () {
    var random_number = {
      random: Math.ceil((Math.random() + 1) * 19),
    };

    var race = fetchRace(random_number);

    return m("p", race);
  },
};

m.mount(root, RaceWords);
