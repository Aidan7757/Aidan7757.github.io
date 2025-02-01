import "./App.css";
import { RaceWords } from "./index.js";

export const App = () => {
  // Local state ...
  return {
    view: () => {
      return m(RaceWords);
    },
  };
};
